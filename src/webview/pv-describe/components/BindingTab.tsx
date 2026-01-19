import React, { useCallback } from 'react';
import { PVBinding } from '../../../providers/PVDescribeProvider';

/**
 * Props for BindingTab component.
 */
interface BindingTabProps {
    /** PV binding information */
    data: PVBinding;
    /** PV name for navigation context */
    pvName: string;
}

/**
 * Binding tab component that displays PV binding status and bound PVC information.
 */
export const BindingTab: React.FC<BindingTabProps> = ({ data, pvName }) => {
    // Send message to extension to navigate to PVC
    const navigateToPVC = useCallback(() => {
        if (data.boundPVCNamespace && data.boundPVCName) {
            const vscode = (window as any).vscodeApi;
            if (vscode) {
                vscode.postMessage({
                    command: 'navigateToPVC',
                    data: {
                        namespace: data.boundPVCNamespace,
                        name: data.boundPVCName
                    }
                });
            }
        }
    }, [data]);

    return (
        <div className="binding-tab">
            <div className="section">
                <h2>Binding Status</h2>
                <div className="info-grid">
                    <div className="info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                            {data.isBound ? (
                                <span className="status-badge healthy">Bound</span>
                            ) : (
                                <span className="status-badge degraded">Available</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {data.isBound && data.boundPVCNamespace && data.boundPVCName && (
                <div className="section">
                    <h2>Bound PersistentVolumeClaim</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <div className="info-label">Namespace</div>
                            <div className="info-value">{data.boundPVCNamespace}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Name</div>
                            <div className="info-value">
                                <button
                                    className="link-button"
                                    onClick={navigateToPVC}
                                    title={`Navigate to PVC ${data.boundPVCNamespace}/${data.boundPVCName}`}
                                >
                                    {data.boundPVCName}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!data.isBound && (
                <div className="section">
                    <div className="empty-state">
                        <p>This PersistentVolume is not bound to any PersistentVolumeClaim.</p>
                        <p className="hint">It is available for binding when a matching PVC is created.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
