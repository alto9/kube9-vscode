import React from 'react';
import { EventFilters } from '../../../types/Events';
import { RefreshButton } from './RefreshButton';
import { AutoRefreshToggle } from './AutoRefreshToggle';
import { ExportButton } from './ExportButton';
import { ClearFiltersButton } from './ClearFiltersButton';

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
 * Toolbar component for Events Viewer.
 * Provides primary actions: refresh, auto-refresh toggle, export, and clear filters.
 */
export const Toolbar: React.FC<ToolbarProps> = ({
    onRefresh,
    onExport,
    onToggleAutoRefresh,
    autoRefreshEnabled,
    onFilterChange,
    filters
}) => {
    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-editor-background)',
        gap: '8px'
    };

    const toolbarLeftStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
    };

    const toolbarRightStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    // Check if any filters are active
    const hasActiveFilters = Object.keys(filters).length > 0 && 
        Object.values(filters).some(value => value !== undefined && value !== '' && value !== 'all');

    return (
        <div className="toolbar" style={toolbarStyle}>
            <div className="toolbar-left" style={toolbarLeftStyle}>
                <RefreshButton onClick={onRefresh} />
                <AutoRefreshToggle 
                    enabled={autoRefreshEnabled}
                    onClick={onToggleAutoRefresh}
                />
                <ExportButton onExport={onExport} />
                <ClearFiltersButton 
                    onClick={() => onFilterChange({})}
                    disabled={!hasActiveFilters}
                />
            </div>
            <div className="toolbar-right" style={toolbarRightStyle}>
                {/* SearchBox will be added in story 014 */}
            </div>
        </div>
    );
};

