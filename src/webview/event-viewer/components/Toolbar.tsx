import React from 'react';
import { EventFilters } from '../../../types/Events';

/**
 * Props for Toolbar component.
 */
interface ToolbarProps {
    onRefresh: () => void;
    onExport: (format: 'json' | 'csv') => void;
    onToggleAutoRefresh: () => void;
    autoRefreshEnabled: boolean;
    onFilterChange: (filters: EventFilters) => void;
    filters: EventFilters;
}

/**
 * Toolbar component placeholder.
 * Will be fully implemented in story 013.
 */
export const Toolbar: React.FC<ToolbarProps> = () => {
    return (
        <div className="toolbar">
            <div className="toolbar-placeholder">Toolbar (placeholder)</div>
        </div>
    );
};

