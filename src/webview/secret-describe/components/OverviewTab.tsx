import React from 'react';
import { SecretOverview } from '../../../providers/SecretDescribeProvider';
import { formatDate } from '../../pod-describe/utils/dateUtils';

/**
 * Props for OverviewTab component.
 */
interface OverviewTabProps {
    /** Secret overview data to display */
    data: SecretOverview;
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
 * Overview tab component that displays Secret type, namespace, age, and creation timestamp.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
    return (
        <div className="overview-tab">
            <div className="section">
                <h2>Overview</h2>
                <div className="info-grid">
                    {/* Secret Type */}
                    <div className="info-item">
                        <div className="info-label">Type</div>
                        <div className="info-value">{formatValue(data.type)}</div>
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
                </div>
            </div>
        </div>
    );
};
