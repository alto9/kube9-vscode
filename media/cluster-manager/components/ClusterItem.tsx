import React from 'react';
import type { ClusterInfo, ClusterConfig } from '../types';

/**
 * Props for ClusterItem component
 */
interface ClusterItemProps {
    /** Cluster information from kubeconfig */
    cluster: ClusterInfo;
    /** Optional customization configuration for this cluster */
    customization?: ClusterConfig;
}

/**
 * ClusterItem component displays a single cluster in the list
 */
export function ClusterItem({ cluster }: ClusterItemProps): JSX.Element {
    return (
        <div className="cluster-item">
            <span className="cluster-item-name">{cluster.contextName}</span>
            {cluster.isActive && (
                <span className="cluster-item-active-badge">Active</span>
            )}
        </div>
    );
}

