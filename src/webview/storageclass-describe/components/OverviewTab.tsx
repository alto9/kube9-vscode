import React from 'react';
import { StorageClassOverview } from '../../../providers/StorageClassDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** StorageClass overview data to display */
    data: StorageClassOverview;
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
 * Overview tab component that displays StorageClass provisioner, reclaim policy, volume binding mode, and other information.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    return (
        <div className="overview-tab">
            <div className="section">
                <h2>Overview</h2>
                <div className="info-grid">
                    {/* Provisioner */}
                    <div className="info-item">
                        <div className="info-label">Provisioner</div>
                        <div className="info-value">{formatValue(data.provisioner)}</div>
                    </div>

                    {/* Reclaim Policy */}
                    <div className="info-item">
                        <div className="info-label">Reclaim Policy</div>
                        <div className="info-value">{formatValue(data.reclaimPolicy)}</div>
                    </div>

                    {/* Volume Binding Mode */}
                    <div className="info-item">
                        <div className="info-label">Volume Binding Mode</div>
                        <div className="info-value">{formatValue(data.volumeBindingMode)}</div>
                    </div>

                    {/* Allow Volume Expansion */}
                    <div className="info-item">
                        <div className="info-label">Allow Volume Expansion</div>
                        <div className="info-value">
                            {data.allowVolumeExpansion ? (
                                <span className="status-badge healthy">Yes</span>
                            ) : (
                                <span className="status-badge degraded">No</span>
                            )}
                        </div>
                    </div>

                    {/* Default Storage Class */}
                    <div className="info-item">
                        <div className="info-label">Default Storage Class</div>
                        <div className="info-value">
                            {data.isDefault ? (
                                <span className="status-badge healthy">Yes</span>
                            ) : (
                                <span className="status-badge degraded">No</span>
                            )}
                        </div>
                    </div>

                    {/* Mount Options */}
                    <div className="info-item">
                        <div className="info-label">Mount Options</div>
                        <div className="info-value">
                            {data.mountOptions.length > 0 ? (
                                <ul className="mount-options-list">
                                    {data.mountOptions.map((option, index) => (
                                        <li key={index}>{option}</li>
                                    ))}
                                </ul>
                            ) : (
                                'N/A'
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
        </div>
    );
};
