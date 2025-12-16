import React, { useState } from 'react';
import type { FolderConfig, ClusterCustomizationConfig } from '../types';

/**
 * Props for FolderItem component
 */
interface FolderItemProps {
    /** Folder configuration */
    folder: FolderConfig;
    /** Nesting level (0 for root) */
    level: number;
    /** Callback when folder expand/collapse is toggled */
    onToggleExpand: (folderId: string) => void;
    /** Child elements (subfolders and clusters) */
    children?: React.ReactNode;
    /** Callback when cluster is moved to this folder */
    onMoveCluster?: (contextName: string, folderId: string | null, order: number) => void;
    /** Customization configuration for calculating order */
    customizations?: ClusterCustomizationConfig;
}

/**
 * FolderItem component displays a folder with expand/collapse functionality
 */
export function FolderItem({ folder, level, onToggleExpand, children, onMoveCluster, customizations }: FolderItemProps): JSX.Element {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isInvalidDrop, setIsInvalidDrop] = useState(false);

    const handleClick = (): void => {
        onToggleExpand(folder.id);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if cluster is already in this folder
        const contextName = e.dataTransfer.getData('cluster');
        let isValid = true;
        
        if (contextName && customizations) {
            const clusterConfig = customizations.clusters[contextName];
            if (clusterConfig && clusterConfig.folderId === folder.id) {
                // Cluster is already in this folder - invalid drop
                isValid = false;
            }
        }
        
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
        }
        
        setIsDragOver(true);
        setIsInvalidDrop(!isValid);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if we're leaving the folder header itself, not a child
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
            setIsInvalidDrop(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setIsInvalidDrop(false);

        if (!onMoveCluster) {
            return;
        }

        const contextName = e.dataTransfer.getData('cluster');
        if (!contextName) {
            return;
        }

        // Validate: don't drop if cluster is already in this folder
        if (customizations) {
            const clusterConfig = customizations.clusters[contextName];
            if (clusterConfig && clusterConfig.folderId === folder.id) {
                // Already in this folder - ignore drop
                return;
            }
        }

        // Calculate order: get max order in folder + 1
        let maxOrder = -1;
        if (customizations) {
            Object.values(customizations.clusters).forEach(config => {
                if (config.folderId === folder.id && config.order > maxOrder) {
                    maxOrder = config.order;
                }
            });
        }
        const order = maxOrder + 1;

        onMoveCluster(contextName, folder.id, order);
    };

    const arrowIcon = folder.expanded ? 'codicon-chevron-down' : 'codicon-chevron-right';
    const folderIcon = folder.expanded ? 'codicon-folder-opened' : 'codicon-folder';

    return (
        <div className="folder-item">
            <div
                className={`folder-item-header ${isDragOver ? (isInvalidDrop ? 'drag-over-invalid' : 'drag-over') : ''}`}
                style={{ paddingLeft: `${level * 20}px` }}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-expanded={folder.expanded}
                aria-label={`${folder.name} folder`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <span className={`codicon ${arrowIcon} folder-item-arrow`}></span>
                <span className={`codicon ${folderIcon} folder-item-icon`}></span>
                <span className="folder-item-name">{folder.name}</span>
            </div>
            {folder.expanded && children && (
                <div className="folder-item-children">
                    {children}
                </div>
            )}
        </div>
    );
}

