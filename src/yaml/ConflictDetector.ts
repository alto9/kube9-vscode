import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { ResourceIdentifier } from './YAMLEditorManager';
import { YAMLContentProvider } from './YAMLContentProvider';

/**
 * Timeout for conflict checks in milliseconds (30 seconds).
 */
const CONFLICT_CHECK_INTERVAL_MS = 30000;

/**
 * Represents the cached state of a resource being monitored for conflicts.
 */
interface ResourceState {
    /** The resource version from Kubernetes metadata */
    resourceVersion: string;
    /** When this state was last checked */
    lastChecked: Date;
    /** The local content being edited */
    content: string;
    /** The interval ID for periodic checking */
    intervalId: NodeJS.Timeout | null;
    /** Whether conflict checking is disabled for this resource */
    conflictCheckingDisabled: boolean;
}

/**
 * Result of a conflict check operation.
 */
interface ConflictStatus {
    /** Whether a conflict was detected */
    hasConflict: boolean;
    /** The local content (if conflict detected) */
    localContent?: string;
    /** The remote content from cluster (if conflict detected) */
    remoteContent?: string;
    /** The remote resource version (if conflict detected) */
    remoteVersion?: string;
}

/**
 * Detects when Kubernetes resources have been modified externally while being edited.
 * Monitors resourceVersion changes and alerts users to conflicts with options to resolve them.
 */
export class ConflictDetector {
    /**
     * Map tracking resource states by resource key.
     * Key format: `${cluster}:${namespace || '_cluster'}:${kind}:${name}`
     */
    private resourceStates: Map<string, ResourceState> = new Map();
    
    /**
     * Content provider for fetching current YAML from cluster.
     */
    private contentProvider: YAMLContentProvider;
    
    /**
     * Creates a new ConflictDetector instance.
     */
    constructor() {
        this.contentProvider = new YAMLContentProvider();
    }
    
    /**
     * Starts monitoring a resource for external changes.
     * Sets up periodic checking to detect conflicts.
     * 
     * @param resource - The resource identifier for the resource to monitor
     * @param document - The VS Code text document being edited
     * @param resourceKey - The unique key for this resource
     */
    public startMonitoring(
        resource: ResourceIdentifier,
        document: vscode.TextDocument,
        resourceKey: string
    ): void {
        // Extract initial resource version from the document
        const initialVersion = this.extractResourceVersion(document.getText());
        
        if (!initialVersion) {
            console.warn(`Could not extract resourceVersion for ${resourceKey}, conflict detection disabled`);
            return;
        }
        
        console.log(`Starting conflict monitoring for ${resourceKey} (version: ${initialVersion})`);
        
        // Set up periodic conflict checking
        const intervalId = setInterval(async () => {
            await this.performConflictCheck(resource, document, resourceKey);
        }, CONFLICT_CHECK_INTERVAL_MS);
        
        // Store initial state
        this.resourceStates.set(resourceKey, {
            resourceVersion: initialVersion,
            lastChecked: new Date(),
            content: document.getText(),
            intervalId,
            conflictCheckingDisabled: false
        });
    }
    
    /**
     * Stops monitoring a resource for conflicts.
     * Cleans up periodic checking interval.
     * 
     * @param resourceKey - The unique key for the resource to stop monitoring
     */
    public stopMonitoring(resourceKey: string): void {
        const state = this.resourceStates.get(resourceKey);
        
        if (state && state.intervalId) {
            clearInterval(state.intervalId);
            console.log(`Stopped conflict monitoring for ${resourceKey}`);
        }
        
        this.resourceStates.delete(resourceKey);
    }
    
    /**
     * Performs a single conflict check for a resource.
     * Only checks if the editor is focused and has unsaved changes.
     * 
     * @param resource - The resource identifier
     * @param document - The VS Code text document
     * @param resourceKey - The unique key for this resource
     */
    private async performConflictCheck(
        resource: ResourceIdentifier,
        document: vscode.TextDocument,
        resourceKey: string
    ): Promise<void> {
        const state = this.resourceStates.get(resourceKey);
        
        // Skip if monitoring was stopped or disabled
        if (!state || state.conflictCheckingDisabled) {
            return;
        }
        
        // Only check if editor is focused and has unsaved changes
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.toString() !== document.uri.toString()) {
            // Editor not focused, skip check
            return;
        }
        
        if (!document.isDirty) {
            // No unsaved changes, skip check
            return;
        }
        
        try {
            // Check for conflicts
            const conflictStatus = await this.checkForConflicts(
                resource,
                document.getText(),
                resourceKey
            );
            
            if (conflictStatus.hasConflict) {
                // Conflict detected, show notification with resolution options
                await this.handleConflict(
                    resource,
                    document,
                    resourceKey,
                    conflictStatus
                );
            }
        } catch (error) {
            // Log error but don't stop monitoring
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Conflict check failed for ${resourceKey}: ${errorMessage}`);
        }
    }
    
    /**
     * Checks if the resource has been modified externally since last check.
     * 
     * @param resource - The resource identifier
     * @param currentContent - The current local content being edited
     * @param resourceKey - The unique key for this resource
     * @returns Promise resolving to conflict status
     */
    private async checkForConflicts(
        resource: ResourceIdentifier,
        currentContent: string,
        resourceKey: string
    ): Promise<ConflictStatus> {
        const state = this.resourceStates.get(resourceKey);
        
        if (!state) {
            return { hasConflict: false };
        }
        
        try {
            // Fetch current YAML from cluster
            const clusterYAML = await this.contentProvider.fetchYAML(resource);
            const clusterVersion = this.extractResourceVersion(clusterYAML);
            
            if (!clusterVersion) {
                console.warn(`Could not extract resourceVersion from cluster YAML for ${resourceKey}`);
                return { hasConflict: false };
            }
            
            // Update last checked time
            state.lastChecked = new Date();
            
            // Compare versions
            if (clusterVersion !== state.resourceVersion) {
                console.log(`Conflict detected for ${resourceKey}: local=${state.resourceVersion}, remote=${clusterVersion}`);
                
                return {
                    hasConflict: true,
                    localContent: currentContent,
                    remoteContent: clusterYAML,
                    remoteVersion: clusterVersion
                };
            }
            
            return { hasConflict: false };
            
        } catch (error) {
            // If resource was deleted or connection failed, log but don't report as conflict
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to fetch resource for conflict check: ${errorMessage}`);
            return { hasConflict: false };
        }
    }
    
    /**
     * Handles a detected conflict by showing a notification with resolution options.
     * 
     * @param resource - The resource identifier
     * @param document - The VS Code text document
     * @param resourceKey - The unique key for this resource
     * @param conflictStatus - The detected conflict status
     */
    private async handleConflict(
        resource: ResourceIdentifier,
        document: vscode.TextDocument,
        resourceKey: string,
        conflictStatus: ConflictStatus
    ): Promise<void> {
        const resourceDescription = resource.namespace
            ? `${resource.kind} '${resource.name}' in namespace '${resource.namespace}'`
            : `${resource.kind} '${resource.name}'`;
        
        // Show notification with three options
        const choice = await vscode.window.showWarningMessage(
            `${resourceDescription} has been modified externally. What would you like to do?`,
            'Reload',
            'Compare',
            'Keep Local'
        );
        
        if (!choice) {
            // User dismissed notification, do nothing
            return;
        }
        
        switch (choice) {
            case 'Reload':
                await this.handleReload(resource, document, resourceKey, conflictStatus);
                break;
            case 'Compare':
                await this.handleCompare(resource, document, conflictStatus);
                break;
            case 'Keep Local':
                await this.handleKeepLocal(resourceKey);
                break;
        }
    }
    
    /**
     * Handles the "Reload" option by fetching latest YAML and replacing editor content.
     * 
     * @param resource - The resource identifier
     * @param document - The VS Code text document
     * @param resourceKey - The unique key for this resource
     * @param conflictStatus - The detected conflict status
     */
    private async handleReload(
        resource: ResourceIdentifier,
        document: vscode.TextDocument,
        resourceKey: string,
        conflictStatus: ConflictStatus
    ): Promise<void> {
        try {
            console.log(`Reloading latest YAML for ${resourceKey}`);
            
            // Get the active editor for this document
            const editor = vscode.window.visibleTextEditors.find(
                e => e.document.uri.toString() === document.uri.toString()
            );
            
            if (!editor) {
                vscode.window.showErrorMessage('Could not find editor to reload');
                return;
            }
            
            // Replace entire document content with remote content
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            edit.replace(document.uri, fullRange, conflictStatus.remoteContent || '');
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                // Update tracked resource version
                const state = this.resourceStates.get(resourceKey);
                if (state && conflictStatus.remoteVersion) {
                    state.resourceVersion = conflictStatus.remoteVersion;
                    state.content = conflictStatus.remoteContent || '';
                }
                
                // Save the document to clear dirty flag
                await document.save();
                
                vscode.window.showInformationMessage('Editor reloaded with latest version from cluster');
                console.log(`Successfully reloaded ${resourceKey}`);
            } else {
                vscode.window.showErrorMessage('Failed to reload editor content');
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to reload editor: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to reload: ${errorMessage}`);
        }
    }
    
    /**
     * Handles the "Compare" option by opening a diff view.
     * 
     * @param resource - The resource identifier
     * @param document - The VS Code text document
     * @param conflictStatus - The detected conflict status
     */
    private async handleCompare(
        resource: ResourceIdentifier,
        document: vscode.TextDocument,
        conflictStatus: ConflictStatus
    ): Promise<void> {
        try {
            console.log(`Opening diff view for ${resource.kind}/${resource.name}`);
            
            // Create temporary URIs for diff view
            const localUri = document.uri;
            
            // Create a temporary document for the remote content
            const remoteUri = vscode.Uri.parse(
                `untitled:${resource.name}-remote.yaml`
            );
            
            // Open the remote content in a new document
            await vscode.workspace.openTextDocument(remoteUri);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(remoteUri, new vscode.Position(0, 0), conflictStatus.remoteContent || '');
            await vscode.workspace.applyEdit(edit);
            
            // Open diff view
            await vscode.commands.executeCommand(
                'vscode.diff',
                remoteUri,
                localUri,
                `${resource.name}.yaml ↔ Cluster (Remote)`,
                { preview: false }
            );
            
            console.log('Diff view opened successfully');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to open diff view: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to open compare view: ${errorMessage}`);
        }
    }
    
    /**
     * Handles the "Keep Local" option by disabling further conflict checks.
     * 
     * @param resourceKey - The unique key for this resource
     */
    private async handleKeepLocal(resourceKey: string): Promise<void> {
        const state = this.resourceStates.get(resourceKey);
        
        if (state) {
            state.conflictCheckingDisabled = true;
            console.log(`Conflict checking disabled for ${resourceKey}`);
            vscode.window.showInformationMessage('Conflict checking disabled for this edit session');
        }
    }
    
    /**
     * Extracts the resourceVersion from YAML content.
     * 
     * @param yamlContent - The YAML content to parse
     * @returns The resource version string, or null if not found or invalid YAML
     */
    private extractResourceVersion(yamlContent: string): string | null {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsed = yaml.load(yamlContent) as any;
            
            if (parsed && parsed.metadata && parsed.metadata.resourceVersion) {
                return String(parsed.metadata.resourceVersion);
            }
            
            return null;
            
        } catch (error) {
            // YAML parsing failed, return null
            console.warn('Failed to parse YAML for resourceVersion extraction');
            return null;
        }
    }
    
    /**
     * Temporarily disables conflict checking for a resource during save operations.
     * This prevents false conflict detection while saving.
     * 
     * @param resourceKey - The unique key for this resource
     */
    public pauseConflictChecking(resourceKey: string): void {
        const state = this.resourceStates.get(resourceKey);
        if (state) {
            state.conflictCheckingDisabled = true;
            console.log(`Conflict checking paused for ${resourceKey} during save`);
        }
    }
    
    /**
     * Resumes conflict checking for a resource after save operations.
     * 
     * @param resourceKey - The unique key for this resource
     */
    public resumeConflictChecking(resourceKey: string): void {
        const state = this.resourceStates.get(resourceKey);
        if (state) {
            state.conflictCheckingDisabled = false;
            console.log(`Conflict checking resumed for ${resourceKey} after save`);
        }
    }
    
    /**
     * Updates the resource version for a resource after a successful save.
     * This prevents false conflict detection after the user saves their changes.
     * 
     * @param resourceKey - The unique key for this resource
     * @param newResourceVersion - The new resource version from the cluster
     * @param newContent - The new content from the cluster (optional)
     */
    public updateResourceVersion(resourceKey: string, newResourceVersion: string, newContent?: string): void {
        const state = this.resourceStates.get(resourceKey);
        
        if (state) {
            console.log(`Updating resource version for ${resourceKey}: ${state.resourceVersion} -> ${newResourceVersion}`);
            state.resourceVersion = newResourceVersion;
            state.lastChecked = new Date();
            if (newContent !== undefined) {
                state.content = newContent;
            }
        } else {
            console.warn(`Cannot update resource version for ${resourceKey}: resource not being monitored`);
        }
    }
    
    /**
     * Disposes of all monitoring intervals.
     * Should be called when the extension deactivates.
     */
    public dispose(): void {
        for (const [, state] of this.resourceStates.entries()) {
            if (state.intervalId) {
                clearInterval(state.intervalId);
            }
        }
        this.resourceStates.clear();
        console.log('ConflictDetector disposed');
    }
}

