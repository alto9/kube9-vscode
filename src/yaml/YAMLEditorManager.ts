import * as vscode from 'vscode';
import { YAMLContentProvider } from './YAMLContentProvider';
import { createResourceUri } from './Kube9YAMLFileSystemProvider';
import { PermissionChecker, PermissionLevel } from './PermissionChecker';
import { ConflictDetector } from './ConflictDetector';

/**
 * Identifies a Kubernetes resource for YAML editing operations.
 * Used to uniquely identify resources across clusters and namespaces.
 */
export interface ResourceIdentifier {
    /** The Kubernetes resource kind (e.g., "Deployment", "StatefulSet", "Pod") */
    kind: string;
    /** The name of the resource */
    name: string;
    /** The namespace containing the resource (undefined for cluster-scoped resources) */
    namespace?: string;
    /** The API version of the resource (e.g., "apps/v1") */
    apiVersion: string;
    /** The cluster context name from kubeconfig */
    cluster: string;
}

/**
 * Manages YAML editor instances for Kubernetes resources.
 * Coordinates opening, tracking, and managing YAML editors for resources
 * accessed from tree view, webviews, and VS Code's text editor system.
 */
export class YAMLEditorManager {
    /**
     * Map tracking open YAML editors by resource key.
     * Key format: `${cluster}:${namespace || '_cluster'}:${kind}:${name}`
     */
    private openEditors: Map<string, vscode.TextEditor> = new Map();

    /**
     * Map tracking read-only status of open editors by resource key.
     * Key format: `${cluster}:${namespace || '_cluster'}:${kind}:${name}`
     */
    private readOnlyEditors: Map<string, boolean> = new Map();

    /**
     * The VS Code extension context.
     * Used for registering disposables and managing lifecycle.
     */
    private context: vscode.ExtensionContext;

    /**
     * Content provider for fetching YAML from Kubernetes cluster.
     * Used to retrieve resource YAML when opening editors.
     */
    private contentProvider: YAMLContentProvider;

    /**
     * Permission checker for verifying resource access levels.
     * Used to determine if resources should be opened as read-only.
     */
    private permissionChecker: PermissionChecker;

    /**
     * Conflict detector for monitoring external changes to resources.
     * Used to detect when resources are modified outside the editor.
     */
    private conflictDetector: ConflictDetector;

    /**
     * Creates a new YAMLEditorManager instance.
     * 
     * @param context - The VS Code extension context
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.contentProvider = new YAMLContentProvider();
        this.permissionChecker = new PermissionChecker();
        this.conflictDetector = new ConflictDetector();
        
        // Track editor lifecycle - remove from map when documents close
        const closeDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
            // Check if this is a kube9-yaml document
            if (document.uri.scheme === 'kube9-yaml') {
                // Find and remove this editor from our tracking map
                for (const [key, editor] of this.openEditors.entries()) {
                    if (editor.document.uri.toString() === document.uri.toString()) {
                        this.openEditors.delete(key);
                        this.readOnlyEditors.delete(key);
                        
                        // Stop conflict monitoring for this resource
                        this.conflictDetector.stopMonitoring(key);
                        
                        console.log(`YAML editor closed: ${key}`);
                        break;
                    }
                }
            }
        });
        
        context.subscriptions.push(closeDisposable);
    }

    /**
     * Opens a YAML editor for the specified Kubernetes resource.
     * Creates a new editor tab with YAML content fetched from the cluster.
     * If an editor for this resource is already open, focuses that editor instead.
     * 
     * @param resource - The resource identifier for the resource to open
     * @returns Promise that resolves when the editor is opened
     * @throws Error if opening the editor fails
     */
    public async openYAMLEditor(resource: ResourceIdentifier): Promise<void> {
        const resourceKey = this.getResourceKey(resource);
        
        // Check if editor is already open
        const existingEditor = this.openEditors.get(resourceKey);
        if (existingEditor) {
            // Reveal existing editor
            await vscode.window.showTextDocument(existingEditor.document, {
                preview: false,
                preserveFocus: false
            });
            console.log(`YAML editor already open: ${resourceKey}`);
            return;
        }

        try {
            // Check permissions before opening editor
            console.log(`Checking permissions for ${resource.kind}/${resource.name}`);
            const permissionLevel = await this.permissionChecker.checkResourcePermissions(resource);
            
            // Handle different permission levels
            if (permissionLevel === PermissionLevel.none) {
                // User has no access to this resource at all
                throw new Error(`Insufficient permissions to view ${resource.kind} '${resource.name}'.`);
            }
            
            // Create custom URI using the kube9-yaml:// scheme
            const uri = createResourceUri(resource);
            console.log(`Opening YAML editor with URI: ${uri.toString()}`);
            
            // Open text document - VS Code FileSystemProvider will fetch content
            const document = await vscode.workspace.openTextDocument(uri);
            
            // Show document in editor (permanent tab, not preview)
            const editor = await vscode.window.showTextDocument(document, {
                preview: false,
                preserveFocus: false
            });
            
            // Track editor in our map
            this.openEditors.set(resourceKey, editor);
            
            // Track read-only status and show notification if read-only
            if (permissionLevel === PermissionLevel.readOnly || permissionLevel === PermissionLevel.unknown) {
                this.readOnlyEditors.set(resourceKey, true);
                vscode.window.showWarningMessage(
                    `Read-only: Insufficient permissions to edit ${resource.kind} '${resource.name}'`
                );
                console.log(`YAML editor opened in read-only mode: ${resourceKey}`);
            } else {
                this.readOnlyEditors.set(resourceKey, false);
                console.log(`YAML editor opened successfully: ${resourceKey}`);
                
                // Start conflict monitoring for writable editors only
                this.conflictDetector.startMonitoring(resource, document, resourceKey);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to open YAML editor for ${resourceKey}:`, errorMessage);
            
            // Provide user-friendly error messages based on error type
            if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
                throw new Error(`Resource not found: ${resource.kind} '${resource.name}' does not exist in the cluster.`);
            } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') || errorMessage.includes('permission')) {
                throw new Error(`Insufficient permissions to view ${resource.kind} '${resource.name}'.`);
            } else if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
                throw new Error(`Unable to connect to cluster '${resource.cluster}'. Please check your connection.`);
            } else {
                throw new Error(`Failed to open YAML editor for ${resource.kind} '${resource.name}': ${errorMessage}`);
            }
        }
    }

    /**
     * Generates a unique resource key for tracking editors.
     * The key format ensures unique identification even for resources
     * with the same name in different clusters or namespaces.
     * 
     * @param resource - The resource identifier
     * @returns A unique string key for the resource
     */
    public getResourceKey(resource: ResourceIdentifier): string {
        const namespace = resource.namespace || '_cluster';
        return `${resource.cluster}:${namespace}:${resource.kind}:${resource.name}`;
    }

    /**
     * Checks if a YAML editor is currently open for the specified resource.
     * 
     * @param resource - The resource identifier to check
     * @returns True if an editor is open for this resource, false otherwise
     */
    public isEditorOpen(resource: ResourceIdentifier): boolean {
        const resourceKey = this.getResourceKey(resource);
        return this.openEditors.has(resourceKey);
    }

    /**
     * Checks if a YAML editor is in read-only mode for the specified resource.
     * 
     * @param resource - The resource identifier to check
     * @returns True if the editor is read-only, false otherwise (or if no editor is open)
     */
    public isEditorReadOnly(resource: ResourceIdentifier): boolean {
        const resourceKey = this.getResourceKey(resource);
        return this.readOnlyEditors.get(resourceKey) === true;
    }

    /**
     * Closes the YAML editor for the specified resource if it's open.
     * 
     * @param resource - The resource identifier for the editor to close
     * @returns Promise that resolves when the editor is closed
     */
    public async closeEditor(resource: ResourceIdentifier): Promise<void> {
        const resourceKey = this.getResourceKey(resource);
        const editor = this.openEditors.get(resourceKey);
        
        if (!editor) {
            console.log(`No editor open for resource: ${resourceKey}`);
            return;
        }
        
        try {
            // Focus the editor first
            await vscode.window.showTextDocument(editor.document, {
                preview: false,
                preserveFocus: false
            });
            
            // Execute close command
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            
            // Remove from tracking map
            this.openEditors.delete(resourceKey);
            console.log(`YAML editor closed: ${resourceKey}`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to close YAML editor for ${resourceKey}:`, errorMessage);
            throw new Error(`Failed to close editor: ${errorMessage}`);
        }
    }

    /**
     * Pauses conflict checking for a resource during save operations.
     * 
     * @param resource - The resource identifier
     */
    public pauseConflictChecking(resource: ResourceIdentifier): void {
        const resourceKey = this.getResourceKey(resource);
        this.conflictDetector.pauseConflictChecking(resourceKey);
    }
    
    /**
     * Resumes conflict checking for a resource after save operations.
     * 
     * @param resource - The resource identifier
     */
    public resumeConflictChecking(resource: ResourceIdentifier): void {
        const resourceKey = this.getResourceKey(resource);
        this.conflictDetector.resumeConflictChecking(resourceKey);
    }
    
    /**
     * Updates the resource version for a resource after a successful save.
     * This prevents false conflict detection after the user saves their changes.
     * 
     * @param resource - The resource identifier
     * @param newResourceVersion - The new resource version from the cluster
     * @param newContent - The new content from the cluster (optional)
     */
    public async updateResourceVersionAfterSave(resource: ResourceIdentifier, newResourceVersion: string, newContent?: string): Promise<void> {
        const resourceKey = this.getResourceKey(resource);
        this.conflictDetector.updateResourceVersion(resourceKey, newResourceVersion, newContent);
    }
    
    /**
     * Disposes of the manager and cleans up all tracked editors.
     * Should be called during extension deactivation.
     */
    public dispose(): void {
        // Dispose conflict detector
        this.conflictDetector.dispose();
        
        // Clear the editors maps
        this.openEditors.clear();
        this.readOnlyEditors.clear();
    }
}

