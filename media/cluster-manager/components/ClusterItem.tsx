import React, { useState, useEffect, useRef } from 'react';
import type { ClusterInfo, ClusterConfig } from '../types';

/**
 * Props for ClusterItem component
 */
interface ClusterItemProps {
    /** Cluster information from kubeconfig */
    cluster: ClusterInfo;
    /** Optional customization configuration for this cluster */
    customization?: ClusterConfig;
    /** Callback function to handle setting an alias */
    onSetAlias: (contextName: string, alias: string | null) => void;
    /** Callback function to handle toggling visibility */
    onToggleVisibility: (contextName: string, hidden: boolean) => void;
    /** Optional search term for highlighting matching text */
    searchTerm?: string;
    /** Callback function to handle reordering cluster */
    onReorderCluster?: (contextName: string, newOrder: number) => void;
    /** Folder ID this cluster belongs to (null for root) */
    folderId: string | null;
}

/**
 * Highlights matching text in a string based on search term
 */
function highlightText(text: string, searchTerm: string): JSX.Element {
    if (!searchTerm || !searchTerm.trim()) {
        return <>{text}</>;
    }

    // Escape special regex characters
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                // Check if this part matches the search term (case-insensitive)
                const matches = part.toLowerCase() === searchTerm.toLowerCase() ||
                    new RegExp(escapedSearch, 'i').test(part);
                return matches ? <mark key={i}>{part}</mark> : part;
            })}
        </>
    );
}

/**
 * ClusterItem component displays a single cluster in the list
 */
export function ClusterItem({ cluster, customization, onSetAlias, onToggleVisibility, searchTerm, onReorderCluster, folderId }: ClusterItemProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    // Get display name (alias if exists, otherwise context name)
    const displayName = customization?.alias ?? cluster.contextName;
    const hasAlias = customization?.alias !== null && customization?.alias !== undefined;
    
    // Determine if cluster is hidden (default to false if not set)
    const isHidden = customization?.hidden === true;

    // Initialize edit value when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            setEditValue(displayName);
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing, displayName]);

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

    const handleEditClick = (): void => {
        setIsEditing(true);
    };

    const handleSave = (): void => {
        const trimmedValue = editValue.trim();
        // If empty, remove alias (set to null)
        const aliasToSet = trimmedValue === '' ? null : trimmedValue;
        // If same as original context name, remove alias
        const finalAlias = aliasToSet === cluster.contextName ? null : aliasToSet;
        onSetAlias(cluster.contextName, finalAlias);
        setIsEditing(false);
    };

    const handleCancel = (): void => {
        setIsEditing(false);
        setEditValue(displayName);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const tooltipText = hasAlias ? `Original: ${cluster.contextName}` : '';

    const handleToggleVisibility = (): void => {
        onToggleVisibility(cluster.contextName, !isHidden);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('cluster', cluster.contextName);
            e.dataTransfer.setData('folderId', folderId || '');
            e.dataTransfer.effectAllowed = 'move';
        }
        setIsDragging(true);
    };

    const handleDragEnd = (): void => {
        setIsDragging(false);
        setIsDragOver(false);
        setDropPosition(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        
        const draggedCluster = e.dataTransfer.getData('cluster');
        const draggedFolderId = e.dataTransfer.getData('folderId') || null;
        
        // Only allow reordering within same folder
        if (draggedCluster && draggedCluster !== cluster.contextName && draggedFolderId === (folderId || '')) {
            setIsDragOver(true);
            
            // Determine drop position based on mouse position
            if (itemRef.current) {
                const rect = itemRef.current.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                setDropPosition(e.clientY < midpoint ? 'before' : 'after');
            }
            
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }
        } else {
            setIsDragOver(false);
            setDropPosition(null);
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'none';
            }
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
            setDropPosition(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        
        const draggedCluster = e.dataTransfer.getData('cluster');
        const draggedFolderId = e.dataTransfer.getData('folderId') || null;
        
        setIsDragOver(false);
        setDropPosition(null);
        
        // Only handle reordering within same folder
        if (draggedCluster && draggedCluster !== cluster.contextName && draggedFolderId === (folderId || '') && onReorderCluster) {
            const currentOrder = customization?.order ?? 0;
            const newOrder = dropPosition === 'before' ? currentOrder : currentOrder + 1;
            onReorderCluster(draggedCluster, newOrder);
        }
    };

    const handleContextMenu = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setIsContextMenuOpen(true);
    };

    const handleRenameFromMenu = (): void => {
        setIsContextMenuOpen(false);
        handleEditClick();
    };

    const handleToggleVisibilityFromMenu = (): void => {
        setIsContextMenuOpen(false);
        handleToggleVisibility();
    };

    const ariaLabel = `${displayName} cluster${isHidden ? ', hidden' : ''}${cluster.isActive ? ', active' : ''}`;

    return (
        <div
            ref={itemRef}
            className={`cluster-item ${isHidden ? 'hidden' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver && dropPosition === 'before' ? 'drop-before' : ''} ${isDragOver && dropPosition === 'after' ? 'drop-after' : ''}`}
            title={tooltipText}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            role="treeitem"
            tabIndex={0}
            aria-label={ariaLabel}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !isEditing) {
                    e.preventDefault();
                    handleEditClick();
                }
            }}
        >
            {isEditing ? (
                <>
                    <input
                        ref={inputRef}
                        type="text"
                        className="cluster-item-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSave}
                        maxLength={100}
                        aria-label={`Edit alias for ${cluster.contextName}`}
                    />
                </>
            ) : (
                <>
                    <span className="cluster-item-name" onClick={handleEditClick} style={{ cursor: 'pointer' }} title="Click to edit alias">
                        {highlightText(displayName, searchTerm || '')}
                    </span>
                    <button
                        className="cluster-item-visibility-toggle"
                        onClick={handleToggleVisibility}
                        title={isHidden ? 'Click to show cluster' : 'Click to hide cluster'}
                        aria-label={isHidden ? 'Show cluster' : 'Hide cluster'}
                    >
                        {isHidden ? 'Show' : 'Hide'}
                    </button>
                    <button
                        className="cluster-item-edit-button"
                        onClick={handleEditClick}
                        title="Rename cluster"
                        aria-label="Rename cluster"
                    >
                        Rename
                    </button>
                </>
            )}
            {isHidden && (
                <span className="cluster-item-hidden-badge">Hidden</span>
            )}
            {cluster.isActive && (
                <span className="cluster-item-active-badge">Active</span>
            )}
            {isContextMenuOpen && (
                <div
                    ref={contextMenuRef}
                    className="cluster-context-menu"
                    style={{
                        position: 'fixed',
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`
                    }}
                >
                    <button
                        className="cluster-context-menu-item"
                        onClick={handleRenameFromMenu}
                        type="button"
                    >
                        Rename
                    </button>
                    <button
                        className="cluster-context-menu-item"
                        onClick={handleToggleVisibilityFromMenu}
                        type="button"
                    >
                        {isHidden ? 'Show' : 'Hide'}
                    </button>
                </div>
            )}
        </div>
    );
}

