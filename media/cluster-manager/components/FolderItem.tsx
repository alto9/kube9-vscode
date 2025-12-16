import React from 'react';
import type { FolderConfig } from '../types';

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
}

/**
 * FolderItem component displays a folder with expand/collapse functionality
 */
export function FolderItem({ folder, level, onToggleExpand, children }: FolderItemProps): JSX.Element {
    const handleClick = (): void => {
        onToggleExpand(folder.id);
    };

    const arrowIcon = folder.expanded ? 'codicon-chevron-down' : 'codicon-chevron-right';
    const folderIcon = folder.expanded ? 'codicon-folder-opened' : 'codicon-folder';

    return (
        <div className="folder-item">
            <div
                className="folder-item-header"
                style={{ paddingLeft: `${level * 20}px` }}
                onClick={handleClick}
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

