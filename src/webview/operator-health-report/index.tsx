import React from 'react';
import { createRoot } from 'react-dom/client';
import { WebviewHeader } from '../components/WebviewHeader';
import './styles.css';

declare const acquireVsCodeApi: () => any;
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode) {
    (window as unknown as { vscodeApi: typeof vscode }).vscodeApi = vscode;
}

/**
 * Health report data structure sent from HealthReportPanel.
 */
interface HealthReportData {
    clusterContext: string;
    operatorStatus: OperatorStatusData;
    assessment: AssessmentSummary | null;
    timestamp: number;
    cacheAge: number;
}

/** Mirrors operator status `assessment` field from ConfigMap */
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
    schedulingEnabled?: boolean;
    scheduleIntervalSeconds?: number | null;
    scheduledAssessmentMode?: 'full' | 'pillar' | null;
    scheduledAssessmentPillar?: string | null;
}

/**
 * Operator status information from OperatorStatusClient.
 */
interface OperatorStatusData {
    mode: 'basic' | 'operated' | 'enabled' | 'degraded';
    version?: string;
    health?: 'healthy' | 'degraded' | 'unhealthy';
    lastUpdate?: string;
    error?: string | null;
    clusterId?: string;
}

/**
 * Main component for the Operator Health Report webview.
 */
const OperatorHealthReport: React.FC = () => {
    const [data, setData] = React.useState<HealthReportData | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);

    // Set up message listener
    React.useEffect(() => {
        if (!vscode) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.command) {
                case 'update':
                    setData(message.data);
                    setError(null);
                    setLoading(false);
                    break;

                case 'error':
                    setError(message.message || 'Unknown error');
                    setLoading(false);
                    break;

                default:
                    console.log('Unknown message command:', message.command);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const handleRefresh = (): void => {
        if (vscode) {
            setLoading(true);
            vscode.postMessage({ command: 'refresh' });
        }
    };

    const handleCopyClusterId = (clusterId: string): void => {
        if (vscode) {
            vscode.postMessage({ command: 'copyClusterId', clusterId });
        }
    };

    const headerActions = [
        {
            icon: 'codicon-refresh',
            label: 'Refresh',
            onClick: handleRefresh,
            disabled: loading
        }
    ];

    return (
        <div className="health-report">
            <WebviewHeader
                title="Kube9 Operator Health"
                helpContext="operator-health-report"
                actions={headerActions}
            />
            <div className="health-report-body">
                {loading && (
                    <div className="loading-container">
                        <p>Loading operator status...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="error-container">
                        <div className="error-message">Unable to fetch operator status: {error}</div>
                    </div>
                )}

                {!loading && !error && !data && (
                    <div className="error-container">
                        <div className="error-message">No data available</div>
                    </div>
                )}

                {!loading && !error && data && (
                    <>
                        {data.cacheAge > 5 * 60 * 1000 && (
                            <div className="warning-banner">
                                ⚠️ Status data is stale (last updated {formatCacheAge(data.cacheAge)})
                            </div>
                        )}

                        <div className="cluster-info">
                            <strong>Cluster:</strong> {data.clusterContext}
                        </div>

                        {data.operatorStatus.mode === 'basic' ? (
                            <BasicModeView />
                        ) : (
                            <OperatorStatusView
                                status={data.operatorStatus}
                                assessment={data.assessment}
                                onCopyClusterId={handleCopyClusterId}
                            />
                        )}

                        <div className="timestamp">Last checked: {new Date(data.timestamp).toLocaleString()}</div>
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * Component displayed when operator is not installed (basic mode).
 */
const BasicModeView: React.FC = () => {
    return (
        <div className="basic-mode">
            <div className="status-card">
                <h2>Kube9 Operator Not Installed</h2>
                <p>The Kube9 Operator is not currently installed in this cluster.</p>
                <div className="benefits">
                    <h3>Benefits of Installing Kube9 Operator:</h3>
                    <ul>
                        <li>Enhanced cluster monitoring and health reporting</li>
                        <li>In-cluster assessments and structured status for this extension</li>
                        <li>Dashboards and workload visibility tied to operator metrics</li>
                        <li>Drift and configuration signals from collected cluster state</li>
                    </ul>
                </div>
                <button className="install-button">How to Install</button>
            </div>
        </div>
    );
};

function formatAssessmentInterval(seconds: number): string {
    if (seconds < 60) {
        return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }
    if (seconds < 3600) {
        const m = Math.round(seconds / 60);
        return `${m} minute${m === 1 ? '' : 's'}`;
    }
    if (seconds < 86400) {
        const h = Math.round(seconds / 3600);
        return `${h} hour${h === 1 ? '' : 's'}`;
    }
    const d = Math.round(seconds / 86400);
    return `${d} day${d === 1 ? '' : 's'}`;
}

function formatAssessmentNextRun(a: AssessmentSummary): string {
    if (!a.schedulingEnabled) {
        return 'Scheduled assessments are disabled in the operator (ASSESSMENT_ENABLED).';
    }
    const interval = a.scheduleIntervalSeconds;
    if (interval === null || interval === undefined || interval <= 0) {
        return 'Interval is not available. Upgrade kube9-operator to a version that publishes scheduleIntervalSeconds in status.';
    }
    const human = formatAssessmentInterval(interval);
    if (a.lastScheduledOutcome === 'none' || !a.lastScheduledCompletedAt) {
        return `No completed run reported yet from this operator process. After the first run, expect about every ${human} (collection scheduler may add jitter).`;
    }
    const last = new Date(a.lastScheduledCompletedAt).getTime();
    if (Number.isNaN(last)) {
        return 'Could not parse last run time from status.';
    }
    const next = new Date(last + interval * 1000);
    return `Approximate next run: ${next.toLocaleString()} — based on last completion plus ${human}. Actual time may vary slightly.`;
}

const AssessmentScheduleSection: React.FC<{ assessment: AssessmentSummary }> = ({ assessment }) => {
    const a = assessment;
    const lastRunDisplay =
        a.lastScheduledCompletedAt && a.lastScheduledOutcome !== 'none'
            ? `${new Date(a.lastScheduledCompletedAt).toLocaleString()} (${a.lastScheduledOutcome})`
            : 'No run recorded yet (operator may not have completed a scheduled tick in this process).';

    const scopeLabel =
        a.scheduledAssessmentMode === 'pillar' && a.scheduledAssessmentPillar
            ? `Pillar: ${a.scheduledAssessmentPillar}`
            : a.scheduledAssessmentMode === 'full'
              ? 'Full framework'
              : '—';

    const totals = a.lastScheduledTotals;

    return (
        <section className="assessment-schedule-section" aria-labelledby="assessment-schedule-heading">
            <h3 id="assessment-schedule-heading" className="assessment-schedule-title">
                Well-Architected assessment (scheduled)
            </h3>
            <div className="assessment-summary-grid">
                <div className="assessment-summary-card">
                    <div className="assessment-card-label">Last run</div>
                    <div className="assessment-card-value">{lastRunDisplay}</div>
                </div>
                <div className="assessment-summary-card">
                    <div className="assessment-card-label">Run state</div>
                    <div className="assessment-card-value">{a.lastScheduledRunState ?? '—'}</div>
                </div>
                <div className="assessment-summary-card">
                    <div className="assessment-card-label">Scope</div>
                    <div className="assessment-card-value">{scopeLabel}</div>
                </div>
                <div className="assessment-summary-card">
                    <div className="assessment-card-label">Totals</div>
                    <div className="assessment-card-value">
                        {totals.passedChecks} passed · {totals.failedChecks} failed · {totals.warningChecks} warn ·{' '}
                        {totals.totalChecks} total
                    </div>
                </div>
            </div>
            {a.lastScheduledOutcome === 'failed' && a.lastScheduledError ? (
                <div className="assessment-tick-error">Last assessment tick error: {a.lastScheduledError}</div>
            ) : null}
            <div className="assessment-next-run">
                <h4>Next scheduled run</h4>
                <div>{formatAssessmentNextRun(a)}</div>
            </div>
        </section>
    );
};

/**
 * Props for OperatorStatusView component.
 */
interface OperatorStatusViewProps {
    status: OperatorStatusData;
    assessment: AssessmentSummary | null;
    onCopyClusterId: (clusterId: string) => void;
}

/**
 * Component displayed when operator is installed.
 */
const OperatorStatusView: React.FC<OperatorStatusViewProps> = ({ status, assessment, onCopyClusterId }) => {
    return (
        <div className="operator-status">
            <div className="status-grid">
                <StatusCard
                    label="Status"
                    value={getModeDisplay(status.mode)}
                    status={status.mode}
                />
                {status.health && (
                    <StatusCard
                        label="Health"
                        value={status.health.charAt(0).toUpperCase() + status.health.slice(1)}
                        status={status.health}
                    />
                )}
                {status.version && <StatusCard label="Version" value={status.version} />}
                {status.lastUpdate && (
                    <StatusCard label="Last Update" value={formatTimestamp(status.lastUpdate)} />
                )}
            </div>

            {status.clusterId && (
                <div className="cluster-id-section">
                    <strong>Cluster ID:</strong>
                    <code>{status.clusterId}</code>
                    <button onClick={() => onCopyClusterId(status.clusterId!)} className="copy-button">
                        Copy
                    </button>
                </div>
            )}

            {status.error && (
                <div className="error-section">
                    <h3>Error Details</h3>
                    <div className="error-message">{status.error}</div>
                </div>
            )}

            {assessment && <AssessmentScheduleSection assessment={assessment} />}
        </div>
    );
};

/**
 * Props for StatusCard component.
 */
interface StatusCardProps {
    label: string;
    value: string;
    status?: 'healthy' | 'degraded' | 'unhealthy' | 'operated' | 'enabled' | 'basic';
}

/**
 * Reusable status card component with status-based styling.
 */
const StatusCard: React.FC<StatusCardProps> = ({ label, value, status }) => {
    const statusClass = status ? `status-${status}` : '';

    return (
        <div className={`status-card ${statusClass}`}>
            <div className="label">{label}</div>
            <div className="value">{value}</div>
        </div>
    );
};

function getModeDisplay(mode: string): string {
    switch (mode) {
        case 'basic':
            return 'Basic (No Operator)';
        case 'operated':
            return 'Operator connected';
        case 'enabled':
            return 'Operator connected';
        case 'degraded':
            return 'Degraded';
        default:
            return mode;
    }
}

/**
 * Formats an ISO 8601 timestamp into a human-readable date string.
 * For recent times (< 1 hour), shows relative time (e.g., "2 minutes ago").
 * For older times, shows formatted date string.
 * @param timestamp - ISO 8601 timestamp string
 * @returns Human-readable timestamp string
 */
function formatTimestamp(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Show relative time for recent updates (< 1 hour)
        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }

        // For older times, show formatted date
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        // Fall back to original timestamp if parsing fails
        return timestamp;
    }
}

/**
 * Formats cache age in milliseconds to human-readable string.
 * @param ageMs - Cache age in milliseconds
 * @returns Human-readable cache age string
 */
function formatCacheAge(ageMs: number): string {
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 1) {
        return 'less than a minute ago';
    }
    if (minutes === 1) {
        return '1 minute ago';
    }
    return `${minutes} minutes ago`;
}

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<OperatorHealthReport />);
} else {
    console.error('Root element not found');
}

