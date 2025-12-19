import React, { useMemo } from 'react';
import { EventFilters, DEFAULT_EVENT_FILTERS } from '../../../types/Events';

/**
 * Props for StatusBar component.
 */
interface StatusBarProps {
    eventCount: number;
    totalCount: number;
    filters: EventFilters;
    autoRefreshEnabled: boolean;
}

/**
 * Count the number of active (non-default) filters.
 */
const countActiveFilters = (filters: EventFilters): number => {
    let count = 0;
    if (filters.namespace && filters.namespace !== DEFAULT_EVENT_FILTERS.namespace) count++;
    if (filters.type && filters.type !== DEFAULT_EVENT_FILTERS.type) count++;
    if (filters.since && filters.since !== DEFAULT_EVENT_FILTERS.since) count++;
    if (filters.resourceType && filters.resourceType !== DEFAULT_EVENT_FILTERS.resourceType) count++;
    if (filters.searchText && filters.searchText !== DEFAULT_EVENT_FILTERS.searchText) count++;
    return count;
};

/**
 * StatusBar component for Events Viewer.
 * Displays event count, filter status, and auto-refresh state at the bottom of the interface.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
    eventCount,
    totalCount,
    filters,
    autoRefreshEnabled
}) => {
    const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
    const isFiltered = eventCount !== totalCount;

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderTop: '1px solid var(--vscode-statusBar-border)',
        backgroundColor: 'var(--vscode-statusBar-background)',
        color: 'var(--vscode-statusBar-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '12px',
        gap: '12px',
        minHeight: '22px',
        flexShrink: 0
    };

    const itemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
    };

    const separatorStyle: React.CSSProperties = {
        width: '1px',
        height: '16px',
        backgroundColor: 'var(--vscode-statusBar-border)',
        margin: '0 4px'
    };

    return (
        <div className="status-bar" style={containerStyle}>
            <div className="status-item event-count" style={itemStyle}>
                {isFiltered ? `${eventCount} of ${totalCount} events` : `${eventCount} events`}
            </div>
            {activeFilterCount > 0 && (
                <>
                    <div className="status-separator" style={separatorStyle}></div>
                    <div className="status-item filter-count" style={itemStyle}>
                        {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                    </div>
                </>
            )}
            <div className="status-separator" style={separatorStyle}></div>
            <div className="status-item auto-refresh" style={itemStyle}>
                Auto-refresh: {autoRefreshEnabled ? 'On (30s)' : 'Off'}
            </div>
        </div>
    );
};

