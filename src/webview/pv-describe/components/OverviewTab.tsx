import React from 'react';
import { PVOverview } from '../../../providers/PVDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** PV overview data to display */
    data: PVOverview;
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
 * Overview tab component that displays PV status, capacity, access modes, reclaim policy, and storage class information.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    // Get status badge class based on health status
    const getStatusBadgeClass = (health: string): string => {
        const healthLower = health.toLowerCase();
        return `status-badge ${healthLower}`;
    };

    // Format phase for display
    const phaseDisplay = formatValue(data.status.phase, 'Unknown');
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

                    {/* Capacity */}
                    <div className="info-item">
                        <div className="info-label">Capacity</div>
                        <div className="info-value">{formatValue(data.capacity)}</div>
                    </div>

                    {/* Access Modes */}
                    <div className="info-item">
                        <div className="info-label">Access Modes</div>
                        <div className="info-value">
                            {data.accessModes.length > 0 ? (
                                <div className="tag-list">
                                    {data.accessModes.map((mode, index) => (
                                        <span key={index} className="tag">{mode}</span>
                                    ))}
                                </div>
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>

                    {/* Reclaim Policy */}
                    <div className="info-item">
                        <div className="info-label">Reclaim Policy</div>
                        <div className="info-value">{formatValue(data.reclaimPolicy)}</div>
                    </div>

                    {/* Storage Class */}
                    <div className="info-item">
                        <div className="info-label">Storage Class</div>
                        <div className="info-value">{formatValue(data.storageClass)}</div>
                    </div>

                    {/* Bound PVC */}
                    {data.boundPVC && (
                        <div className="info-item">
                            <div className="info-label">Bound PVC</div>
                            <div className="info-value">{data.boundPVC}</div>
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
                            {data.creationTimestamp && data.creationTimestamp !== 'Unknown' 
                                ? formatDate(data.creationTimestamp)
                                : 'Unknown'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
