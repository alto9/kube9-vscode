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
            <div className="info-grid">
                {/* Status and Phase */}
                <div className="info-item">
                    <label>Status</label>
                    <value className={`status-${phaseDisplay.toLowerCase()}`}>
                        {phaseDisplay}
                    </value>
                </div>

                {/* Health Status */}
                <div className="info-item">
                    <label>Health</label>
                    <value className={getHealthClass(healthDisplay)}>
                        <span className={getStatusBadgeClass(healthDisplay)}>
                            {healthDisplay}
                        </span>
                    </value>
                </div>

                {/* Namespace */}
                <div className="info-item">
                    <label>Namespace</label>
                    <value>{formatValue(data.namespace)}</value>
                </div>

                {/* Node Name */}
                <div className="info-item">
                    <label>Node</label>
                    <value>{formatValue(data.nodeName, 'Unscheduled')}</value>
                </div>

                {/* Pod IP */}
                <div className="info-item">
                    <label>Pod IP</label>
                    <value>{formatValue(data.podIP)}</value>
                </div>

                {/* Host IP */}
                <div className="info-item">
                    <label>Host IP</label>
                    <value>{formatValue(data.hostIP)}</value>
                </div>

                {/* QoS Class */}
                <div className="info-item">
                    <label>QoS Class</label>
                    <value>{formatValue(data.qosClass)}</value>
                </div>

                {/* Restart Policy */}
                <div className="info-item">
                    <label>Restart Policy</label>
                    <value>{formatValue(data.restartPolicy)}</value>
                </div>

                {/* Service Account */}
                <div className="info-item">
                    <label>Service Account</label>
                    <value>{formatValue(data.serviceAccount, 'default')}</value>
                </div>

                {/* Age */}
                <div className="info-item">
                    <label>Age</label>
                    <value>{formatValue(data.age, 'Unknown')}</value>
                </div>

                {/* Start Time */}
                <div className="info-item">
                    <label>Start Time</label>
                    <value>
                        {data.startTime && data.startTime !== 'N/A' && data.startTime !== 'Unknown'
                            ? formatDate(data.startTime)
                            : formatValue(data.startTime, 'N/A')}
                    </value>
                </div>
            </div>
        </div>
    );
};

