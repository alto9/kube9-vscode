import * as vscode from 'vscode';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import type { AssessmentStatusSummary, OperatorStatus } from '../kubernetes/OperatorStatusTypes';
import {
    labelForWellArchitectedPillar,
    parseWellArchitectedReportId,
} from '../tree/categories/reports/WellArchitectedFrameworkCategory';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getReportWebviewHtml } from './reportWebviewHtml';

export interface AssessmentReportPayload {
    clusterContext: string;
    reportId: string;
    reportTitle: string;
    pillarId: string;
    pillarLabel: string;
    operatorStatus: OperatorStatus | null;
    /** Normalized assessment summary for display */
    assessment: AssessmentStatusSummary;
    timestamp: number;
    cacheAge: number;
}

/**
 * Webview for scheduled Well-Architected assessment status from the operator ConfigMap (one pillar per panel).
 */
export class WellArchitectedAssessmentPanel {
    private static panels = new Map<string, WellArchitectedAssessmentPanel>();

    private static key(contextName: string, reportId: string): string {
        return `${contextName}\u0000${reportId}`;
    }

    private readonly _panel: vscode.WebviewPanel;
    private readonly _statusClient: OperatorStatusClient;
    private readonly _kubeconfigPath: string;
    private readonly _contextName: string;
    private readonly _reportId: string;
    private readonly _pillarId: string;
    private readonly _reportTitle: string;
    private readonly _panelKey: string;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _extensionContext: vscode.ExtensionContext;

    public static async createOrShow(
        context: vscode.ExtensionContext,
        statusClient: OperatorStatusClient,
        kubeconfigPath: string,
        contextName: string,
        reportId: string
    ): Promise<void> {
        const pillarId = parseWellArchitectedReportId(reportId);
        if (!pillarId) {
            await vscode.window.showErrorMessage(`Unknown assessment report: ${reportId}`);
            return;
        }

        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const k = WellArchitectedAssessmentPanel.key(contextName, reportId);
        const existing = WellArchitectedAssessmentPanel.panels.get(k);
        if (existing) {
            existing._panel.reveal(column);
            await existing._update();
            return;
        }

        notifyMajorWebviewOpened('well_architected_assessment_report');
        const pillarLabel = labelForWellArchitectedPillar(pillarId);
        const title = `Well-Architected Assessment — ${pillarLabel}`;
        const panel = vscode.window.createWebviewPanel(
            'kube9.wellArchitectedAssessmentReport',
            title,
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

        const instance = new WellArchitectedAssessmentPanel(
            panel,
            context,
            statusClient,
            kubeconfigPath,
            contextName,
            reportId,
            pillarId,
            pillarLabel,
            title,
            k
        );
        WellArchitectedAssessmentPanel.panels.set(k, instance);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionContext: vscode.ExtensionContext,
        statusClient: OperatorStatusClient,
        kubeconfigPath: string,
        contextName: string,
        reportId: string,
        pillarId: string,
        pillarLabel: string,
        reportTitle: string,
        panelKey: string
    ) {
        this._panel = panel;
        this._extensionContext = extensionContext;
        this._statusClient = statusClient;
        this._kubeconfigPath = kubeconfigPath;
        this._contextName = contextName;
        this._reportId = reportId;
        this._pillarId = pillarId;
        this._reportTitle = reportTitle;
        this._panelKey = panelKey;

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
                if (WellArchitectedAssessmentPanel.panels.get(this._panelKey) === this) {
                    WellArchitectedAssessmentPanel.panels.delete(this._panelKey);
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

            const payload: AssessmentReportPayload = {
                clusterContext: this._contextName,
                reportId: this._reportId,
                reportTitle: this._reportTitle,
                pillarId: this._pillarId,
                pillarLabel: labelForWellArchitectedPillar(this._pillarId),
                operatorStatus: cached.status,
                assessment: normalizeAssessment(cached.status?.assessment),
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
                message: `Failed to load assessment report: ${errorMessage}`,
            });
        }
    }

    private getWebviewContent(extensionUri: vscode.Uri, extensionContext: vscode.ExtensionContext): string {
        const webview = this._panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'well-architected-assessment-report', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'well-architected-assessment-report', 'styles.css')
        );
        const nonce = this._getNonce();

        return getReportWebviewHtml(webview, extensionContext, {
            scriptUri,
            stylesUri,
            pageTitle: this._reportTitle,
            nonce,
            shellClass: 'waf-report',
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

function normalizeAssessment(raw?: AssessmentStatusSummary): AssessmentStatusSummary {
    const totals = raw?.lastScheduledTotals ?? {
        totalChecks: 0,
        completedChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
    };
    return {
        lastScheduledCompletedAt: raw?.lastScheduledCompletedAt ?? null,
        lastScheduledOutcome: raw?.lastScheduledOutcome ?? 'none',
        lastScheduledRunState: raw?.lastScheduledRunState ?? null,
        lastScheduledRunId: raw?.lastScheduledRunId ?? null,
        lastScheduledTotals: { ...totals },
        lastScheduledError: raw?.lastScheduledError ?? null,
        lastScheduledChecks: raw?.lastScheduledChecks ? [...raw.lastScheduledChecks] : [],
        schedulingEnabled: raw?.schedulingEnabled ?? false,
        scheduleIntervalSeconds: raw?.scheduleIntervalSeconds ?? null,
        scheduledAssessmentMode: raw?.scheduledAssessmentMode ?? null,
        scheduledAssessmentPillar: raw?.scheduledAssessmentPillar ?? null,
    };
}
