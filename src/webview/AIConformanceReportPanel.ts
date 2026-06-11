import * as vscode from 'vscode';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import type { AIConformanceSummary, OperatorStatus } from '../kubernetes/OperatorStatusTypes';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';
import {
    AI_CONFORMANCE_REPORT_LABEL,
} from '../tree/categories/reports/AIConformanceReportCategory';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getReportWebviewHtml } from './reportWebviewHtml';

export interface AIConformanceReportPayload {
    clusterContext: string;
    reportTitle: string;
    operatorMode: OperatorStatusMode;
    operatorStatus: OperatorStatus | null;
    aiConformance: AIConformanceSummary | null;
    timestamp: number;
    cacheAge: number;
}

/**
 * Webview for Kubernetes AI Conformance readiness from operator status ConfigMap (one panel per cluster context).
 */
export class AIConformanceReportPanel {
    private static panels = new Map<string, AIConformanceReportPanel>();

    private readonly _panel: vscode.WebviewPanel;
    private readonly _statusClient: OperatorStatusClient;
    private readonly _kubeconfigPath: string;
    private readonly _contextName: string;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _extensionContext: vscode.ExtensionContext;

    public static async createOrShow(
        context: vscode.ExtensionContext,
        statusClient: OperatorStatusClient,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const existing = AIConformanceReportPanel.panels.get(contextName);
        if (existing) {
            existing._panel.reveal(column);
            await existing._update();
            return;
        }

        notifyMajorWebviewOpened('ai_conformance_report');
        const panel = vscode.window.createWebviewPanel(
            'kube9.aiConformanceReport',
            AI_CONFORMANCE_REPORT_LABEL,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons'),
                ],
            }
        );

        new AIConformanceReportPanel(
            panel,
            context,
            statusClient,
            kubeconfigPath,
            contextName
        );
    }

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

        AIConformanceReportPanel.panels.set(contextName, this);

        this._panel.webview.html = this.getWebviewContent(extensionContext.extensionUri, extensionContext);

        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(this._panel.webview);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'refresh') {
                    await this._update(true);
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(
            () => {
                if (AIConformanceReportPanel.panels.get(this._contextName) === this) {
                    AIConformanceReportPanel.panels.delete(this._contextName);
                }
                this.dispose();
            },
            null,
            this._disposables
        );

        this._extensionContext.subscriptions.push(...this._disposables);
        void this._update();
    }

    private async _update(forceRefresh = false): Promise<void> {
        try {
            const cached = await this._statusClient.getStatus(
                this._kubeconfigPath,
                this._contextName,
                forceRefresh
            );

            const cacheAge = Date.now() - cached.timestamp;

            const payload: AIConformanceReportPayload = {
                clusterContext: this._contextName,
                reportTitle: AI_CONFORMANCE_REPORT_LABEL,
                operatorMode: cached.mode,
                operatorStatus: cached.status,
                aiConformance: cached.status?.aiConformance ?? null,
                timestamp: Date.now(),
                cacheAge,
            };

            await this._panel.webview.postMessage({
                command: 'update',
                data: payload,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to load Kubernetes AI Conformance report: ${errorMessage}`,
            });
        }
    }

    private getWebviewContent(extensionUri: vscode.Uri, extensionContext: vscode.ExtensionContext): string {
        const webview = this._panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'ai-conformance-report', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'ai-conformance-report', 'styles.css')
        );
        const nonce = this._getNonce();

        return getReportWebviewHtml(webview, extensionContext, {
            scriptUri,
            stylesUri,
            pageTitle: AI_CONFORMANCE_REPORT_LABEL,
            nonce,
            shellClass: 'ai-conformance-report',
        });
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private dispose(): void {
        this._disposables.forEach((d) => d.dispose());
    }
}
