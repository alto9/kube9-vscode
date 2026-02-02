import React from 'react';
import { StorageClassParameters } from '../../../providers/StorageClassDescribeProvider';

/**
 * Props for ParametersTab component.
 */
interface ParametersTabProps {
    /** StorageClass parameters data to display */
    data: StorageClassParameters;
}

/**
 * Parameters tab component that displays provider-specific parameters as key-value pairs.
 */
export const ParametersTab: React.FC<ParametersTabProps> = ({ data }) => {
    const hasParameters = Object.keys(data.parameters || {}).length > 0;

    return (
        <div className="parameters-tab">
            <div className="section">
                <h2>Parameters</h2>
                <p className="section-description">
                    Provider-specific parameters for this StorageClass.
                </p>
                {hasParameters ? (
                    <div className="key-value-list">
                        {Object.entries(data.parameters).map(([key, value]) => (
                            <div key={key} className="key-value-item">
                                <span className="key">{key}</span>
                                <span className="value">{value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No parameters configured</p>
                        <p className="hint">This StorageClass does not have any provider-specific parameters</p>
                    </div>
                )}
            </div>
        </div>
    );
};
