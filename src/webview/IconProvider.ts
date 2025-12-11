import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * IconProvider loads icon assets and converts them to data URIs for webview embedding.
 */
export class IconProvider {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get icon as base64 data URI for embedding in webview.
     * 
     * @param iconPath - Relative path to icon from extension root
     * @returns Data URI string or empty string if loading fails
     */
    public getIconDataUri(iconPath: string): string {
        try {
            const fullPath = path.join(this.context.extensionPath, iconPath);
            
            if (!fs.existsSync(fullPath)) {
                console.error(`Icon not found: ${fullPath}`);
                return '';
            }

            const iconBuffer = fs.readFileSync(fullPath);
            const base64 = iconBuffer.toString('base64');
            const ext = path.extname(iconPath).substring(1).toLowerCase();
            
            // Determine MIME type
            const mimeType = this.getMimeType(ext);
            
            return `data:${mimeType};base64,${base64}`;
        } catch (error) {
            console.error(`Failed to load icon ${iconPath}:`, error);
            return '';
        }
    }

    /**
     * Get MIME type for image extension.
     */
    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeTypes[extension] || 'image/png';
    }

    /**
     * Get Kube9 activity bar icon.
     */
    public getKube9ActivityBarIcon(): string {
        // Try multiple possible icon locations
        const possiblePaths = [
            'resources/icons/kube9-activity.png',
            'resources/icons/kube9-activity.svg',
            'resources/kube9-icon.svg',
            'resources/kube9-icon.png',
            'media/kube9-icon.svg',
            'media/kube9-icon.png',
            'resources/icon.svg',
            'resources/icon.png'
        ];

        for (const iconPath of possiblePaths) {
            const dataUri = this.getIconDataUri(iconPath);
            if (dataUri) {
                return dataUri;
            }
        }

        console.warn('Kube9 activity bar icon not found in any expected location');
        return '';
    }
}
