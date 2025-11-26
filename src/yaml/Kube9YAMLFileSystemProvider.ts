import * as vscode from 'vscode';
import { ResourceIdentifier, YAMLEditorManager } from './YAMLEditorManager';
import { YAMLContentProvider } from './YAMLContentProvider';
import { YAMLSaveHandler } from './YAMLSaveHandler';

/**
 * Custom FileSystemProvider for kube9-yaml:// URI scheme.
 * Enables VS Code integration for YAML editor documents with proper save functionality.
 * 
 * URI Format: kube9-yaml://<cluster>/<namespace>/<kind>/<name>.yaml?<apiVersion>
 * - Cluster name is used as the URI authority (properly handles special characters like ARNs)
 * - For cluster-scoped resources (no namespace), use '_cluster' as the namespace segment
 * - API version is passed as a query parameter
 */
export class Kube9YAMLFileSystemProvider implements vscode.FileSystemProvider {
    private contentProvider: YAMLContentProvider;
    private saveHandler: YAMLSaveHandler;
    
    /**
     * Event emitter for file system changes.
     * Used to notify VS Code when files change.
     */
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    /**
     * Creates a new Kube9YAMLFileSystemProvider instance.
     */
    constructor() {
        this.contentProvider = new YAMLContentProvider();
        this.saveHandler = new YAMLSaveHandler();
    }

    /**
     * Sets the YAML editor manager for read-only checks during save operations.
     * This must be called after the YAMLEditorManager is initialized.
     * 
     * @param manager - The YAML editor manager instance
     */
    public setEditorManager(manager: YAMLEditorManager): void {
        this.saveHandler.setEditorManager(manager);
    }

    /**
     * Watch for file changes.
     * Minimal implementation - returns empty disposable.
     * 
     * @param _uri - The URI to watch (unused in minimal implementation)
     * @returns A disposable to stop watching
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    watch(_uri: vscode.Uri): vscode.Disposable {
        // Minimal implementation - no active watching needed for now
        return new vscode.Disposable(() => {});
    }

    /**
     * Get file metadata (stats).
     * 
     * @param uri - The URI to get stats for
     * @returns File stats including type, size, and timestamps
     */
    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        try {
            // Parse resource from URI to validate it exists
            const resource = parseResourceFromUri(uri);
            
            // Fetch YAML to determine size and validate existence
            const yamlContent = await this.contentProvider.fetchYAML(resource);
            
            // Return basic file stats
            return {
                type: vscode.FileType.File,
                ctime: Date.now(),
                mtime: Date.now(),
                size: Buffer.byteLength(yamlContent, 'utf-8')
            };
        } catch (error) {
            // File doesn't exist or can't be accessed
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }

    /**
     * Read file content from Kubernetes cluster.
     * Fetches YAML using YAMLContentProvider.
     * 
     * @param uri - The URI to read
     * @returns File content as Uint8Array
     */
    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        try {
            // Parse resource identifier from URI
            const resource = parseResourceFromUri(uri);
            
            // Fetch YAML content from cluster
            const yamlContent = await this.contentProvider.fetchYAML(resource);
            
            // Convert string to Uint8Array
            return Buffer.from(yamlContent, 'utf-8');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to read file from URI ${uri.toString()}: ${errorMessage}`);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }

    /**
     * Write file content to Kubernetes cluster.
     * Validates YAML, performs dry-run, and applies changes using kubectl.
     * 
     * This method is called by VS Code when:
     * - User presses Ctrl+S / Cmd+S to save
     * - User chooses "Save" when closing a dirty editor
     * - Any programmatic save operation occurs
     * 
     * VS Code automatically handles:
     * - Dirty indicator (dot on tab) when document is modified
     * - "Save / Don't Save / Cancel" prompt when closing unsaved editors
     * - Keeping editor open if this method throws an error
     * 
     * @param uri - The URI to write to
     * @param content - The content to write
     * @param options - Write options
     * @throws FileSystemError.Unavailable if save fails (keeps editor open)
     */
    async writeFile(
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean; overwrite: boolean }
    ): Promise<void> {
        try {
            // Parse resource to validate URI format
            const resource = parseResourceFromUri(uri);
            
            // Convert content to string
            const yamlContent = Buffer.from(content).toString('utf-8');
            
            console.log(`[YAML Save] Starting save operation for ${resource.kind}/${resource.name} (${yamlContent.length} bytes) [options: ${JSON.stringify(options)}]`);
            
            // Create a temporary document-like object for the save handler
            // This allows us to reuse the handleSave logic which expects a TextDocument
            const document: vscode.TextDocument = {
                uri,
                getText: () => yamlContent,
                // Other TextDocument properties are not used by handleSave
            } as vscode.TextDocument;
            
            // Handle save using YAMLSaveHandler
            // This performs validation, dry-run, and actual kubectl apply
            const saveSuccess = await this.saveHandler.handleSave(document);
            
            if (!saveSuccess) {
                // Save failed - error messages already shown by saveHandler
                // Throwing FileSystemError.Unavailable tells VS Code to:
                // 1. Keep the editor open
                // 2. Maintain the dirty indicator
                // 3. Allow user to retry saving
                console.log(`[YAML Save] Save failed for ${resource.kind}/${resource.name} - editor will remain open`);
                // Throw FileSystemError.Unavailable to tell VS Code to keep editor open
                // Error messages are already shown by saveHandler
                throw vscode.FileSystemError.Unavailable(uri);
            }
            
            // Notify file system watchers that the file changed
            // This updates VS Code's internal state and clears the dirty indicator
            this._emitter.fire([{
                type: vscode.FileChangeType.Changed,
                uri
            }]);
            
            console.log(`[YAML Save] Successfully saved ${resource.kind}/${resource.name} - dirty indicator cleared`);
        } catch (error) {
            // If it's already a FileSystemError, re-throw it
            if (error instanceof vscode.FileSystemError) {
                throw error;
            }
            
            // Otherwise, wrap unexpected errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[YAML Save] Unexpected error during save: ${errorMessage}`);
            // Throw FileSystemError.Unavailable - error details are logged above
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }

    /**
     * Read directory contents.
     * Not supported for kube9-yaml:// scheme.
     * 
     * @param uri - The directory URI
     */
    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        throw vscode.FileSystemError.NoPermissions(uri);
    }

    /**
     * Create directory.
     * Not supported for kube9-yaml:// scheme.
     * 
     * @param uri - The directory URI
     */
    createDirectory(uri: vscode.Uri): void {
        throw vscode.FileSystemError.NoPermissions(uri);
    }

    /**
     * Delete file or directory.
     * Not supported for kube9-yaml:// scheme.
     * 
     * @param uri - The URI to delete
     */
    delete(uri: vscode.Uri): void {
        throw vscode.FileSystemError.NoPermissions(uri);
    }

    /**
     * Rename file or directory.
     * Not supported for kube9-yaml:// scheme.
     * 
     * @param oldUri - The old URI
     * @param _newUri - The new URI (unused - operation not supported)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rename(oldUri: vscode.Uri, _newUri: vscode.Uri): void {
        throw vscode.FileSystemError.NoPermissions(oldUri);
    }
}

/**
 * Parse a ResourceIdentifier from a kube9-yaml:// URI.
 * 
 * URI Format: kube9-yaml://<cluster>/<namespace>/<kind>/<name>.yaml?<apiVersion>
 * - Cluster name is extracted from the URI authority
 * - For cluster-scoped resources, namespace segment is '_cluster'
 * - API version is extracted from query parameter
 * 
 * @param uri - The URI to parse
 * @returns The parsed ResourceIdentifier
 * @throws Error if URI format is invalid
 */
export function parseResourceFromUri(uri: vscode.Uri): ResourceIdentifier {
    if (uri.scheme !== 'kube9-yaml') {
        throw new Error(`Invalid URI scheme: expected 'kube9-yaml', got '${uri.scheme}'`);
    }

    // Extract cluster from authority (URL-decoded)
    const cluster = decodeURIComponent(uri.authority);
    if (!cluster) {
        throw new Error(`Invalid URI: missing cluster authority in '${uri.toString()}'`);
    }

    // Parse path: /<namespace>/<kind>/<name>.yaml
    const pathParts = uri.path.split('/').filter(part => part.length > 0);
    
    if (pathParts.length !== 3) {
        throw new Error(
            `Invalid URI path format: expected '/<namespace>/<kind>/<name>.yaml', got '${uri.path}'`
        );
    }

    const [namespaceOrCluster, kind, nameWithExtension] = pathParts;
    
    // Remove .yaml extension from name
    const name = nameWithExtension.endsWith('.yaml')
        ? nameWithExtension.slice(0, -5)
        : nameWithExtension;
    
    // Check if this is a cluster-scoped resource
    const namespace = namespaceOrCluster === '_cluster' ? undefined : namespaceOrCluster;
    
    // Extract apiVersion from query parameter if present, otherwise use default
    const apiVersion = uri.query || 'v1';

    return {
        cluster,
        namespace,
        kind,
        name,
        apiVersion
    };
}

/**
 * Create a kube9-yaml:// URI from a ResourceIdentifier.
 * 
 * URI Format: kube9-yaml://<cluster>/<namespace>/<kind>/<name>.yaml?<apiVersion>
 * - Cluster name is used as the URI authority (handles special chars like ARNs)
 * - For cluster-scoped resources (no namespace), use '_cluster' as the namespace segment
 * 
 * @param resource - The resource identifier
 * @returns The created URI
 */
export function createResourceUri(resource: ResourceIdentifier): vscode.Uri {
    // Use '_cluster' for cluster-scoped resources
    const namespaceSegment = resource.namespace || '_cluster';
    
    // Use cluster as the authority to avoid issues with special characters in cluster names (like ARNs)
    // Path contains namespace/kind/name
    return vscode.Uri.from({
        scheme: 'kube9-yaml',
        authority: encodeURIComponent(resource.cluster),
        path: `/${namespaceSegment}/${resource.kind}/${resource.name}.yaml`,
        query: resource.apiVersion
    });
}

