import React, { useCallback } from 'react';
import { PVCUsage, PodUsageInfo } from '../../../providers/PVCDescribeProvider';
import { VSCodeAPI } from '../types';

/**
 * Props for UsageTab component.
 */
interface UsageTabProps {
    /** Usage data showing Pods using this PVC */
    data: PVCUsage;
    /** Namespace of the PVC */
    namespace: string;
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
 * Usage tab component that displays Pods using this PVC.
 * Shows Pod name, namespace, phase, mount path, and read-only status.
 */
export const UsageTab: React.FC<UsageTabProps> = ({ data, namespace }) => {
    // Handle navigation to Pod
    const handleNavigateToPod = useCallback((podName: string, podNamespace: string) => {
        const vscode = getVSCodeAPI();
        if (vscode) {
            vscode.postMessage({
                command: 'navigateToPod',
                data: {
                    name: podName,
                    namespace: podNamespace
                }
            });
        }
    }, []);

    // Handle empty state
    if (data.totalPods === 0) {
        return (
            <div className="usage-tab">
                <div className="empty-state">
                    <p>No Pods are currently using this PVC</p>
                    <p className="hint">Pods that mount this PVC will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="usage-tab">
            <div className="section">
                <h2>Pods Using This PVC</h2>
                <p className="section-description">
                    {data.totalPods} Pod{data.totalPods !== 1 ? 's' : ''} {data.totalPods === 1 ? 'is' : 'are'} currently using this PersistentVolumeClaim.
                </p>
                <table className="conditions-table">
                    <thead>
                        <tr>
                            <th>Pod Name</th>
                            <th>Namespace</th>
                            <th>Phase</th>
                            <th>Mount Path</th>
                            <th>Read-Only</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.pods.map((pod: PodUsageInfo, index: number) => (
                            <tr key={`${pod.namespace}/${pod.name}-${index}`}>
                                <td>{pod.name}</td>
                                <td>{pod.namespace}</td>
                                <td>
                                    <span className={`phase-badge phase-${pod.phase.toLowerCase()}`}>
                                        {pod.phase}
                                    </span>
                                </td>
                                <td>{pod.mountPath || 'N/A'}</td>
                                <td>
                                    {pod.readOnly ? (
                                        <span className="read-only-badge">Yes</span>
                                    ) : (
                                        <span className="read-write-badge">No</span>
                                    )}
                                </td>
                                <td>
                                    <button
                                        className="link-button"
                                        onClick={() => handleNavigateToPod(pod.name, pod.namespace)}
                                        title={`Navigate to Pod ${pod.name}`}
                                    >
                                        View Pod
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
