import React from 'react';
import { PodCondition } from '../../providers/PodDescribeProvider';
import { formatRelativeTime } from '../utils/dateUtils';

/**
 * Props for ConditionsTab component.
 */
interface ConditionsTabProps {
    /** Array of Pod conditions to display */
    conditions: PodCondition[];
}

/**
 * Conditions tab component that displays Pod conditions in a table format.
 * Shows condition type, status with color indicators, last transition time,
 * reason, and message. Conditions are sorted by last transition time (most recent first).
 */
export const ConditionsTab: React.FC<ConditionsTabProps> = ({ conditions }) => {
    // Sort conditions by last transition time (most recent first)
    const sortedConditions = [...conditions].sort((a, b) => {
        const timeA = new Date(a.lastTransitionTime).getTime();
        const timeB = new Date(b.lastTransitionTime).getTime();
        return timeB - timeA;
    });

    // Handle empty conditions array
    if (sortedConditions.length === 0) {
        return (
            <div className="conditions-tab">
                <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px' }}>
                    No conditions found for this Pod.
                </p>
            </div>
        );
    }

    return (
        <div className="conditions-tab">
            <table className="conditions-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last Transition</th>
                        <th>Reason</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedConditions.map((condition, index) => (
                        <tr
                            key={`${condition.type}-${index}`}
                            className={condition.status === 'False' ? 'condition-failed' : ''}
                        >
                            <td>{condition.type}</td>
                            <td>
                                <span className={`status-indicator status-${condition.status.toLowerCase()}`}>
                                    {condition.status}
                                </span>
                            </td>
                            <td>{formatRelativeTime(condition.lastTransitionTime)}</td>
                            <td>{condition.reason || '-'}</td>
                            <td>{condition.message || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

