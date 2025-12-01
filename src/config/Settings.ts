import * as vscode from 'vscode';

/**
 * Settings helper class for accessing kube9 extension configuration.
 * Provides type-safe access to VS Code workspace configuration.
 */
export class Settings {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static readonly CONFIGURATION_SECTION = 'kube9';

    /**
     * Get the configured server URL.
     * @returns The server URL string
     */
    public static getServerUrl(): string {
        const config = vscode.workspace.getConfiguration(this.CONFIGURATION_SECTION);
        return config.get<string>('serverUrl') || 'https://api.kube9.dev';
    }

    /**
     * Check if debug mode is enabled.
     * @returns True if debug mode is enabled, false otherwise
     */
    public static isDebugMode(): boolean {
        const config = vscode.workspace.getConfiguration(this.CONFIGURATION_SECTION);
        return config.get<boolean>('debugMode') || false;
    }
}

