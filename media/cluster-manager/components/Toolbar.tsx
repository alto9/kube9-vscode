import React from 'react';
import { SearchFilter } from './SearchFilter';

/**
 * Props for Toolbar component
 */
interface ToolbarProps {
    /** Current search value */
    searchValue: string;
    /** Callback when search value changes */
    onSearchChange: (value: string) => void;
    /** Callback when search is cleared */
    onSearchClear: () => void;
    /** Callback when New Folder button is clicked */
    onNewFolderClick: () => void;
}

/**
 * Toolbar component contains action buttons and search filter
 */
export function Toolbar({ searchValue, onSearchChange, onSearchClear, onNewFolderClick }: ToolbarProps): JSX.Element {
    return (
        <div className="cluster-manager-toolbar">
            <button
                className="cluster-manager-toolbar-button"
                onClick={onNewFolderClick}
                title="New Folder"
                aria-label="Create new folder"
            >
                <span className="codicon codicon-new-folder"></span>
                <span>New Folder</span>
            </button>
            <SearchFilter
                value={searchValue}
                onChange={onSearchChange}
                onClear={onSearchClear}
            />
        </div>
    );
}

