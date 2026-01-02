import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Acquire VS Code API
declare const acquireVsCodeApi: () => any;
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * Health report data structure sent from HealthReportPanel.
 */
interface HealthReportData {
    clusterContext: string;
    operatorStatus: OperatorStatusData;
    timestamp: number;
    cacheAge: number;
}

/**
 * Operator status information from OperatorStatusClient.
 */
interface OperatorStatusData {
    mode: 'basic' | 'operated' | 'enabled' | 'degraded';
    tier?: 'free' | 'pro';
    version?: string;
    health?: 'healthy' | 'degraded' | 'unhealthy';
    registered?: boolean;
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

    if (loading) {
        return (
            <div className="health-report">
                <div className="loading-container">
                    <p>Loading operator status...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="health-report">
                <div className="error-container">
                    <div className="error-message">Unable to fetch operator status: {error}</div>
                    <button onClick={handleRefresh} className="refresh-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="health-report">
                <div className="error-container">
                    <div className="error-message">No data available</div>
                </div>
            </div>
        );
    }

    return (
        <div className="health-report">
            <header className="report-header">
                <h1>Kube9 Operator Health</h1>
                <button onClick={handleRefresh} className="refresh-button">
                    Refresh
                </button>
            </header>

            {/* Stale status warning */}
            {data.cacheAge > 5 * 60 * 1000 && (
                <div className="warning-banner">
                    ⚠️ Status data is stale (last updated {formatCacheAge(data.cacheAge)})
                </div>
            )}

            <div className="cluster-info">
                <strong>Cluster:</strong> {data.clusterContext}
            </div>

            {/* Render different UI based on mode */}
            {data.operatorStatus.mode === 'basic' ? (
                <BasicModeView />
            ) : (
                <OperatorStatusView status={data.operatorStatus} onCopyClusterId={handleCopyClusterId} />
            )}

            <div className="timestamp">
                Last checked: {new Date(data.timestamp).toLocaleString()}
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
                        <li>AI-powered insights and recommendations</li>
                        <li>Advanced dashboards and visualizations</li>
                        <li>Automated drift detection and compliance</li>
                    </ul>
                </div>
                <button className="install-button">How to Install</button>
            </div>
        </div>
    );
};

/**
 * Props for OperatorStatusView component.
 */
interface OperatorStatusViewProps {
    status: OperatorStatusData;
    onCopyClusterId: (clusterId: string) => void;
}

/**
 * Component displayed when operator is installed (operated, enabled, or degraded mode).
 */
const OperatorStatusView: React.FC<OperatorStatusViewProps> = ({ status, onCopyClusterId }) => {
    return (
        <div className="operator-status">
            <div className="status-grid">
                <StatusCard
                    label="Status Mode"
                    value={getModeDisplay(status.mode, status.tier)}
                    status={status.mode}
                />
                {status.tier && (
                    <StatusCard label="Tier" value={status.tier.toUpperCase()} />
                )}
                {status.health && (
                    <StatusCard
                        label="Health"
                        value={status.health.charAt(0).toUpperCase() + status.health.slice(1)}
                        status={status.health}
                    />
                )}
                {status.version && <StatusCard label="Version" value={status.version} />}
                {status.registered !== undefined && (
                    <StatusCard
                        label="Registered"
                        value={status.registered ? 'Yes' : 'No'}
                        status={status.registered ? 'healthy' : 'degraded'}
                    />
                )}
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

            {/* Placeholder for future metrics */}
            <div className="future-metrics">
                <h3>Additional Metrics</h3>
                <p className="placeholder-text">More operator metrics coming soon...</p>
            </div>
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

/**
 * Formats mode string for display.
 * @param mode - Operator mode
 * @param tier - Optional tier information
 * @returns Formatted mode display string
 */
function getModeDisplay(mode: string, tier?: string): string {
    switch (mode) {
        case 'basic':
            return 'Basic (No Operator)';
        case 'operated':
            return tier === 'free' ? 'Operated (Free Tier)' : 'Operated';
        case 'enabled':
            return tier === 'pro' ? 'Enabled (Pro Tier)' : 'Enabled';
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

