import React, { useCallback } from 'react';
import { ConfigMapUsage, PodUsageInfo } from '../../../providers/ConfigMapDescribeProvider';
import { VSCodeAPI } from '../types';

/**
 * Props for UsageTab component.
 */
interface UsageTabProps {
    /** Usage data showing Pods using this ConfigMap */
    data: ConfigMapUsage;
    /** Namespace of the ConfigMap */
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
 * Format usage type for display.
 */
function formatUsageType(usageType: PodUsageInfo['usageType']): string {
    switch (usageType) {
        case 'volume':
            return 'Volume Mount';
        case 'env':
            return 'Environment Variable';
        case 'envFrom':
            return 'Environment (envFrom)';
        default:
            return 'Unknown';
    }
}

/**
 * Usage tab component that displays Pods using this ConfigMap.
 * Shows Pod name, namespace, phase, usage type, and related details.
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
                    <p>No Pods are currently using this ConfigMap</p>
                    <p className="hint">Pods that reference this ConfigMap will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="usage-tab">
            <div className="section">
                <h2>Pods Using This ConfigMap</h2>
                <p className="section-description">
                    {data.totalPods} Pod{data.totalPods !== 1 ? 's' : ''} {data.totalPods === 1 ? 'is' : 'are'} currently using this ConfigMap.
                </p>
                <table className="conditions-table">
                    <thead>
                        <tr>
                            <th>Pod Name</th>
                            <th>Namespace</th>
                            <th>Phase</th>
                            <th>Usage Type</th>
                            <th>Details</th>
                            <th>Container</th>
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
                                <td>{formatUsageType(pod.usageType)}</td>
                                <td>
                                    {pod.usageType === 'volume' && pod.mountPath && (
                                        <span className="mount-path">{pod.mountPath}</span>
                                    )}
                                    {pod.usageType === 'env' && pod.envVarName && (
                                        <span className="env-var-name">{pod.envVarName}</span>
                                    )}
                                    {pod.usageType === 'envFrom' && (
                                        <span className="env-from">All keys</span>
                                    )}
                                    {!pod.mountPath && !pod.envVarName && pod.usageType !== 'envFrom' && (
                                        <span>N/A</span>
                                    )}
                                </td>
                                <td>{pod.containerName || 'N/A'}</td>
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
