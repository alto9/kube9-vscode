import React from 'react';
import { PVCOverview } from '../../../providers/PVCDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** PVC overview data to display */
    data: PVCOverview;
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
 * Overview tab component that displays PVC status, capacity, access modes, and storage class information.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    // Get status badge class based on health status
    const getStatusBadgeClass = (health: string): string => {
        const healthLower = health.toLowerCase();
        return `status-badge ${healthLower}`;
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

                    {/* Requested Capacity */}
                    <div className="info-item">
                        <div className="info-label">Requested Capacity</div>
                        <div className="info-value">{formatValue(data.requestedCapacity)}</div>
                    </div>

                    {/* Actual Capacity */}
                    {data.actualCapacity && (
                        <div className="info-item">
                            <div className="info-label">Actual Capacity</div>
                            <div className="info-value">{formatValue(data.actualCapacity)}</div>
                        </div>
                    )}

                    {/* Access Modes */}
                    <div className="info-item">
                        <div className="info-label">Access Modes</div>
                        <div className="info-value">
                            {data.accessModes.length > 0 ? data.accessModes.join(', ') : 'N/A'}
                        </div>
                    </div>

                    {/* Storage Class */}
                    <div className="info-item">
                        <div className="info-label">Storage Class</div>
                        <div className="info-value">{formatValue(data.storageClass)}</div>
                    </div>

                    {/* Bound PV */}
                    {data.boundPV && (
                        <div className="info-item">
                            <div className="info-label">Bound PV</div>
                            <div className="info-value">{formatValue(data.boundPV)}</div>
                        </div>
                    )}

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
        </div>
    );
};
