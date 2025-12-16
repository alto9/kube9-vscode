import React, { useState, useEffect, useRef } from 'react';
import type { FolderConfig } from '../types';

/**
 * Props for NewFolderDialog component
 */
interface NewFolderDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Array of existing folders */
    folders: FolderConfig[];
    /** Callback when folder is created */
    onCreate: (name: string, parentId: string | null) => void;
    /** Callback when dialog is cancelled */
    onCancel: () => void;
    /** Optional error message to display */
    errorMessage?: string;
}

/**
 * NewFolderDialog component displays a dialog for creating a new folder
 */
export function NewFolderDialog({
    isOpen,
    folders,
    onCreate,
    onCancel,
    errorMessage
}: NewFolderDialogProps): JSX.Element | null {
    const [folderName, setFolderName] = useState<string>('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string>('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setFolderName('');
            setParentId(null);
            setValidationError('');
            // Focus name input when dialog opens
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    // Clear validation error when folder name changes
    useEffect(() => {
        if (validationError) {
            setValidationError('');
        }
    }, [folderName]);

    // Clear error message when dialog closes
    useEffect(() => {
        if (!isOpen && errorMessage) {
            // Error message will be cleared by parent component
        }
    }, [isOpen, errorMessage]);

    if (!isOpen) {
        return null;
    }

    const handleCreate = (): void => {
        const trimmedName = folderName.trim();
        
        // Validate name is not empty
        if (!trimmedName) {
            setValidationError('Folder name cannot be empty');
            nameInputRef.current?.focus();
            return;
        }

        // Clear any previous errors
        setValidationError('');
        
        // Call onCreate callback
        onCreate(trimmedName, parentId);
    };

    const handleCancel = (): void => {
        setFolderName('');
        setParentId(null);
        setValidationError('');
        onCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleCreate();
        }
    };

    // Build folder options for parent selector
    const folderOptions = folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId
    }));

    // Helper function to get folder display name with indentation for nesting
    const getFolderDisplayName = (folder: { id: string; name: string; parentId: string | null }): string => {
        // For now, just return the name (nesting display can be enhanced later)
        return folder.name;
    };

    return (
        <div className="new-folder-dialog-overlay" onClick={handleCancel}>
            <div className="new-folder-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="new-folder-dialog-header">
                    <h2>New Folder</h2>
                </div>
                <div className="new-folder-dialog-content">
                    <div className="new-folder-dialog-field">
                        <label htmlFor="folder-name-input">Folder Name</label>
                        <input
                            id="folder-name-input"
                            ref={nameInputRef}
                            type="text"
                            className={`new-folder-dialog-input ${validationError ? 'error' : ''}`}
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            autoFocus
                        />
                        {validationError && (
                            <div className="new-folder-dialog-error">{validationError}</div>
                        )}
                    </div>
                    <div className="new-folder-dialog-field">
                        <label htmlFor="folder-parent-select">Parent Folder (Optional)</label>
                        <select
                            id="folder-parent-select"
                            className="new-folder-dialog-select"
                            value={parentId || ''}
                            onChange={(e) => setParentId(e.target.value || null)}
                        >
                            <option value="">Root</option>
                            {folderOptions.map(folder => (
                                <option key={folder.id} value={folder.id}>
                                    {getFolderDisplayName(folder)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errorMessage && (
                        <div className="new-folder-dialog-error">{errorMessage}</div>
                    )}
                </div>
                <div className="new-folder-dialog-actions">
                    <button
                        className="new-folder-dialog-button new-folder-dialog-button-secondary"
                        onClick={handleCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className="new-folder-dialog-button new-folder-dialog-button-primary"
                        onClick={handleCreate}
                        type="button"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

