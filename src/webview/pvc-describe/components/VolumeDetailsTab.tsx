import React from 'react';
import { VolumeDetails } from '../../../providers/PVCDescribeProvider';

/**
 * Props for VolumeDetailsTab component.
 */
interface VolumeDetailsTabProps {
    /** Volume details data to display */
    data: VolumeDetails;
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
 * Volume Details tab component that displays PVC volume mode, finalizers, capacity, and access modes.
 */
export const VolumeDetailsTab: React.FC<VolumeDetailsTabProps> = ({ data }) => {
    return (
        <div className="volume-details-tab">
            <div className="section">
                <h2>Volume Details</h2>
                <div className="info-grid">
                    {/* Volume Mode */}
                    <div className="info-item">
                        <div className="info-label">Volume Mode</div>
                        <div className="info-value">{formatValue(data.volumeMode)}</div>
                    </div>

                    {/* Storage Class */}
                    <div className="info-item">
                        <div className="info-label">Storage Class</div>
                        <div className="info-value">{formatValue(data.storageClass)}</div>
                    </div>

                    {/* Requested Capacity */}
                    <div className="info-item">
                        <div className="info-label">Requested Capacity</div>
                        <div className="info-value">{formatValue(data.requestedCapacity)}</div>
                    </div>

                    {/* Actual Capacity */}
                    {data.actualCapacity && (
                        <div className="info-item">
                            <div className="info-label">Actual Capacity</div>
                            <div className="info-value">{formatValue(data.actualCapacity)}</div>
                        </div>
                    )}

                    {/* Access Modes */}
                    <div className="info-item">
                        <div className="info-label">Access Modes</div>
                        <div className="info-value">
                            {data.accessModes.length > 0 ? data.accessModes.join(', ') : 'N/A'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Finalizers */}
            {data.finalizers.length > 0 && (
                <div className="section">
                    <h2>Finalizers</h2>
                    <div className="finalizers-list">
                        {data.finalizers.map((finalizer, index) => (
                            <div key={index} className="finalizer-item">
                                {finalizer}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
