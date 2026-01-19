import React from 'react';
import { VolumeSourceDetails } from '../../../providers/PVDescribeProvider';

/**
 * Props for SourceDetailsTab component.
 */
interface SourceDetailsTabProps {
    /** Volume source details to display */
    data: VolumeSourceDetails;
}

/**
 * Helper function to format a value, showing "N/A" for empty/null values.
 */
function formatValue(value: string | undefined | null, fallback: string = 'N/A'): string {
    if (!value || value.trim() === '') {
        return fallback;
    }
    return value;
}

/**
 * Source Details tab component that displays volume source type, details, mount options, and node affinity.
 */
export const SourceDetailsTab: React.FC<SourceDetailsTabProps> = ({ data }) => {
    return (
        <div className="source-details-tab">
            <div className="section">
                <h2>Volume Source</h2>
                <div className="info-grid">
                    {/* Volume Source Type */}
                    <div className="info-item">
                        <div className="info-label">Type</div>
                        <div className="info-value">{formatValue(data.type)}</div>
                    </div>
                </div>
            </div>

            {/* Source-Specific Details */}
            {Object.keys(data.details).length > 0 && (
                <div className="section">
                    <h2>Source Details</h2>
                    <div className="info-grid">
                        {Object.entries(data.details).map(([key, value]) => (
                            <div key={key} className="info-item">
                                <div className="info-label">{key}</div>
                                <div className="info-value">{formatValue(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mount Options */}
            {data.mountOptions.length > 0 && (
                <div className="section">
                    <h2>Mount Options</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <div className="info-label">Options</div>
                            <div className="info-value">
                                <div className="tag-list">
                                    {data.mountOptions.map((option, index) => (
                                        <span key={index} className="tag">{option}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Node Affinity */}
            {data.nodeAffinity && (
                <div className="section">
                    <h2>Node Affinity</h2>
                    <div className="info-item">
                        <div className="info-label">Affinity Rules</div>
                        <div className="info-value">
                            <pre className="code-block">{data.nodeAffinity}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
