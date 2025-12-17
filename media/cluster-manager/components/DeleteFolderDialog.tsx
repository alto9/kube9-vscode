import React, { useEffect, useRef } from 'react';

/**
 * Props for DeleteFolderDialog component
 */
interface DeleteFolderDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Name of the folder to delete */
    folderName: string;
    /** Number of clusters in the folder */
    clusterCount: number;
    /** Callback when delete is confirmed with moveToRoot option */
    onConfirm: (moveToRoot: boolean) => void;
    /** Callback when dialog is cancelled */
    onCancel: () => void;
}

/**
 * DeleteFolderDialog component displays a confirmation dialog for deleting a folder
 */
export function DeleteFolderDialog({
    isOpen,
    folderName,
    clusterCount,
    onConfirm,
    onCancel
}: DeleteFolderDialogProps): JSX.Element | null {
    const moveToRootButtonRef = useRef<HTMLButtonElement>(null);

    // Focus first button when dialog opens
    useEffect(() => {
        if (isOpen && moveToRootButtonRef.current) {
            setTimeout(() => {
                moveToRootButtonRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleMoveToRoot = (): void => {
        onConfirm(true);
    };

    const handleDeleteAll = (): void => {
        onConfirm(false);
    };

    return (
        <div className="delete-folder-dialog-overlay" onClick={onCancel}>
            <div className="delete-folder-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="delete-folder-dialog-header">
                    <h2>Delete Folder</h2>
                </div>
                <div className="delete-folder-dialog-content">
                    <p>
                        The folder <strong>"{folderName}"</strong> contains {clusterCount} cluster{clusterCount !== 1 ? 's' : ''}.
                    </p>
                    <p>What would you like to do with the clusters?</p>
                </div>
                <div className="delete-folder-dialog-actions">
                    <button
                        ref={moveToRootButtonRef}
                        className="delete-folder-dialog-button delete-folder-dialog-button-secondary"
                        onClick={handleMoveToRoot}
                        type="button"
                    >
                        Move to Root
                    </button>
                    <button
                        className="delete-folder-dialog-button delete-folder-dialog-button-secondary"
                        onClick={handleDeleteAll}
                        type="button"
                    >
                        Delete All
                    </button>
                    <button
                        className="delete-folder-dialog-button delete-folder-dialog-button-primary"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

