import * as vscode from 'vscode';

/**
 * Simple FileSystemProvider for kube9-describe:// URI scheme.
 * Provides read-only access to kubectl describe output.
 * 
 * URI Format: kube9-describe://<resource-name>.describe
 */
export class DescribeRawFileSystemProvider implements vscode.FileSystemProvider {
    /**
     * Singleton instance of the provider.
     * Used to access the provider from command handlers.
     */
    private static instance: DescribeRawFileSystemProvider | undefined;

    /**
     * Get the singleton instance of the provider.
     * 
     * @returns The provider instance
     */
    public static getInstance(): DescribeRawFileSystemProvider {
        if (!DescribeRawFileSystemProvider.instance) {
            DescribeRawFileSystemProvider.instance = new DescribeRawFileSystemProvider();
        }
        return DescribeRawFileSystemProvider.instance;
    }
    /**
     * Map of URI paths to their content.
     * Key: resource name (from URI path)
     * Value: describe output content
     */
    private contentMap: Map<string, string> = new Map();

    /**
     * Event emitter for file system changes.
     * Not used for read-only describe documents, but required by interface.
     */
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    /**
     * Store content for a resource.
     * 
     * @param resourceName The resource name (will be used as URI path)
     * @param content The describe output content
     */
    public setContent(resourceName: string, content: string): void {
        this.contentMap.set(resourceName, content);
    }

    /**
     * Get content for a resource.
     * 
     * @param resourceName The resource name
     * @returns The describe output content, or empty string if not found
     */
    public getContent(resourceName: string): string {
        return this.contentMap.get(resourceName) || '';
    }

    /**
     * Remove content for a resource (cleanup).
     * 
     * @param resourceName The resource name
     */
    public removeContent(resourceName: string): void {
        this.contentMap.delete(resourceName);
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const resourceName = this.getResourceNameFromUri(uri);
        const content = this.getContent(resourceName);
        
        return {
            type: vscode.FileType.File,
            ctime: Date.now(),
            mtime: Date.now(),
            size: Buffer.byteLength(content, 'utf8')
        };
    }

    readDirectory(_uri: vscode.Uri): [string, vscode.FileType][] {
        // Describe documents are single files, no directories
        return [];
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const resourceName = this.getResourceNameFromUri(uri);
        const content = this.getContent(resourceName);
        
        if (!content) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        
        return Buffer.from(content, 'utf8');
    }

    writeFile(
        _uri: vscode.Uri,
        _content: Uint8Array,
        _options: { create: boolean; overwrite: boolean }
    ): void {
        // Describe documents are read-only
        throw vscode.FileSystemError.NoPermissions('Describe documents are read-only');
    }

    delete(_uri: vscode.Uri): void {
        // Describe documents are read-only
        throw vscode.FileSystemError.NoPermissions('Describe documents are read-only');
    }

    rename(_oldUri: vscode.Uri, _newUri: vscode.Uri): void {
        // Describe documents are read-only
        throw vscode.FileSystemError.NoPermissions('Describe documents are read-only');
    }

    createDirectory(_uri: vscode.Uri): void {
        // Describe documents don't support directories
        throw vscode.FileSystemError.NoPermissions('Describe documents are read-only');
    }

    watch(
        _uri: vscode.Uri,
        _options: { recursive: boolean; excludes: string[] }
    ): vscode.Disposable {
        // Describe documents are read-only and don't change, so no need to watch
        return new vscode.Disposable(() => {
            // No-op disposal
        });
    }

    /**
     * Extract resource name from URI path.
     * URI format: kube9-describe://<resource-name>.describe
     * 
     * @param uri The URI
     * @returns The resource name (without .describe suffix)
     */
    private getResourceNameFromUri(uri: vscode.Uri): string {
        // Path format: /<resource-name>.describe
        const path = uri.path;
        if (path.startsWith('/')) {
            return path.slice(1); // Remove leading slash
        }
        return path;
    }
}

/**
 * Create a kube9-describe:// URI for a resource.
 * 
 * @param resourceName The resource name
 * @returns The created URI
 */
export function createDescribeUri(resourceName: string): vscode.Uri {
    return vscode.Uri.from({
        scheme: 'kube9-describe',
        path: `/${resourceName}.describe`
    });
}

