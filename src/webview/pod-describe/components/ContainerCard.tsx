import React, { useState } from 'react';
import type { ContainerInfo } from '../../../providers/PodDescribeProvider';

/**
 * Props for ContainerCard component.
 */
interface ContainerCardProps {
    /** Container information to display */
    container: ContainerInfo;
}

/**
 * ContainerCard component displays detailed information about a single container.
 * Shows status, image, resources, ports, environment variables, and volume mounts.
 */
export const ContainerCard: React.FC<ContainerCardProps> = ({ container }) => {
    const [envExpanded, setEnvExpanded] = useState(false);
    const [volumesExpanded, setVolumesExpanded] = useState(false);

    // Format container status display text
    const getStatusText = (): string => {
        const { state, stateDetails } = container.status;
        
        if (state === 'running') {
            return 'Running';
        } else if (state === 'waiting') {
            const reason = stateDetails.reason || 'Waiting';
            return `Waiting: ${reason}`;
        } else if (state === 'terminated') {
            const reason = stateDetails.reason || 'Terminated';
            const exitCode = stateDetails.exitCode !== undefined ? ` (Exit ${stateDetails.exitCode})` : '';
            return `Terminated: ${reason}${exitCode}`;
        }
        return 'Unknown';
    };

    // Get restart count warning class
    const getRestartCountClass = (): string => {
        if (container.restartCount === 0) {
            return '';
        } else if (container.restartCount >= 10) {
            return 'restart-count-error';
        } else {
            return 'restart-count-warning';
        }
    };

    // Format port display
    const formatPort = (port: typeof container.ports[0]): string => {
        const portStr = `${port.containerPort}/${port.protocol}`;
        if (port.name) {
            const hostPortStr = port.hostPort ? ` → ${port.hostPort}` : '';
            return `${port.name}: ${portStr}${hostPortStr}`;
        }
        const hostPortStr = port.hostPort ? ` → ${port.hostPort}` : '';
        return `${portStr}${hostPortStr}`;
    };

    // Format environment variable display
    const formatEnvVar = (env: typeof container.environment[0]): string => {
        if (env.value !== undefined) {
            return `${env.name} = ${env.value}`;
        } else if (env.valueFrom) {
            const type = env.valueFrom.type;
            const ref = env.valueFrom.reference;
            if (type === 'secret') {
                return `<from-secret: ${ref}>`;
            } else if (type === 'configMap') {
                return `<from-configmap: ${ref}>`;
            } else if (type === 'fieldRef') {
                return `<from-field: ${ref}>`;
            } else if (type === 'resourceFieldRef') {
                return `<from-resource: ${ref}>`;
            }
            return `<from-${type}: ${ref}>`;
        }
        return env.name;
    };

    // Format volume mount display
    const formatVolumeMount = (mount: typeof container.volumeMounts[0]): string => {
        let result = `${mount.name} → ${mount.mountPath}`;
        if (mount.readOnly) {
            result += ' (read-only)';
        }
        if (mount.subPath) {
            result += ` (subPath: ${mount.subPath})`;
        }
        return result;
    };

    return (
        <div className="container-card">
            <div className="container-header">
                <h3>{container.name}</h3>
                <span className={`container-status ${container.status.state}`}>
                    {getStatusText()}
                </span>
            </div>

            <div className="container-details">
                <div className="container-info-item">
                    <label>Image</label>
                    <value>{container.image}</value>
                </div>

                {container.imageID && container.imageID !== 'N/A' && (
                    <div className="container-info-item">
                        <label>Image ID</label>
                        <value className="image-id">{container.imageID}</value>
                    </div>
                )}

                <div className="container-info-item">
                    <label>Ready</label>
                    <value>{container.ready ? 'Yes' : 'No'}</value>
                </div>

                <div className={`container-info-item ${getRestartCountClass()}`}>
                    <label>Restarts</label>
                    <value>
                        {container.restartCount}
                        {container.restartCount > 0 && (
                            <span className="restart-warning-icon" title={`Container has restarted ${container.restartCount} times`}>
                                {' '}⚠️
                            </span>
                        )}
                    </value>
                </div>

                {/* Resources */}
                <div className="container-section">
                    <h4>Resources</h4>
                    <div className="resource-grid">
                        <div className="resource-item">
                            <label>Requests</label>
                            <value>
                                CPU: {container.resources.requests.cpu || 'Not set'}, 
                                Memory: {container.resources.requests.memory || 'Not set'}
                            </value>
                        </div>
                        <div className="resource-item">
                            <label>Limits</label>
                            <value>
                                CPU: {container.resources.limits.cpu || 'Not set'}, 
                                Memory: {container.resources.limits.memory || 'Not set'}
                            </value>
                        </div>
                    </div>
                </div>

                {/* Ports */}
                {container.ports.length > 0 && (
                    <div className="container-section">
                        <h4>Ports</h4>
                        <div className="ports-list">
                            {container.ports.map((port, index) => (
                                <div key={index} className="port-item">
                                    {formatPort(port)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Environment Variables */}
                {container.environment.length > 0 && (
                    <div className="container-section collapsible">
                        <button
                            className="section-toggle"
                            onClick={() => setEnvExpanded(!envExpanded)}
                            aria-expanded={envExpanded}
                        >
                            <h4>Environment Variables ({container.environment.length})</h4>
                            <span className="toggle-icon">{envExpanded ? '▼' : '▶'}</span>
                        </button>
                        {envExpanded && (
                            <div className="section-content">
                                {container.environment.map((env, index) => (
                                    <div key={index} className="env-item">
                                        <code>{formatEnvVar(env)}</code>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Volume Mounts */}
                {container.volumeMounts.length > 0 && (
                    <div className="container-section collapsible">
                        <button
                            className="section-toggle"
                            onClick={() => setVolumesExpanded(!volumesExpanded)}
                            aria-expanded={volumesExpanded}
                        >
                            <h4>Volume Mounts ({container.volumeMounts.length})</h4>
                            <span className="toggle-icon">{volumesExpanded ? '▼' : '▶'}</span>
                        </button>
                        {volumesExpanded && (
                            <div className="section-content">
                                {container.volumeMounts.map((mount, index) => (
                                    <div key={index} className="volume-item">
                                        <code>{formatVolumeMount(mount)}</code>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

