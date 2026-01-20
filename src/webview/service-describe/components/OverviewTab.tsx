import React from 'react';
import { ServiceOverview } from '../../../providers/ServiceDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** Service overview data to display */
    data: ServiceOverview;
}

/**
 * Helper function to format a value, showing "N/A" or "Unknown" for empty/null values.
 */
function formatValue(value: string | undefined | null, fallback: string = 'N/A'): string {
    if (!value || value.trim() === '') {
        return fallback;
    }
    return value;
}

/**
 * Get badge class for service type.
 */
function getServiceTypeBadgeClass(type: string): string {
    const typeLower = type.toLowerCase();
    // Use status-badge styling similar to health status
    return `status-badge ${typeLower}`;
}

/**
 * Overview tab component that displays Service type, IPs, ports, selectors, and session affinity.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    // Get status badge class based on health status
    const getStatusBadgeClass = (health: string): string => {
        const healthLower = health.toLowerCase();
        return `status-badge ${healthLower}`;
    };

    const healthDisplay = formatValue(data.status.health, 'Unknown');

    return (
        <div className="overview-tab">
            <div className="section">
                <h2>Overview</h2>
                <div className="info-grid" style={{ marginBottom: '24px' }}>
                    {/* Service Type */}
                    <div className="info-item">
                        <div className="info-label">Type</div>
                        <div className="info-value">
                            <span className={getServiceTypeBadgeClass(data.type)} style={{ marginLeft: 0 }}>
                                {data.type}
                            </span>
                        </div>
                    </div>

                    {/* Health Status */}
                    <div className="info-item">
                        <div className="info-label">Health</div>
                        <div className="info-value">
                            <span className={getStatusBadgeClass(healthDisplay)} style={{ marginLeft: 0 }}>
                                {healthDisplay}
                            </span>
                        </div>
                    </div>

                    {/* Namespace */}
                    <div className="info-item">
                        <div className="info-label">Namespace</div>
                        <div className="info-value">{formatValue(data.namespace)}</div>
                    </div>

                    {/* Cluster IP */}
                    <div className="info-item">
                        <div className="info-label">Cluster IP</div>
                        <div className="info-value">{formatValue(data.clusterIP)}</div>
                    </div>

                    {/* External IPs */}
                    {data.externalIPs.length > 0 && (
                        <div className="info-item">
                            <div className="info-label">External IPs</div>
                            <div className="info-value">{data.externalIPs.join(', ')}</div>
                        </div>
                    )}

                    {/* Load Balancer Ingress */}
                    {data.loadBalancerIngress.length > 0 && (
                        <div className="info-item">
                            <div className="info-label">Load Balancer Ingress</div>
                            <div className="info-value">{data.loadBalancerIngress.join(', ')}</div>
                        </div>
                    )}

                    {/* Session Affinity */}
                    <div className="info-item">
                        <div className="info-label">Session Affinity</div>
                        <div className="info-value">
                            {formatValue(data.sessionAffinity)}
                            {data.sessionAffinityConfig?.clientIP?.timeoutSeconds && (
                                <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '0.9em', fontStyle: 'italic', marginLeft: '8px' }}>
                                    ({data.sessionAffinityConfig.clientIP.timeoutSeconds}s timeout)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Age */}
                    <div className="info-item">
                        <div className="info-label">Age</div>
                        <div className="info-value">{formatValue(data.age)}</div>
                    </div>

                    {/* Creation Timestamp */}
                    <div className="info-item">
                        <div className="info-label">Created</div>
                        <div className="info-value">
                            {data.creationTimestamp ? formatDate(data.creationTimestamp) : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ports Section */}
            {data.ports.length > 0 && (
                <div className="section">
                    <h2>Ports</h2>
                    <table className="conditions-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Port</th>
                                <th>Target Port</th>
                                <th>Node Port</th>
                                <th>Protocol</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.ports.map((port, index) => (
                                <tr key={index}>
                                    <td>{formatValue(port.name, '-')}</td>
                                    <td>{port.port}</td>
                                    <td>{typeof port.targetPort === 'number' ? port.targetPort : port.targetPort}</td>
                                    <td>{port.nodePort ? port.nodePort : '-'}</td>
                                    <td>{port.protocol}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selectors Section */}
            {Object.keys(data.selectors).length > 0 && (
                <div className="section">
                    <h2>Selectors</h2>
                    <div className="key-value-list">
                        {Object.entries(data.selectors).map(([key, value]) => (
                            <div key={key} className="key-value-item">
                                <span className="key">{key}</span>
                                <span className="value">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
