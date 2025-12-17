import React, { useState, useEffect, useRef } from 'react';
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
    /** Callback when folder is renamed */
    onRenameFolder?: (folderId: string, newName: string) => void;
    /** Callback when folder delete is requested */
    onDeleteFolder?: (folderId: string) => void;
    /** Callback when new subfolder is requested */
    onCreateSubfolder?: (parentId: string) => void;
    /** Number of clusters in this folder */
    clusterCount?: number;
}

/**
 * FolderItem component displays a folder with expand/collapse functionality
 */
export function FolderItem({ folder, level, onToggleExpand, children, onMoveCluster, customizations, onRenameFolder, onDeleteFolder, onCreateSubfolder, clusterCount = 0 }: FolderItemProps): JSX.Element {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isInvalidDrop, setIsInvalidDrop] = useState(false);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    // Initialize edit value when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            setEditValue(folder.name);
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing, folder.name]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (isContextMenuOpen && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setIsContextMenuOpen(false);
            }
        };

        if (isContextMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isContextMenuOpen]);

    const handleClick = (e: React.MouseEvent): void => {
        // Don't toggle expand if editing
        if (isEditing) {
            return;
        }
        // Don't toggle if clicking on context menu
        if ((e.target as HTMLElement).closest('.folder-context-menu')) {
            return;
        }
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

    const handleContextMenu = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setIsContextMenuOpen(true);
    };

    const handleRenameClick = (): void => {
        setIsContextMenuOpen(false);
        setIsEditing(true);
    };

    const handleNewSubfolderClick = (): void => {
        setIsContextMenuOpen(false);
        if (onCreateSubfolder) {
            onCreateSubfolder(folder.id);
        }
    };

    const handleDeleteClick = (): void => {
        setIsContextMenuOpen(false);
        if (onDeleteFolder) {
            onDeleteFolder(folder.id);
        }
    };

    const handleRenameSave = (): void => {
        const trimmedValue = editValue.trim();
        if (trimmedValue && trimmedValue !== folder.name && onRenameFolder) {
            onRenameFolder(folder.id, trimmedValue);
        }
        setIsEditing(false);
    };

    const handleRenameCancel = (): void => {
        setIsEditing(false);
        setEditValue(folder.name);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleRenameCancel();
        }
    };

    const arrowIcon = '▶'; // Right arrow that will rotate when expanded
    const folderIcon = folder.expanded ? '📂' : '📁';

    return (
        <div className="folder-item">
            <div
                ref={headerRef}
                className={`folder-item-header ${isDragOver ? (isInvalidDrop ? 'drag-over-invalid' : 'drag-over') : ''}`}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="treeitem"
                tabIndex={0}
                aria-expanded={folder.expanded}
                aria-label={`${folder.name} folder${folder.expanded ? ', expanded' : ', collapsed'}`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick(e as unknown as React.MouseEvent);
                    } else if (e.key === 'Delete' && onDeleteFolder) {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                    }
                }}
            >
                <span className={`folder-item-arrow ${folder.expanded ? 'expanded' : ''}`}>{arrowIcon}</span>
                <span className="folder-item-icon">{folderIcon}</span>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="folder-item-name-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameSave}
                        onClick={(e) => e.stopPropagation()}
                        onContextMenu={(e) => e.stopPropagation()}
                        aria-label={`Rename folder ${folder.name}`}
                    />
                ) : (
                    <span className="folder-item-name">{folder.name}</span>
                )}
            </div>
            {isContextMenuOpen && (
                <div
                    ref={contextMenuRef}
                    className="folder-context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`
                    }}
                >
                    <button
                        className="folder-context-menu-item"
                        onClick={handleRenameClick}
                        type="button"
                    >
                        <span className="codicon codicon-edit"></span>
                        Rename Folder
                    </button>
                    <button
                        className="folder-context-menu-item"
                        onClick={handleNewSubfolderClick}
                        type="button"
                    >
                        <span className="codicon codicon-new-folder"></span>
                        New Subfolder
                    </button>
                    <button
                        className="folder-context-menu-item"
                        onClick={handleDeleteClick}
                        type="button"
                    >
                        <span className="codicon codicon-trash"></span>
                        Delete Folder
                    </button>
                </div>
            )}
            {folder.expanded && children && (
                <div className="folder-item-children">
                    {children}
                </div>
            )}
        </div>
    );
}

