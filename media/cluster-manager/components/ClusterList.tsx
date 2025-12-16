import React from 'react';
import type { ClusterInfo, ClusterCustomizationConfig } from '../types';
import { ClusterItem } from './ClusterItem';

/**
 * Props for ClusterList component
 */
interface ClusterListProps {
    /** Array of clusters to display */
    clusters: ClusterInfo[];
    /** Customization configuration */
    customizations: ClusterCustomizationConfig;
    /** Callback function to handle setting an alias */
    onSetAlias: (contextName: string, alias: string | null) => void;
    /** Callback function to handle toggling visibility */
    onToggleVisibility: (contextName: string, hidden: boolean) => void;
    /** Optional search term for highlighting */
    searchTerm?: string;
}

/**
 * ClusterList component displays all clusters in a list
 */
export function ClusterList({ clusters, customizations, onSetAlias, onToggleVisibility, searchTerm }: ClusterListProps): JSX.Element {
    if (clusters.length === 0) {
        return (
            <div className="cluster-empty-state">
                {searchTerm && searchTerm.trim() ? 'No clusters found' : 'No clusters found in kubeconfig'}
            </div>
        );
    }

    return (
        <div className="cluster-list">
            {clusters.map(cluster => (
                <ClusterItem
                    key={cluster.contextName}
                    cluster={cluster}
                    customization={customizations.clusters[cluster.contextName]}
                    onSetAlias={onSetAlias}
                    onToggleVisibility={onToggleVisibility}
                    searchTerm={searchTerm}
                />
            ))}
        </div>
    );
}

