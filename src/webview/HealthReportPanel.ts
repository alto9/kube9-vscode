import * as vscode from 'vscode';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import type { AssessmentStatusSummary } from '../kubernetes/OperatorStatusTypes';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getReportWebviewHtml } from './reportWebviewHtml';

/**
 * Health report data structure sent to webview.
 */
interface HealthReportData {
    clusterContext: string;
    operatorStatus: {
        mode: 'basic' | 'operated' | 'enabled' | 'degraded';
        version?: string;
        health?: 'healthy' | 'degraded' | 'unhealthy';
        lastUpdate?: string;
        error?: string | null;
        clusterId?: string;
    };
    /** Last scheduled assessment summary from operator status ConfigMap, when present */
    assessment: AssessmentStatusSummary | null;
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
        notifyMajorWebviewOpened('operator_health_report');
        const panel = vscode.window.createWebviewPanel(
            'kube9.operatorHealthReport',
            'Kube9 Operator Health',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons')
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
        this._panel.webview.html = this.getWebviewContent(extensionContext.extensionUri, extensionContext);

        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(this._panel.webview);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        await this._update(true); // Force refresh
                        break;
                    case 'copyClusterId':
                        if (message.clusterId) {
                            try {
                                await vscode.env.clipboard.writeText(message.clusterId);
                                vscode.window.showInformationMessage('Cluster ID copied to clipboard');
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                console.error('Failed to copy cluster ID to clipboard:', errorMessage);
                                vscode.window.showErrorMessage(`Failed to copy cluster ID: ${errorMessage}`);
                            }
                        }
                        break;
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
                    version: cachedStatus.status?.version,
                    health: cachedStatus.status?.health,
                    lastUpdate: cachedStatus.status?.lastUpdate,
                    error: cachedStatus.status?.error ?? null,
                    clusterId: cachedStatus.status?.clusterId
                },
                assessment: cachedStatus.status?.assessment ?? null,
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
     * Loads the React bundle and styles from the media directory.
     * 
     * @param extensionUri - The URI of the extension
     * @returns HTML content string
     */
    private getWebviewContent(extensionUri: vscode.Uri, extensionContext: vscode.ExtensionContext): string {
        const webview = this._panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'operator-health-report', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'operator-health-report', 'styles.css')
        );
        const nonce = this._getNonce();

        return getReportWebviewHtml(webview, extensionContext, {
            scriptUri,
            stylesUri,
            pageTitle: 'Kube9 Operator Health',
            nonce,
            shellClass: 'health-report'
        });
    }

    /**
     * Generate a random nonce for Content Security Policy.
     * 
     * @returns A 32-character random alphanumeric string
     */
    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Dispose of resources.
     */
    private dispose(): void {
        this._disposables.forEach(d => d.dispose());
    }
}

