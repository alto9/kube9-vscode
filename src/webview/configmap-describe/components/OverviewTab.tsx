import React from 'react';
import { ConfigMapOverview } from '../../../providers/ConfigMapDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** ConfigMap overview data to display */
    data: ConfigMapOverview;
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
 * Overview tab component that displays ConfigMap status, age, immutable status, and data information.
 * Uses an info-grid layout to organize information in a readable format.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    return (
        <div className="overview-tab">
            <div className="section">
                <h2>Overview</h2>
                <div className="info-grid">
                    {/* Name */}
                    <div className="info-item">
                        <div className="info-label">Name</div>
                        <div className="info-value">{formatValue(data.name)}</div>
                    </div>

                    {/* Namespace */}
                    <div className="info-item">
                        <div className="info-label">Namespace</div>
                        <div className="info-value">{formatValue(data.namespace)}</div>
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

                    {/* Immutable Status */}
                    <div className="info-item">
                        <div className="info-label">Immutable</div>
                        <div className="info-value">
                            {data.immutable ? (
                                <span className="immutable-badge">Yes</span>
                            ) : (
                                <span className="mutable-badge">No</span>
                            )}
                        </div>
                    </div>

                    {/* Data Keys */}
                    <div className="info-item">
                        <div className="info-label">Data Keys</div>
                        <div className="info-value">{data.dataKeys}</div>
                    </div>

                    {/* Binary Data Keys */}
                    {data.binaryDataKeys > 0 && (
                        <div className="info-item">
                            <div className="info-label">Binary Data Keys</div>
                            <div className="info-value">{data.binaryDataKeys}</div>
                        </div>
                    )}

                    {/* Data Size */}
                    <div className="info-item">
                        <div className="info-label">Data Size</div>
                        <div className="info-value">{formatValue(data.dataSize)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
