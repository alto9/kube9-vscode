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
}

/**
 * ClusterItem component displays a single cluster in the list
 */
export function ClusterItem({ cluster, customization, onSetAlias, onToggleVisibility }: ClusterItemProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Get display name (alias if exists, otherwise context name)
    const displayName = customization?.alias ?? cluster.contextName;
    const hasAlias = customization?.alias !== null && customization.alias !== undefined;
    
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

    return (
        <div className={`cluster-item ${isHidden ? 'hidden' : ''}`} title={tooltipText}>
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
                    />
                </>
            ) : (
                <>
                    <span className="cluster-item-name">{displayName}</span>
                    <button
                        className="cluster-item-visibility-toggle"
                        onClick={handleToggleVisibility}
                        title={isHidden ? 'Click to show cluster' : 'Click to hide cluster'}
                        aria-label={isHidden ? 'Show cluster' : 'Hide cluster'}
                    >
                        {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                    <button
                        className="cluster-item-edit-button"
                        onClick={handleEditClick}
                        title="Click to edit alias"
                        aria-label="Edit alias"
                    >
                        <span className="codicon codicon-edit"></span>
                    </button>
                </>
            )}
            {isHidden && (
                <span className="cluster-item-hidden-badge">Hidden</span>
            )}
            {cluster.isActive && (
                <span className="cluster-item-active-badge">Active</span>
            )}
        </div>
    );
}

