import React, { useState, useMemo } from 'react';
import type { ClusterInfo, ClusterCustomizationConfig, FolderConfig } from '../types';
import { ClusterItem } from './ClusterItem';
import { FolderItem } from './FolderItem';

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
 * Build folder tree filtered by parent ID and sorted by order
 */
function buildFolderTree(folders: FolderConfig[], parentId: string | null): FolderConfig[] {
    return folders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.order - b.order);
}

/**
 * Get clusters that belong to a specific folder
 */
function getClustersInFolder(
    clusters: ClusterInfo[],
    customizations: ClusterCustomizationConfig,
    folderId: string | null
): ClusterInfo[] {
    return clusters
        .filter(cluster => {
            const config = customizations.clusters[cluster.contextName];
            return config?.folderId === folderId;
        })
        .sort((a, b) => {
            const configA = customizations.clusters[a.contextName];
            const configB = customizations.clusters[b.contextName];
            const orderA = configA?.order ?? 0;
            const orderB = configB?.order ?? 0;
            return orderA - orderB;
        });
}

/**
 * ClusterList component displays folders and clusters in a hierarchical structure
 */
export function ClusterList({ clusters, customizations, onSetAlias, onToggleVisibility, searchTerm }: ClusterListProps): JSX.Element {
    // Local state for folder expansion (UI-only for now, persistence handled in future story)
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        // Initialize with folders that have expanded: true
        const initialExpanded = new Set<string>();
        customizations.folders.forEach(folder => {
            if (folder.expanded) {
                initialExpanded.add(folder.id);
            }
        });
        return initialExpanded;
    });

    // Merge local expansion state with config
    const foldersWithExpansion = useMemo(() => {
        return customizations.folders.map(folder => ({
            ...folder,
            expanded: expandedFolders.has(folder.id)
        }));
    }, [customizations.folders, expandedFolders]);

    const handleToggleExpand = (folderId: string): void => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    /**
     * Recursively render a folder and its children
     */
    const renderFolder = (folder: FolderConfig, level: number): JSX.Element => {
        const childFolders = buildFolderTree(foldersWithExpansion, folder.id);
        const clustersInFolder = getClustersInFolder(clusters, customizations, folder.id);

        return (
            <FolderItem
                key={folder.id}
                folder={folder}
                level={level}
                onToggleExpand={handleToggleExpand}
            >
                {childFolders.map(childFolder => renderFolder(childFolder, level + 1))}
                {clustersInFolder.map(cluster => (
                    <ClusterItem
                        key={cluster.contextName}
                        cluster={cluster}
                        customization={customizations.clusters[cluster.contextName]}
                        onSetAlias={onSetAlias}
                        onToggleVisibility={onToggleVisibility}
                        searchTerm={searchTerm}
                    />
                ))}
            </FolderItem>
        );
    };

    if (clusters.length === 0 && customizations.folders.length === 0) {
        return (
            <div className="cluster-empty-state">
                {searchTerm && searchTerm.trim() ? 'No clusters found' : 'No clusters found in kubeconfig'}
            </div>
        );
    }

    // Get root-level folders and clusters
    const rootFolders = buildFolderTree(foldersWithExpansion, null);
    const rootClusters = getClustersInFolder(clusters, customizations, null);

    return (
        <div className="cluster-list">
            {rootFolders.map(folder => renderFolder(folder, 0))}
            {rootClusters.map(cluster => (
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

