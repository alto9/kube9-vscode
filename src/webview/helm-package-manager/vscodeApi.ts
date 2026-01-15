import { VSCodeAPI } from './types';

/**
 * Extended Window interface to include VS Code API properties.
 */
interface WindowWithVSCodeAPI extends Window {
    vscodeApi?: VSCodeAPI;
    vscode?: VSCodeAPI;
}

/**
 * Shared VS Code API instance.
 * acquireVsCodeApi() can only be called once per webview context.
 * This module ensures it's only called once and provides the instance to all components.
 */
let vscodeInstance: VSCodeAPI | undefined;

/**
 * Get the VS Code API instance.
 * Acquires it on first call, then returns the same instance on subsequent calls.
 * Also exposes it on window.vscodeApi for use by components that need shared access (e.g., WebviewHeader)
 */
export function getVSCodeAPI(): VSCodeAPI | undefined {
    if (vscodeInstance) {
        return vscodeInstance;
    }
    
    const windowWithVSCode = window as WindowWithVSCodeAPI;
    
    // Check if already exposed on window (e.g., by another script)
    if (windowWithVSCode.vscodeApi) {
        vscodeInstance = windowWithVSCode.vscodeApi;
        return vscodeInstance;
    }
    
    if (typeof acquireVsCodeApi !== 'undefined') {
        try {
            vscodeInstance = acquireVsCodeApi();
            // Expose on window for standalone scripts
            windowWithVSCode.vscodeApi = vscodeInstance;
            return vscodeInstance;
        } catch (error) {
            // If API was already acquired, try to get it from window (if available)
            if (windowWithVSCode.vscode) {
                vscodeInstance = windowWithVSCode.vscode;
                windowWithVSCode.vscodeApi = vscodeInstance;
                return vscodeInstance;
            }
            console.error('Failed to acquire VS Code API:', error);
            return undefined;
        }
    }
    
    return undefined;
}

/**
 * Pre-acquire the VS Code API instance.
 * Call this at the top level of the application to ensure the API is acquired early.
 */
export function initializeVSCodeAPI(): VSCodeAPI | undefined {
    return getVSCodeAPI();
}

// Declare acquireVsCodeApi for TypeScript
declare function acquireVsCodeApi(): VSCodeAPI;
