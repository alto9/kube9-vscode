import React from 'react';
import { ResourceQuotaInfo } from '../../../src/providers/NamespaceDescribeProvider';

interface QuotasTabProps {
    /** Resource quota information */
    quotas: ResourceQuotaInfo[];
}

interface QuotaRowProps {
    /** Resource name */
    resource: string;
    /** Hard limit value */
    hard: string;
    /** Current usage value */
    used: string;
    /** Percentage used */
    percent: number;
    /** Progress bar color */
    color: 'blue' | 'yellow' | 'red';
}

/**
 * Individual quota resource row component.
 */
const QuotaRow: React.FC<QuotaRowProps> = ({ resource, hard, used, percent, color }) => {
    const showWarning = percent >= 90;

    return (
        <div className="quota-row">
            <div className="quota-resource-info">
                <div className="quota-resource-name">
                    {showWarning && <span className="warning-icon" aria-label="Approaching quota limit">⚠️</span>}
                    <span>{resource}</span>
                </div>
                <div className="quota-usage-text">
                    {used} / {hard}
                </div>
            </div>
            <div className="quota-percentage">{percent.toFixed(1)}%</div>
            <div className={`progress-bar progress-${color}`}>
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(percent, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${resource} usage: ${percent.toFixed(1)}%`}
                />
            </div>
        </div>
    );
};

/**
 * Quotas tab component displaying resource quotas with usage progress bars.
 */
export const QuotasTab: React.FC<QuotasTabProps> = ({ quotas }) => {
    if (quotas.length === 0) {
        return (
            <div className="quotas-tab">
                <div className="empty-state">
                    <p>No resource quotas configured for this namespace</p>
                    <p className="hint">Resource quotas help limit resource consumption</p>
                </div>
            </div>
        );
    }

    return (
        <div className="quotas-tab">
            {quotas.map(quota => (
                <section key={quota.name} className="quota-section">
                    <h2>{quota.name}</h2>
                    {Object.keys(quota.hard).map(resource => {
                        const percent = quota.percentUsed[resource] || 0;
                        const color = percent >= 100 ? 'red' : percent >= 90 ? 'yellow' : 'blue';
                        
                        return (
                            <QuotaRow
                                key={resource}
                                resource={resource}
                                hard={quota.hard[resource]}
                                used={quota.used[resource] || '0'}
                                percent={percent}
                                color={color}
                            />
                        );
                    })}
                </section>
            ))}
        </div>
    );
};

