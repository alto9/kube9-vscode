import * as vscode from 'vscode';
import { OperatorStatusClient } from '../services/OperatorStatusClient';

/**
 * Health report data structure sent to webview.
 */
interface HealthReportData {
    clusterContext: string;
    operatorStatus: {
        mode: 'basic' | 'operated' | 'enabled' | 'degraded';
        tier?: 'free' | 'pro';
        version?: string;
        health?: 'healthy' | 'degraded' | 'unhealthy';
        registered?: boolean;
        lastUpdate?: string;
        error?: string | null;
        clusterId?: string;
    };
    timestamp: number;
    cacheAge: number;
}

/**
 * HealthReportPanel displays operator health status in a webview panel.
 * Uses instance-based singleton pattern to manage a single panel instance.
 */
export class HealthReportPanel {
    private static currentPanel: HealthReportPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _statusClient: OperatorStatusClient;
    private readonly _kubeconfigPath: string;
    private readonly _contextName: string;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _extensionContext: vscode.ExtensionContext;

    /**
     * Create or show the Health Report webview panel.
     * Creates a new panel instance or reveals and updates the existing one.
     * 
     * @param context - The VS Code extension context
     * @param statusClient - The OperatorStatusClient instance for querying status
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - Name of the Kubernetes context
     */
    public static async createOrShow(
        context: vscode.ExtensionContext,
        statusClient: OperatorStatusClient,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, reveal it and update
        if (HealthReportPanel.currentPanel) {
            HealthReportPanel.currentPanel._panel.reveal(column);
            await HealthReportPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'kube9.operatorHealthReport',
            'Kube9 Operator Health',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')
                ]
            }
        );

        HealthReportPanel.currentPanel = new HealthReportPanel(
            panel,
            context,
            statusClient,
            kubeconfigPath,
            contextName
        );
    }

    /**
     * Private constructor to enforce singleton pattern.
     * 
     * @param panel - The webview panel instance
     * @param extensionContext - The VS Code extension context
     * @param statusClient - The OperatorStatusClient instance
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - Name of the Kubernetes context
     */
    private constructor(
        panel: vscode.WebviewPanel,
        extensionContext: vscode.ExtensionContext,
        statusClient: OperatorStatusClient,
        kubeconfigPath: string,
        contextName: string
    ) {
        this._panel = panel;
        this._extensionContext = extensionContext;
        this._statusClient = statusClient;
        this._kubeconfigPath = kubeconfigPath;
        this._contextName = contextName;

        // Set the webview's initial HTML content
        this._panel.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'refresh') {
                    await this._update(true); // Force refresh
                }
            },
            null,
            this._disposables
        );

        // Handle panel disposal
        this._panel.onDidDispose(
            () => {
                HealthReportPanel.currentPanel = undefined;
                this.dispose();
            },
            null,
            this._disposables
        );

        // Add disposables to extension context
        this._extensionContext.subscriptions.push(...this._disposables);

        // Load initial data
        this._update();
    }

    /**
     * Update the webview with current operator status.
     * Queries OperatorStatusClient and sends data to webview via postMessage.
     * 
     * @param forceRefresh - If true, bypasses cache and queries cluster directly
     */
    private async _update(forceRefresh = false): Promise<void> {
        try {
            // Query operator status
            const cachedStatus = await this._statusClient.getStatus(
                this._kubeconfigPath,
                this._contextName,
                forceRefresh
            );

            // Calculate cache age
            const cacheAge = Date.now() - cachedStatus.timestamp;

            // Build HealthReportData object
            const healthReportData: HealthReportData = {
                clusterContext: this._contextName,
                operatorStatus: {
                    mode: cachedStatus.mode as 'basic' | 'operated' | 'enabled' | 'degraded',
                    tier: cachedStatus.status?.tier,
                    version: cachedStatus.status?.version,
                    health: cachedStatus.status?.health,
                    registered: cachedStatus.status?.registered,
                    lastUpdate: cachedStatus.status?.lastUpdate,
                    error: cachedStatus.status?.error ?? null,
                    clusterId: cachedStatus.status?.clusterId
                },
                timestamp: Date.now(),
                cacheAge
            };

            // Send data to webview
            await this._panel.webview.postMessage({
                command: 'update',
                data: healthReportData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to update operator status:', errorMessage);

            // Send error message to webview
            await this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to load operator status: ${errorMessage}`
            });
        }
    }

    /**
     * Generate the HTML content for the Health Report webview.
     * Returns inline HTML with a styled loading message and root div for React.
     * 
     * @returns HTML content string
     */
    private getWebviewContent(): string {
        const webview = this._panel.webview;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
    <title>Kube9 Operator Health</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 40px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.6;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: var(--vscode-foreground);
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px 0;
            color: var(--vscode-descriptionForeground);
        }
        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 2px;
            cursor: pointer;
            margin-top: 16px;
        }
        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .refresh-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #root {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="container">
            <div class="icon">🩺</div>
            <h1>Kube9 Operator Health</h1>
            <p>Loading operator status...</p>
            <button class="refresh-button" disabled>Refresh</button>
        </div>
    </div>
    <!-- React component script will be added in future story -->
    <script>
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'update') {
                console.log('Received operator status:', message.data);
                // React component will handle this in future story
            } else if (message.command === 'error') {
                console.error('Error:', message.message);
                // React component will handle this in future story
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Dispose of resources.
     */
    private dispose(): void {
        this._disposables.forEach(d => d.dispose());
    }
}

