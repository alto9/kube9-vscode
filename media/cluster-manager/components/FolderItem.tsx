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
    /** Callback when folder is reordered */
    onReorderFolder?: (folderId: string, newParentId: string | null, newOrder: number) => void;
    /** Number of clusters in this folder */
    clusterCount?: number;
}

/**
 * FolderItem component displays a folder with expand/collapse functionality
 */
export function FolderItem({ folder, level, onToggleExpand, children, onMoveCluster, customizations, onRenameFolder, onDeleteFolder, onCreateSubfolder, onReorderFolder, clusterCount = 0 }: FolderItemProps): JSX.Element {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isInvalidDrop, setIsInvalidDrop] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
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

    const handleFolderDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('folder', folder.id);
            e.dataTransfer.setData('folderParentId', folder.parentId || '');
            e.dataTransfer.effectAllowed = 'move';
        }
        setIsDragging(true);
        e.stopPropagation();
    };

    const handleFolderDragEnd = (): void => {
        setIsDragging(false);
        setIsDragOver(false);
        setDropPosition(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        
        const draggedFolder = e.dataTransfer.getData('folder');
        const contextName = e.dataTransfer.getData('cluster');
        
        if (draggedFolder) {
            // Folder being dragged
            if (draggedFolder === folder.id) {
                // Can't drop on self
                setIsDragOver(false);
                setIsInvalidDrop(true);
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'none';
                }
                return;
            }
            
            // Determine drop position based on mouse position
            if (headerRef.current) {
                const rect = headerRef.current.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const height = rect.height;
                
                if (relativeY < height * 0.25) {
                    setDropPosition('before');
                } else if (relativeY > height * 0.75) {
                    setDropPosition('after');
                } else {
                    setDropPosition('inside');
                }
            }
            
            setIsDragOver(true);
            setIsInvalidDrop(false);
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }
        } else if (contextName) {
            // Cluster being dragged
            let isValid = true;
            
            if (customizations) {
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
            setDropPosition('inside');
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if we're leaving the folder header itself, not a child
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
            setIsInvalidDrop(false);
            setDropPosition(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setIsInvalidDrop(false);
        const currentDropPosition = dropPosition;
        setDropPosition(null);

        const draggedFolder = e.dataTransfer.getData('folder');
        const contextName = e.dataTransfer.getData('cluster');

        if (draggedFolder && onReorderFolder) {
            // Folder being dropped
            if (draggedFolder === folder.id) {
                // Can't drop on self
                return;
            }

            if (currentDropPosition === 'inside') {
                // Drop inside folder (make it a child)
                onReorderFolder(draggedFolder, folder.id, 0);
            } else if (currentDropPosition === 'before') {
                // Drop before folder (same parent, order before this folder)
                onReorderFolder(draggedFolder, folder.parentId, folder.order);
            } else if (currentDropPosition === 'after') {
                // Drop after folder (same parent, order after this folder)
                onReorderFolder(draggedFolder, folder.parentId, folder.order + 1);
            }
        } else if (contextName && onMoveCluster) {
            // Cluster being dropped
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
        }
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
                className={`folder-item-header ${isDragOver ? (isInvalidDrop ? 'drag-over-invalid' : 'drag-over') : ''} ${isDragging ? 'dragging' : ''} ${dropPosition === 'before' ? 'drop-before' : ''} ${dropPosition === 'after' ? 'drop-after' : ''} ${dropPosition === 'inside' ? 'drop-inside' : ''}`}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                draggable={true}
                onDragStart={handleFolderDragStart}
                onDragEnd={handleFolderDragEnd}
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
                    <>
                        <span className="folder-item-name">{folder.name}</span>
                        <button
                            className="folder-item-rename-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRenameClick();
                            }}
                            title="Rename folder"
                            aria-label="Rename folder"
                            type="button"
                        >
                            Rename
                        </button>
                    </>
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
                        Rename Folder
                    </button>
                    <button
                        className="folder-context-menu-item"
                        onClick={handleNewSubfolderClick}
                        type="button"
                    >
                        New Subfolder
                    </button>
                    <button
                        className="folder-context-menu-item"
                        onClick={handleDeleteClick}
                        type="button"
                    >
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

