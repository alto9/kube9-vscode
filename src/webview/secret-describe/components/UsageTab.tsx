import React, { useCallback } from 'react';
import { SecretUsage, PodUsageInfo } from '../../../providers/SecretDescribeProvider';
import { VSCodeAPI } from '../types';

/**
 * Props for UsageTab component.
 */
interface UsageTabProps {
    /** Usage data showing Pods using this Secret */
    data: SecretUsage;
    /** Namespace of the Secret */
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
 * Usage tab component that displays Pods using this Secret.
 * Shows Pod name, namespace, phase, and how the Secret is used (env or volume).
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
                    <p>No Pods are currently using this Secret</p>
                    <p className="hint">Pods that reference this Secret via volumes or environment variables will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="usage-tab">
            <div className="section">
                <h2>Pods Using This Secret</h2>
                <p className="section-description">
                    {data.totalPods} Pod{data.totalPods !== 1 ? 's' : ''} {data.totalPods === 1 ? 'is' : 'are'} currently using this Secret.
                </p>
                <table className="conditions-table">
                    <thead>
                        <tr>
                            <th>Pod Name</th>
                            <th>Namespace</th>
                            <th>Phase</th>
                            <th>Usage Type</th>
                            <th>Details</th>
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
                                <td>
                                    <span className={`usage-type-badge usage-${pod.usageType}`}>
                                        {pod.usageType === 'env' ? 'Environment Variable' : 'Volume Mount'}
                                    </span>
                                </td>
                                <td>
                                    {pod.usageType === 'volume' ? (
                                        <>
                                            {pod.mountPath || 'N/A'}
                                            {pod.readOnly !== undefined && (
                                                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                                    ({pod.readOnly ? 'read-only' : 'read-write'})
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        pod.envVarName || 'N/A'
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
