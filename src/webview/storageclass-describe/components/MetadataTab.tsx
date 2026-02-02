import React from 'react';
import { StorageClassMetadata } from '../../../providers/StorageClassDescribeProvider';

/**
 * Props for MetadataTab component.
 */
interface MetadataTabProps {
    /** StorageClass metadata to display */
    metadata: StorageClassMetadata;
}

/**
 * Metadata tab component that displays StorageClass labels, annotations, and other metadata.
 */
export const MetadataTab: React.FC<MetadataTabProps> = ({ metadata }) => {
    const hasLabels = Object.keys(metadata.labels || {}).length > 0;
    const hasAnnotations = Object.keys(metadata.annotations || {}).length > 0;

    return (
        <div className="metadata-tab">
            {/* Basic Metadata */}
            <div className="section">
                <h2>Basic Information</h2>
                <div className="info-grid">
                    <div className="info-item">
                        <div className="info-label">UID</div>
                        <div className="info-value">{metadata.uid}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Resource Version</div>
                        <div className="info-value">{metadata.resourceVersion}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Creation Timestamp</div>
                        <div className="info-value">{metadata.creationTimestamp}</div>
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="section">
                <h2>Labels</h2>
                {hasLabels ? (
                    <div className="key-value-list">
                        {Object.entries(metadata.labels).map(([key, value]) => (
                            <div key={key} className="key-value-item">
                                <span className="key">{key}</span>
                                <span className="value">{value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-message">No labels</p>
                )}
            </div>

            {/* Annotations */}
            <div className="section">
                <h2>Annotations</h2>
                {hasAnnotations ? (
                    <div className="key-value-list">
                        {Object.entries(metadata.annotations).map(([key, value]) => (
                            <div key={key} className="key-value-item">
                                <span className="key">{key}</span>
                                <span className="value">{value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-message">No annotations</p>
                )}
            </div>
        </div>
    );
};
