import React from 'react';
import { createRoot } from 'react-dom/client';
import { WebviewHeader } from '../components/WebviewHeader';
import './styles.css';

declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void };
const vscodeRaw = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscodeRaw) {
    (window as unknown as { vscodeApi: typeof vscodeRaw }).vscodeApi = vscodeRaw;
}

interface AssessmentRow {
    checkId: string;
    checkName: string;
    pillar: string;
    status: string;
    message?: string | null;
    remediation?: string | null;
}

interface AssessmentSummary {
    lastScheduledCompletedAt: string | null;
    lastScheduledOutcome: 'none' | 'success' | 'failed';
    lastScheduledRunState: string | null;
    lastScheduledRunId: string | null;
    lastScheduledTotals: {
        totalChecks: number;
        completedChecks: number;
        passedChecks: number;
        failedChecks: number;
        warningChecks: number;
    };
    lastScheduledError: string | null;
    lastScheduledChecks: AssessmentRow[];
    schedulingEnabled: boolean;
    scheduleIntervalSeconds: number | null;
    scheduledAssessmentMode: 'full' | 'pillar' | null;
    scheduledAssessmentPillar: string | null;
}

interface ReportData {
    clusterContext: string;
    reportId: string;
    reportTitle: string;
    pillarId: string;
    pillarLabel: string;
    assessment: AssessmentSummary;
    timestamp: number;
    cacheAge: number;
}

function statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'passing') {
        return 'status-pill status-passing';
    }
    if (s === 'failing') {
        return 'status-pill status-failing';
    }
    if (s === 'warning') {
        return 'status-pill status-warning';
    }
    if (s === 'skipped') {
        return 'status-pill status-skipped';
    }
    if (s === 'error' || s === 'timeout') {
        return `status-pill status-${s}`;
    }
    return 'status-pill';
}

function isPassingStatus(status: string): boolean {
    return status.toLowerCase() === 'passing';
}

function pillarRowsFor(data: ReportData): AssessmentRow[] {
    const { pillarId } = data;
    return data.assessment.lastScheduledChecks.filter((r) => r.pillar === pillarId);
}

const WellArchitectedReport: React.FC = () => {
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

    const reportTitle = data?.reportTitle ?? 'Well-Architected Assessment';
    const headerActions = [
        {
            label: 'Refresh',
            onClick: onRefresh,
            disabled: loading,
        },
    ];

    const renderLoaded = (reportData: ReportData): React.ReactNode => {
        const rows = pillarRowsFor(reportData);

        return (
            <>
                {reportData.cacheAge > 5 * 60 * 1000 && (
                    <div className="error-banner">
                        Status cache is stale (older than five minutes). Click Refresh for a fresh ConfigMap read.
                    </div>
                )}

                <div className="cluster-line">
                    <strong>Cluster context:</strong> {reportData.clusterContext}
                </div>

                <section className="checks-section" aria-label="Assessment checks">
                    {rows.length === 0 ? (
                        <p className="stub-note">
                            No checks for this pillar in the last successful run status. If the operator only assesses
                            another pillar, open that page or switch the operator to full-framework mode.
                        </p>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Check</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const showFinding =
                                            !isPassingStatus(row.status) &&
                                            Boolean((row.message && row.message.trim()) || (row.remediation && row.remediation.trim()));
                                        return (
                                            <React.Fragment key={row.checkId}>
                                                <tr className="check-row">
                                                    <td className="check-name-cell">{row.checkName}</td>
                                                    <td>
                                                        <span className={statusClass(row.status)}>{row.status}</span>
                                                    </td>
                                                </tr>
                                                {showFinding ? (
                                                    <tr className="check-detail-row">
                                                        <td colSpan={2}>
                                                            <div className="check-detail-inner">
                                                                {row.message && row.message.trim() ? (
                                                                    <div className="check-reason">
                                                                        <span className="detail-label">Reason</span>
                                                                        <p>{row.message.trim()}</p>
                                                                    </div>
                                                                ) : null}
                                                                {row.remediation && row.remediation.trim() ? (
                                                                    <div className="check-remediation">
                                                                        <span className="detail-label">What to do next</span>
                                                                        <p>{row.remediation.trim()}</p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <p className="stub-note">Report refreshed in VS Code: {new Date(reportData.timestamp).toLocaleString()}</p>
            </>
        );
    };

    return (
        <div className="waf-report">
            <WebviewHeader title={reportTitle} helpContext="well-architected-assessment" actions={headerActions} />
            <div className="waf-report-body">
                {loading && <div className="loading-container">Loading assessment report…</div>}

                {!loading && error && (
                    <div className="error-container">
                        <div className="error-banner">{error}</div>
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
    createRoot(container).render(<WellArchitectedReport />);
}
