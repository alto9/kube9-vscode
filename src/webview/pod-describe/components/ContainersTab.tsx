import React from 'react';
import type { ContainerInfo } from '../../../providers/PodDescribeProvider';
import { ContainerCard } from './ContainerCard';

/**
 * Props for ContainersTab component.
 */
interface ContainersTabProps {
    /** Regular containers in the Pod */
    containers: ContainerInfo[];
    /** Init containers in the Pod */
    initContainers: ContainerInfo[];
}

/**
 * ContainersTab component displays all containers (init and regular) in the Pod.
 * Separates init containers from regular containers with section headers.
 */
export const ContainersTab: React.FC<ContainersTabProps> = ({ containers, initContainers }) => {
    const totalContainers = containers.length + initContainers.length;

    if (totalContainers === 0) {
        return (
            <div className="containers-tab">
                <div className="empty-state">
                    <p>No containers found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="containers-tab">
            {/* Init Containers Section */}
            {initContainers.length > 0 && (
                <div className="containers-section">
                    <h2 className="section-header">
                        Init Containers ({initContainers.length})
                    </h2>
                    <div className="containers-list">
                        {initContainers.map((container) => (
                            <ContainerCard key={container.name} container={container} />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Containers Section */}
            {containers.length > 0 && (
                <div className="containers-section">
                    <h2 className="section-header">
                        Containers ({containers.length})
                    </h2>
                    <div className="containers-list">
                        {containers.map((container) => (
                            <ContainerCard key={container.name} container={container} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

