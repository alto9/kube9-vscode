import React, { useCallback } from 'react';
import { StorageClassUsage, PVCUsageInfo } from '../../../providers/StorageClassDescribeProvider';
import { VSCodeAPI } from '../types';

/**
 * Props for UsageTab component.
 */
interface UsageTabProps {
    /** Usage data showing PVCs using this StorageClass */
    data: StorageClassUsage;
}

/**
 * Get VS Code API from window (set by main app component).
 */
const getVSCodeAPI = (): VSCodeAPI | undefined => {
    if (typeof window !== 'undefined' && (window as any).vscodeApi) {
        return (window as any).vscodeApi;
    }
    return undefined;
};

/**
 * Usage tab component that displays PVCs using this StorageClass.
 * Shows PVC name, namespace, phase, capacity, and bound PV.
 */
export const UsageTab: React.FC<UsageTabProps> = ({ data }) => {
    // Handle navigation to PVC
    const handleNavigateToPVC = useCallback((pvcName: string, pvcNamespace: string) => {
        const vscode = getVSCodeAPI();
        if (vscode) {
            vscode.postMessage({
                command: 'navigateToPVC',
                data: {
                    name: pvcName,
                    namespace: pvcNamespace
                }
            });
        }
    }, []);

    // Handle empty state
    if (data.totalPVCs === 0) {
        return (
            <div className="usage-tab">
                <div className="empty-state">
                    <p>No PVCs are currently using this StorageClass</p>
                    <p className="hint">PVCs that reference this StorageClass will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="usage-tab">
            <div className="section">
                <h2>PVCs Using This StorageClass</h2>
                <p className="section-description">
                    {data.totalPVCs} PVC{data.totalPVCs !== 1 ? 's' : ''} {data.totalPVCs === 1 ? 'is' : 'are'} currently using this StorageClass.
                </p>
                <table className="conditions-table">
                    <thead>
                        <tr>
                            <th>PVC Name</th>
                            <th>Namespace</th>
                            <th>Phase</th>
                            <th>Requested Capacity</th>
                            <th>Actual Capacity</th>
                            <th>Bound PV</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.pvcs.map((pvc: PVCUsageInfo, index: number) => (
                            <tr key={`${pvc.namespace}/${pvc.name}-${index}`}>
                                <td>{pvc.name}</td>
                                <td>{pvc.namespace}</td>
                                <td>
                                    <span className={`phase-badge phase-${pvc.phase.toLowerCase()}`}>
                                        {pvc.phase}
                                    </span>
                                </td>
                                <td>{pvc.requestedCapacity || 'N/A'}</td>
                                <td>{pvc.actualCapacity || 'N/A'}</td>
                                <td>{pvc.boundPV || 'N/A'}</td>
                                <td>
                                    <button
                                        className="link-button"
                                        onClick={() => handleNavigateToPVC(pvc.name, pvc.namespace)}
                                        title={`Navigate to PVC ${pvc.name}`}
                                    >
                                        View PVC
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
