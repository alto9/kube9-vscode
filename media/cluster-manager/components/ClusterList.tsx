import React, { useState, useMemo } from 'react';
import type { ClusterInfo, ClusterCustomizationConfig, FolderConfig } from '../types';
import { ClusterItem } from './ClusterItem';
import { FolderItem } from './FolderItem';
import { DeleteFolderDialog } from './DeleteFolderDialog';

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
    /** Callback function to handle moving a cluster to a folder */
    onMoveCluster?: (contextName: string, folderId: string | null, order: number) => void;
    /** Callback function to handle renaming a folder */
    onRenameFolder?: (folderId: string, newName: string) => void;
    /** Callback function to handle deleting a folder */
    onDeleteFolder?: (folderId: string, moveToRoot: boolean) => void;
    /** Callback function to handle creating a subfolder */
    onCreateSubfolder?: (parentId: string) => void;
    /** Whether to filter to show only hidden clusters */
    showHiddenOnly?: boolean;
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
    folderId: string | null,
    showHiddenOnly?: boolean
): ClusterInfo[] {
    return clusters
        .filter(cluster => {
            const config = customizations.clusters[cluster.contextName];
            // Treat clusters without config as root-level (folderId: null)
            const clusterFolderId = config?.folderId ?? null;
            const matchesFolder = clusterFolderId === folderId;
            
            // Apply visibility filter if enabled
            if (showHiddenOnly) {
                return matchesFolder && config?.hidden === true;
            }
            
            return matchesFolder;
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
 * Count clusters in a folder recursively (including nested folders)
 */
function countClustersInFolder(
    clusters: ClusterInfo[],
    customizations: ClusterCustomizationConfig,
    folderId: string
): number {
    // Get direct clusters in this folder
    const directClusters = getClustersInFolder(clusters, customizations, folderId).length;
    
    // Get child folders
    const childFolders = customizations.folders.filter(f => f.parentId === folderId);
    
    // Recursively count clusters in child folders
    const childClusters = childFolders.reduce((count, childFolder) => {
        return count + countClustersInFolder(clusters, customizations, childFolder.id);
    }, 0);
    
    return directClusters + childClusters;
}

/**
 * ClusterList component displays folders and clusters in a hierarchical structure
 */
export function ClusterList({ clusters, customizations, onSetAlias, onToggleVisibility, searchTerm, onMoveCluster, onRenameFolder, onDeleteFolder, onCreateSubfolder, showHiddenOnly }: ClusterListProps): JSX.Element {
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

    // State for delete folder dialog
    const [deleteDialogFolder, setDeleteDialogFolder] = useState<{ id: string; name: string; clusterCount: number } | null>(null);

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

    const handleRenameFolder = (folderId: string, newName: string): void => {
        if (onRenameFolder) {
            onRenameFolder(folderId, newName);
        }
    };

    const handleDeleteFolderRequest = (folderId: string): void => {
        const folder = customizations.folders.find(f => f.id === folderId);
        if (folder) {
            const clusterCount = countClustersInFolder(clusters, customizations, folderId);
            setDeleteDialogFolder({
                id: folderId,
                name: folder.name,
                clusterCount
            });
        }
    };

    const handleDeleteFolderConfirm = (moveToRoot: boolean): void => {
        if (deleteDialogFolder && onDeleteFolder) {
            onDeleteFolder(deleteDialogFolder.id, moveToRoot);
        }
        setDeleteDialogFolder(null);
    };

    const handleDeleteFolderCancel = (): void => {
        setDeleteDialogFolder(null);
    };

    const handleCreateSubfolder = (parentId: string): void => {
        if (onCreateSubfolder) {
            onCreateSubfolder(parentId);
        }
    };

    /**
     * Recursively render a folder and its children
     */
    const renderFolder = (folder: FolderConfig, level: number): JSX.Element => {
        const childFolders = buildFolderTree(foldersWithExpansion, folder.id);
        const clustersInFolder = getClustersInFolder(clusters, customizations, folder.id, showHiddenOnly);
        const clusterCount = countClustersInFolder(clusters, customizations, folder.id);

        return (
            <FolderItem
                key={folder.id}
                folder={folder}
                level={level}
                onToggleExpand={handleToggleExpand}
                onMoveCluster={onMoveCluster}
                customizations={customizations}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolderRequest}
                onCreateSubfolder={handleCreateSubfolder}
                clusterCount={clusterCount}
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

    // Get root-level folders and clusters
    const rootFolders = buildFolderTree(foldersWithExpansion, null);
    const rootClusters = getClustersInFolder(clusters, customizations, null, showHiddenOnly);

    // Check if we have any clusters or folders to display
    const hasClusters = rootClusters.length > 0 || rootFolders.length > 0 || clusters.length > 0;

    if (!hasClusters && customizations.folders.length === 0) {
        return (
            <div className="cluster-empty-state">
                {showHiddenOnly 
                    ? 'No hidden clusters found'
                    : searchTerm && searchTerm.trim() 
                        ? 'No clusters found' 
                        : 'No clusters found in kubeconfig'}
            </div>
        );
    }

    return (
        <>
            <div className="cluster-list" role="tree" aria-label="Cluster organization tree">
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
            {deleteDialogFolder && (
                <DeleteFolderDialog
                    isOpen={true}
                    folderName={deleteDialogFolder.name}
                    clusterCount={deleteDialogFolder.clusterCount}
                    onConfirm={handleDeleteFolderConfirm}
                    onCancel={handleDeleteFolderCancel}
                />
            )}
        </>
    );
}

