import React from 'react';
import { createRoot } from 'react-dom/client';
import { WebviewHeader } from '../components/WebviewHeader';
import {
    detailCopyForRequirement,
    formatOverallReadiness,
    groupRequirementsByCategory,
    shouldShowRequirementDetail,
    statusBadgeClass,
    statusDisplayLabel,
    type AIConformanceCategoryRollup,
    type AIConformanceRequirementRow,
} from '../aiConformancePresentation';
import './styles.css';

declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void };
const vscodeRaw = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscodeRaw) {
    (window as unknown as { vscodeApi: typeof vscodeRaw }).vscodeApi = vscodeRaw;
}

interface AIConformanceTotals {
    totalRequirements: number;
    mustRequirements: number;
    shouldRequirements: number;
    passed: number;
    failed: number;
    warning: number;
    notApplicable: number;
    notEvaluated: number;
    needsEvidence: number;
}

interface AIConformanceSummary {
    checklistVersion: string;
    kubernetesMinor: string;
    sourceRevision: string | null;
    lastCompletedAt: string | null;
    lastOutcome: 'none' | 'success' | 'failed';
    runState: 'completed' | 'failed' | 'partial' | null;
    runId: string | null;
    totals: AIConformanceTotals;
    categories: Record<string, AIConformanceCategoryRollup>;
    requirements: AIConformanceRequirementRow[];
    error: string | null;
    schedulingEnabled: boolean;
    scheduleIntervalSeconds: number | null;
    checklistSource: string | null;
}

interface OperatorStatusData {
    mode: 'basic' | 'operated' | 'enabled' | 'degraded';
    health?: 'healthy' | 'degraded' | 'unhealthy';
    error?: string | null;
}

interface ReportData {
    clusterContext: string;
    reportTitle: string;
    operatorMode: 'basic' | 'operated' | 'enabled' | 'degraded';
    operatorStatus: OperatorStatusData | null;
    aiConformance: AIConformanceSummary | null;
    timestamp: number;
    cacheAge: number;
}

const STALE_CACHE_MS = 5 * 60 * 1000;

function formatCategoryRollup(rollup: AIConformanceCategoryRollup): string {
    return `${rollup.total} total · ${rollup.passed} passed · ${rollup.failed} failed · ${rollup.warning} warning · ${rollup.needsEvidence} needs evidence · ${rollup.notEvaluated} not evaluated`;
}

const RequirementRow: React.FC<{ row: AIConformanceRequirementRow }> = ({ row }) => {
    const [expanded, setExpanded] = React.useState(false);
    const showDetail = shouldShowRequirementDetail(row);
    const detailCopy = detailCopyForRequirement(row);
    const statusLabel = statusDisplayLabel(row.status);

    return (
        <tr className="requirement-row">
            <td className="requirement-title-cell">
                <span className="requirement-id">{row.id}</span>
                <span className="level-badge" aria-label={`Level ${row.level}`}>
                    {row.level}
                </span>
                {row.title}
                {showDetail ? (
                    <>
                        <button
                            type="button"
                            className="expand-button"
                            aria-expanded={expanded}
                            aria-controls={`detail-${row.id}`}
                            onClick={() => setExpanded((value) => !value)}
                        >
                            {expanded ? 'Hide details' : 'Show details'}
                        </button>
                        {expanded && detailCopy ? (
                            <div className="requirement-detail" id={`detail-${row.id}`}>
                                <span className="detail-label">Details</span>
                                <p>{detailCopy}</p>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </td>
            <td>
                <span
                    className={statusBadgeClass(row.status)}
                    aria-label={`Status: ${statusLabel}`}
                >
                    {statusLabel}
                </span>
            </td>
        </tr>
    );
};

const BasicModeView: React.FC = () => (
    <div className="empty-state" role="status">
        <h2>Kube9 Operator required</h2>
        <p>
            Kubernetes AI Conformance readiness is published by kube9-operator. Install the operator in this
            cluster to view checklist rollups and requirement details.
        </p>
    </div>
);

const NoSummaryView: React.FC = () => (
    <div className="empty-state" role="status">
        <h2>No conformance run published</h2>
        <p>
            The operator has not published a Kubernetes AI Conformance summary for this cluster yet. After the
            operator completes a run, refresh this report.
        </p>
    </div>
);

const AIConformanceReport: React.FC = () => {
    const [data, setData] = React.useState<ReportData | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent): void => {
            const message = event.data;
            switch (message.command) {
                case 'update':
                    setData(message.data as ReportData);
                    setError(null);
                    setLoading(false);
                    break;
                case 'error':
                    setError(message.message ?? 'Unknown error');
                    setLoading(false);
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const onRefresh = (): void => {
        vscodeRaw?.postMessage({ command: 'refresh' });
        setLoading(true);
    };

    const reportTitle = data?.reportTitle ?? 'Kubernetes AI Conformance';
    const headerActions = [
        {
            icon: 'codicon-refresh',
            label: 'Refresh',
            onClick: onRefresh,
            disabled: loading,
        },
    ];

    const renderSummary = (summary: AIConformanceSummary): React.ReactNode => {
        const totals = summary.totals;
        const observedAt = summary.lastCompletedAt
            ? new Date(summary.lastCompletedAt).toLocaleString()
            : 'Not available';

        return (
            <section className="summary-section" aria-label="Conformance summary">
                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-card-label">Checklist version</div>
                        <div className="summary-card-value">{summary.checklistVersion}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-label">Kubernetes minor</div>
                        <div className="summary-card-value">{summary.kubernetesMinor || '—'}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-label">Last completed</div>
                        <div className="summary-card-value">{observedAt}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-label">Overall readiness</div>
                        <div className="summary-card-value">
                            {formatOverallReadiness(summary.lastOutcome, summary.runState)}
                        </div>
                    </div>
                    {summary.runId ? (
                        <div className="summary-card">
                            <div className="summary-card-label">Run ID</div>
                            <div className="summary-card-value">{summary.runId}</div>
                        </div>
                    ) : null}
                </div>
                <div className="totals-line" aria-label="Requirement totals">
                    MUST {totals.mustRequirements} · SHOULD {totals.shouldRequirements} · {totals.passed} passed ·{' '}
                    {totals.failed} failed · {totals.warning} warning · {totals.needsEvidence} needs evidence ·{' '}
                    {totals.notEvaluated} not evaluated
                </div>
                {summary.error ? (
                    <div className="warning-banner" role="status">
                        Operator reported a conformance error: {summary.error}
                    </div>
                ) : null}
            </section>
        );
    };

    const renderCategories = (summary: AIConformanceSummary): React.ReactNode => {
        const groups = groupRequirementsByCategory(summary.categories, summary.requirements);

        if (groups.length === 0) {
            return (
                <p className="stub-note">
                    No category rollups were published in the latest operator status.
                </p>
            );
        }

        return groups.map(({ categoryId, rollup, rows }) => {
            const headingId = `category-${categoryId}`;
            return (
                <section
                    key={categoryId}
                    className="category-section"
                    aria-labelledby={headingId}
                >
                    <h3 id={headingId} className="category-heading">
                        {categoryId.replace(/[-_]/g, ' ')}
                    </h3>
                    <div className="category-rollup" aria-label={`${categoryId} rollup`}>
                        {formatCategoryRollup(rollup)}
                    </div>
                    {rows.length === 0 ? (
                        <p className="stub-note">No requirement rows for this category.</p>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Requirement</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <RequirementRow key={row.id} row={row} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            );
        });
    };

    const renderLoaded = (reportData: ReportData): React.ReactNode => {
        const isStale = reportData.cacheAge > STALE_CACHE_MS;
        const operatorHealth = reportData.operatorStatus?.health;
        const isDegraded =
            reportData.operatorMode === 'degraded' ||
            operatorHealth === 'degraded' ||
            operatorHealth === 'unhealthy';

        return (
            <>
                {isStale && (
                    <div className="warning-banner" role="status">
                        Status cache is stale (older than five minutes). Click Refresh for a fresh ConfigMap read.
                    </div>
                )}

                {isDegraded && (
                    <div className="warning-banner" role="status">
                        Operator health is degraded. Conformance data may be incomplete until the operator recovers.
                    </div>
                )}

                <div className="cluster-line">
                    <strong>Cluster context:</strong> {reportData.clusterContext}
                </div>

                {reportData.operatorMode === 'basic' ? (
                    <BasicModeView />
                ) : reportData.aiConformance == null ? (
                    <NoSummaryView />
                ) : (
                    <>
                        {renderSummary(reportData.aiConformance)}
                        {renderCategories(reportData.aiConformance)}
                    </>
                )}

                <p className="stub-note">
                    Report refreshed in VS Code: {new Date(reportData.timestamp).toLocaleString()}
                </p>
            </>
        );
    };

    return (
        <div className="ai-conformance-report">
            <WebviewHeader
                title={reportTitle}
                helpContext="kubernetes-ai-conformance"
                actions={headerActions}
            />
            <div className="ai-conformance-report-body">
                {loading && <div className="loading-container">Loading conformance report…</div>}

                {!loading && error && (
                    <div className="error-container">
                        <div className="error-banner" role="alert">
                            {error}
                        </div>
                    </div>
                )}

                {!loading && !error && !data && <div className="error-container">No data</div>}

                {!loading && !error && data && renderLoaded(data)}
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<AIConformanceReport />);
}
