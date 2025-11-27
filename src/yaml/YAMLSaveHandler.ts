import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as yaml from 'js-yaml';
import { validateYAMLSyntax } from './YAMLValidator';
import { KubectlError } from '../kubernetes/KubectlError';
import { ResourceIdentifier, YAMLEditorManager } from './YAMLEditorManager';
import { parseResourceFromUri } from './Kube9YAMLFileSystemProvider';
import { RefreshCoordinator } from './RefreshCoordinator';
import { showErrorWithDetails } from './ErrorHandler';
import { YAMLContentProvider } from './YAMLContentProvider';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 5000;

/**
 * Handles saving YAML changes to the Kubernetes cluster.
 * Validates YAML syntax, performs dry-run validation, and applies changes using kubectl.
 */
export class YAMLSaveHandler {
    /**
     * The YAML editor manager for checking read-only status.
     */
    private editorManager: YAMLEditorManager | null = null;
    
    /**
     * The refresh coordinator for triggering UI refreshes after successful saves.
     */
    private refreshCoordinator: RefreshCoordinator;
    
    /**
     * Creates a new YAMLSaveHandler instance.
     */
    constructor() {
        this.refreshCoordinator = new RefreshCoordinator();
    }
    
    /**
     * Sets the YAML editor manager for read-only checks.
     * 
     * @param manager - The YAML editor manager instance
     */
    public setEditorManager(manager: YAMLEditorManager): void {
        this.editorManager = manager;
    }
    /**
     * Removes read-only fields from YAML that shouldn't be sent to Kubernetes during apply.
     * These fields are managed by Kubernetes and including them causes conflicts.
     * 
     * @param yamlContent - The YAML content to clean
     * @returns Cleaned YAML content without read-only fields
     */
    private removeReadOnlyFields(yamlContent: string): string {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsed = yaml.load(yamlContent) as any;
            
            if (!parsed || !parsed.metadata) {
                return yamlContent; // Return as-is if we can't parse it
            }
            
            // Remove read-only metadata fields that cause conflicts
            const readOnlyFields = [
                'resourceVersion',
                'uid',
                'creationTimestamp',
                'generation',
                'selfLink',
                'managedFields'
            ];
            
            readOnlyFields.forEach(field => {
                if (parsed.metadata[field] !== undefined) {
                    delete parsed.metadata[field];
                }
            });
            
            // Remove the last-applied-configuration annotation
            // This annotation may contain stale resourceVersion and other read-only fields
            // kubectl will automatically recreate it with correct values on next apply
            if (parsed.metadata.annotations && parsed.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']) {
                delete parsed.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
                // If annotations object is now empty, remove it entirely
                if (Object.keys(parsed.metadata.annotations).length === 0) {
                    delete parsed.metadata.annotations;
                }
            }
            
            // Remove read-only status field (if present)
            if (parsed.status !== undefined) {
                delete parsed.status;
            }
            
            // Convert back to YAML
            return yaml.dump(parsed, {
                indent: 2,
                lineWidth: -1, // Don't wrap lines
                noRefs: true,  // Don't use YAML references
                sortKeys: false // Preserve key order
            });
        } catch (error) {
            // If parsing fails, return original content
            // Validation will catch any issues
            console.warn('Failed to remove read-only fields from YAML:', error);
            return yamlContent;
        }
    }
    
    /**
     * Handles saving a YAML document to the Kubernetes cluster.
     * 
     * This method performs the following steps:
     * 1. Validates YAML syntax
     * 2. Removes read-only fields (resourceVersion, uid, etc.)
     * 3. Performs dry-run validation with kubectl
     * 4. Applies changes to the cluster
     * 5. Shows appropriate notifications
     * 
     * @param document - The VS Code text document containing the YAML to save
     * @returns Promise resolving to true if save succeeded, false otherwise
     */
    public async handleSave(document: vscode.TextDocument): Promise<boolean> {
        try {
            // Extract YAML content from document
            let yamlContent = document.getText();
            
            // Parse resource identifier from document URI
            const resource = parseResourceFromUri(document.uri);
            
            // Remove read-only fields before applying
            // This prevents conflicts from stale resourceVersion, uid, etc.
            const originalLength = yamlContent.length;
            yamlContent = this.removeReadOnlyFields(yamlContent);
            const cleanedLength = yamlContent.length;
            console.log(`[YAML Save] Removed read-only fields from ${resource.kind}/${resource.name} (${originalLength} -> ${cleanedLength} bytes)`);
            
            // Verify resourceVersion was removed (debug)
            if (yamlContent.includes('resourceVersion:')) {
                console.warn(`[YAML Save] WARNING: resourceVersion still present in cleaned YAML for ${resource.kind}/${resource.name}`);
            } else {
                console.log(`[YAML Save] Verified: resourceVersion removed from ${resource.kind}/${resource.name}`);
            }
            
            // Step 0: Check if editor is read-only
            if (this.editorManager && this.editorManager.isEditorReadOnly(resource)) {
                const errorMessage = `Cannot save: Resource is read-only due to insufficient permissions`;
                vscode.window.showErrorMessage(errorMessage);
                console.error(`Save blocked for ${resource.kind}/${resource.name}: read-only mode`);
                return false;
            }
            
            // Step 1: Pause conflict checking during save to prevent false positives
            if (this.editorManager) {
                this.editorManager.pauseConflictChecking(resource);
            }
            
            try {
                // Step 2: Validate YAML syntax
                const validationResult = validateYAMLSyntax(yamlContent);
                if (!validationResult.valid) {
                    const lineInfo = validationResult.line !== undefined 
                        ? ` at line ${validationResult.line + 1}${validationResult.column !== undefined ? `, column ${validationResult.column + 1}` : ''}`
                        : '';
                    const errorMessage = `Invalid YAML syntax${lineInfo}: ${validationResult.error}`;
                    vscode.window.showErrorMessage(errorMessage);
                    console.error(`YAML syntax validation failed: ${errorMessage}`);
                    return false;
                }
                
                // Step 3: Perform dry-run validation
                console.log(`Performing dry-run validation for ${resource.kind}/${resource.name}...`);
                const dryRunSuccess = await this.performDryRun(yamlContent, resource);
                if (!dryRunSuccess) {
                    // Error message already shown in performDryRun
                    return false;
                }
                
                // Step 4: Apply changes to cluster
                console.log(`Applying changes to ${resource.kind}/${resource.name}...`);
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Applying changes...',
                        cancellable: false
                    },
                    async () => {
                        await this.applyChanges(yamlContent, resource);
                    }
                );
                
                // Step 5: Update resource version in ConflictDetector after successful save
                // This prevents false conflict detection on subsequent saves
                if (this.editorManager) {
                    try {
                        // Fetch the updated resource to get the new resourceVersion
                        const contentProvider = new YAMLContentProvider();
                        const updatedYAML = await contentProvider.fetchYAML(resource);
                        
                        // Extract resourceVersion from updated YAML
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const parsed = yaml.load(updatedYAML) as any;
                        const newResourceVersion = parsed?.metadata?.resourceVersion;
                        
                        if (newResourceVersion) {
                            await this.editorManager.updateResourceVersionAfterSave(
                                resource, 
                                String(newResourceVersion),
                                updatedYAML
                            );
                            console.log(`Updated resource version for ${resource.kind}/${resource.name} to ${newResourceVersion}`);
                        } else {
                            console.warn(`Could not extract resourceVersion from updated resource for ${resource.kind}/${resource.name}`);
                        }
                    } catch (error) {
                        // Log error but don't fail the save operation
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.warn(`Failed to update resource version after save: ${errorMessage}`);
                    }
                }
            } finally {
                // Always resume conflict checking after save completes (success or failure)
                if (this.editorManager) {
                    this.editorManager.resumeConflictChecking(resource);
                }
            }
            
            // Step 5: Coordinate UI refresh after successful save
            // Wrap in try-catch to ensure refresh errors don't affect save status
            try {
                await this.refreshCoordinator.coordinateRefresh(resource);
            } catch (refreshError) {
                // Log refresh error but don't fail the save operation
                const refreshErrorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
                console.error(`Refresh coordination failed: ${refreshErrorMessage}`);
                // Note: coordinateRefresh already shows success notification, so we don't need to show it again
            }
            
            console.log(`Successfully saved ${resource.kind}/${resource.name}`);
            return true;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to save YAML: ${errorMessage}`);
            console.error(`Failed to save YAML:`, errorMessage);
            return false;
        }
    }
    
    /**
     * Performs a dry-run validation of the YAML using kubectl.
     * 
     * @param yamlContent - The YAML content to validate
     * @param resource - The resource identifier
     * @returns Promise resolving to true if dry-run succeeded, false otherwise
     */
    private async performDryRun(yamlContent: string, resource: ResourceIdentifier): Promise<boolean> {
        try {
            // Build kubectl command arguments for dry-run
            const args = ['apply', '--dry-run=server', '-f', '-'];
            
            // Add context flag
            args.push(`--context=${resource.cluster}`);
            
            // Add namespace flag for namespaced resources
            if (resource.namespace) {
                args.push('--namespace', resource.namespace);
            }
            
            // Execute kubectl apply with dry-run, piping YAML to stdin
            await this.executeKubectl(args, yamlContent);
            
            console.log(`Dry-run validation succeeded for ${resource.kind}/${resource.name}`);
            return true;
            
        } catch (error: unknown) {
            // kubectl dry-run failed - create structured error
            const kubectlError = KubectlError.fromExecError(error, resource.cluster);
            
            // Log detailed error for debugging
            console.error(`Dry-run validation failed for ${resource.kind}/${resource.name}: ${kubectlError.getDetails()}`);
            
            // Show enhanced error message with retry option
            await showErrorWithDetails(
                kubectlError,
                `Validation failed for ${resource.kind} '${resource.name}'`,
                async () => {
                    // Retry by calling performDryRun again
                    await this.performDryRun(yamlContent, resource);
                }
            );
            
            return false;
        }
    }
    
    /**
     * Applies the YAML changes to the Kubernetes cluster.
     * 
     * @param yamlContent - The YAML content to apply
     * @param resource - The resource identifier
     * @returns Promise that resolves when changes are applied
     * @throws Error if kubectl apply fails
     */
    private async applyChanges(yamlContent: string, resource: ResourceIdentifier): Promise<void> {
        try {
            // Build kubectl command arguments for apply
            const args = ['apply', '-f', '-'];
            
            // Add context flag
            args.push(`--context=${resource.cluster}`);
            
            // Add namespace flag for namespaced resources
            if (resource.namespace) {
                args.push('--namespace', resource.namespace);
            }
            
            // Execute kubectl apply, piping YAML to stdin
            const result = await this.executeKubectl(args, yamlContent);
            
            console.log(`kubectl apply output: ${result.stdout}`);
            
        } catch (error: unknown) {
            // kubectl apply failed - create structured error
            const kubectlError = KubectlError.fromExecError(error, resource.cluster);
            
            // Log detailed error for debugging
            console.error(`Apply failed for ${resource.kind}/${resource.name}: ${kubectlError.getDetails()}`);
            
            // Show enhanced error message with retry option
            await showErrorWithDetails(
                kubectlError,
                `Failed to apply changes to ${resource.kind} '${resource.name}'`,
                async () => {
                    // Retry by calling applyChanges again
                    await this.applyChanges(yamlContent, resource);
                }
            );
            
            // Throw error with user-friendly message for caller
            throw new Error(`Failed to apply changes: ${kubectlError.getUserMessage()}`);
        }
    }
    
    /**
     * Executes a kubectl command with YAML content piped to stdin.
     * 
     * @param args - The kubectl command arguments
     * @param input - The content to pipe to stdin
     * @returns Promise resolving to stdout and stderr
     * @throws Error if kubectl command fails
     */
    private async executeKubectl(args: string[], input: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            // Create kubectl process with stdin pipe
            const kubectl = spawn('kubectl', args, {
                env: { ...process.env },
                timeout: KUBECTL_TIMEOUT_MS
            });
            
            let stdout = '';
            let stderr = '';
            
            // Collect stdout
            kubectl.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });
            
            // Collect stderr
            kubectl.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });
            
            // Handle process exit
            kubectl.on('close', (code: number | null) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    // Create error object compatible with KubectlError.fromExecError
                    const error = new Error(`kubectl exited with code ${code}`) as Error & {
                        code?: number | string;
                        stdout?: string;
                        stderr?: string;
                    };
                    error.code = code || undefined;
                    error.stdout = stdout;
                    error.stderr = stderr;
                    reject(error);
                }
            });
            
            // Handle process errors (e.g., kubectl not found)
            kubectl.on('error', (error: Error) => {
                // Enhance error object with expected properties for KubectlError.fromExecError
                const enhancedError = error as Error & {
                    code?: string | number;
                    stderr?: string;
                    stdout?: string;
                };
                
                // If error code is ENOENT, kubectl is not found
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    enhancedError.code = 'ENOENT';
                }
                
                enhancedError.stderr = enhancedError.stderr || error.message;
                reject(enhancedError);
            });
            
            // Write YAML content to stdin and close
            kubectl.stdin.write(input);
            kubectl.stdin.end();
        });
    }
}

