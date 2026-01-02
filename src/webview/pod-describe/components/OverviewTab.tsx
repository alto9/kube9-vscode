import React from 'react';
import { PodOverview } from '../../providers/PodDescribeProvider';
import { formatDate } from '../utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** Pod overview data to display */
    data: PodOverview;
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
 * Overview tab component that displays Pod status, phase, networking, and configuration information.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    // Get status badge class based on health status
    const getStatusBadgeClass = (health: string): string => {
        const healthLower = health.toLowerCase();
        return `status-badge ${healthLower}`;
    };

    // Get health indicator class
    const getHealthClass = (health: string): string => {
        return `health-${health.toLowerCase()}`;
    };

    // Format phase for display
    const phaseDisplay = formatValue(data.phase, 'Unknown');
    const healthDisplay = formatValue(data.status.health, 'Unknown');

    return (
        <div className="overview-tab">
            <div className="section">
                <h2>Overview</h2>
                <div className="info-grid">
                    {/* Status and Phase */}
                    <div className="info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">{phaseDisplay}</div>
                    </div>

                    {/* Health Status */}
                    <div className="info-item">
                        <div className="info-label">Health</div>
                        <div className="info-value">
                            <span className={getStatusBadgeClass(healthDisplay)}>
                                {healthDisplay}
                            </span>
                        </div>
                    </div>

                    {/* Namespace */}
                    <div className="info-item">
                        <div className="info-label">Namespace</div>
                        <div className="info-value">{formatValue(data.namespace)}</div>
                    </div>

                    {/* Node Name */}
                    <div className="info-item">
                        <div className="info-label">Node</div>
                        <div className="info-value">{formatValue(data.nodeName, 'Unscheduled')}</div>
                    </div>

                    {/* Pod IP */}
                    <div className="info-item">
                        <div className="info-label">Pod IP</div>
                        <div className="info-value">{formatValue(data.podIP)}</div>
                    </div>

                    {/* Host IP */}
                    <div className="info-item">
                        <div className="info-label">Host IP</div>
                        <div className="info-value">{formatValue(data.hostIP)}</div>
                    </div>

                    {/* QoS Class */}
                    <div className="info-item">
                        <div className="info-label">QoS Class</div>
                        <div className="info-value">{formatValue(data.qosClass)}</div>
                    </div>

                    {/* Restart Policy */}
                    <div className="info-item">
                        <div className="info-label">Restart Policy</div>
                        <div className="info-value">{formatValue(data.restartPolicy)}</div>
                    </div>

                    {/* Service Account */}
                    <div className="info-item">
                        <div className="info-label">Service Account</div>
                        <div className="info-value">{formatValue(data.serviceAccount, 'default')}</div>
                    </div>

                    {/* Age */}
                    <div className="info-item">
                        <div className="info-label">Age</div>
                        <div className="info-value">{formatValue(data.age, 'Unknown')}</div>
                    </div>

                    {/* Start Time */}
                    <div className="info-item">
                        <div className="info-label">Start Time</div>
                        <div className="info-value">
                            {data.startTime && data.startTime !== 'N/A' && data.startTime !== 'Unknown'
                                ? formatDate(data.startTime)
                                : formatValue(data.startTime, 'N/A')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

