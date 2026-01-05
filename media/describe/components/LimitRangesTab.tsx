import React from 'react';
import { LimitRangeInfo, LimitRangeLimit } from '../../../src/providers/NamespaceDescribeProvider';

interface LimitRangesTabProps {
    /** Limit range information */
    limitRanges: LimitRangeInfo[];
}

interface LimitRangeCardProps {
    /** Limit type (Container, Pod, PersistentVolumeClaim) */
    type: 'Container' | 'Pod' | 'PersistentVolumeClaim';
    /** Limit constraint data */
    limit: LimitRangeLimit;
}

/**
 * Format resource values for display.
 * Values come pre-formatted from the provider, so display as-is.
 */
const formatResourceValue = (value: string): string => {
    return value;
};

/**
 * Format constraint label with type prefix.
 */
const getConstraintLabel = (constraintType: string): string => {
    const labels: Record<string, string> = {
        'default': 'Default Limit',
        'defaultRequest': 'Default Request',
        'min': 'Min',
        'max': 'Max',
        'maxLimitRequestRatio': 'Max/Min Ratio'
    };
    return labels[constraintType] || constraintType;
};

/**
 * Get tooltip text for constraint labels.
 */
const getConstraintTooltip = (constraintType: string): string => {
    const tooltips: Record<string, string> = {
        'default': 'Applied if container doesn\'t specify limit',
        'defaultRequest': 'Applied if container doesn\'t specify request',
        'min': 'Minimum value allowed',
        'max': 'Maximum value allowed',
        'maxLimitRequestRatio': 'Maximum limit to request ratio allowed'
    };
    return tooltips[constraintType] || '';
};

/**
 * Get display name for limit type.
 */
const getTypeDisplayName = (type: 'Container' | 'Pod' | 'PersistentVolumeClaim'): string => {
    const names: Record<string, string> = {
        'Container': 'Container Limits',
        'Pod': 'Pod Limits',
        'PersistentVolumeClaim': 'PVC Limits'
    };
    return names[type] || type;
};

/**
 * Render constraint values as a formatted string.
 */
const renderConstraintValues = (values: Record<string, string> | undefined): string => {
    if (!values || Object.keys(values).length === 0) {
        return '—';
    }
    
    return Object.entries(values)
        .map(([resource, value]) => `${resource}: ${formatResourceValue(value)}`)
        .join(', ');
};

/**
 * Individual limit range card component displaying constraints for a specific type.
 */
const LimitRangeCard: React.FC<LimitRangeCardProps> = ({ type, limit }) => {
    const constraints = [
        { key: 'defaultRequest', value: limit.defaultRequest },
        { key: 'default', value: limit.default },
        { key: 'min', value: limit.min },
        { key: 'max', value: limit.max },
        { key: 'maxLimitRequestRatio', value: limit.maxLimitRequestRatio }
    ].filter(constraint => constraint.value && Object.keys(constraint.value).length > 0);

    if (constraints.length === 0) {
        return null;
    }

    return (
        <div className="limit-range-card">
            <h3 className="limit-range-type-heading">{getTypeDisplayName(type)}</h3>
            <table className="limit-range-table">
                <tbody>
                    {constraints.map(constraint => (
                        <tr key={constraint.key} className="limit-range-row">
                            <td className="limit-range-label" title={getConstraintTooltip(constraint.key)}>
                                {getConstraintLabel(constraint.key)}
                            </td>
                            <td className="limit-range-value">
                                {renderConstraintValues(constraint.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/**
 * Limit ranges tab component displaying limit range objects with constraints.
 */
export const LimitRangesTab: React.FC<LimitRangesTabProps> = ({ limitRanges }) => {
    if (limitRanges.length === 0) {
        return (
            <div className="limit-ranges-tab">
                <div className="empty-state">
                    <p>No limit ranges configured for this namespace</p>
                    <p className="hint">Limit ranges enforce default resource limits and constraints</p>
                </div>
            </div>
        );
    }

    return (
        <div className="limit-ranges-tab">
            {limitRanges.map(limitRange => (
                <section key={limitRange.name} className="limit-range-section">
                    <h2>{limitRange.name}</h2>
                    {limitRange.limits.map((limit, idx) => (
                        <LimitRangeCard key={idx} type={limit.type} limit={limit} />
                    ))}
                </section>
            ))}
        </div>
    );
};

