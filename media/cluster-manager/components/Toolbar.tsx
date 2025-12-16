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
}

/**
 * Toolbar component contains action buttons and search filter
 */
export function Toolbar({ searchValue, onSearchChange, onSearchClear }: ToolbarProps): JSX.Element {
    return (
        <div className="cluster-manager-toolbar">
            <SearchFilter
                value={searchValue}
                onChange={onSearchChange}
                onClear={onSearchClear}
            />
        </div>
    );
}

