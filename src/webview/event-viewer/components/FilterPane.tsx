import React from 'react';
import { EventFilters, KubernetesEvent } from '../../../types/Events';
import { ResizeHandle } from './ResizeHandle';

/**
 * Props for FilterPane component.
 */
interface FilterPaneProps {
    width: number;
    onWidthChange: (width: number) => void;
    filters: EventFilters;
    onFilterChange: (filters: EventFilters) => void;
    events: KubernetesEvent[];
}

/**
 * FilterPane component stub.
 * Left sidebar containing filter controls.
 * Will be fully implemented in story 017.
 */
export const FilterPane: React.FC<FilterPaneProps> = ({
    width,
    onWidthChange,
    filters,
    onFilterChange,
    events
}) => {
    return (
        <div
            className="filter-pane"
            style={{
                width: `${width}px`,
                flexShrink: 0,
                backgroundColor: 'var(--vscode-sideBar-background)',
                borderRight: '1px solid var(--vscode-panel-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            <div className="filter-pane-header" style={{ padding: '12px', fontWeight: 'bold' }}>
                Filters
            </div>
            <div className="filter-pane-content" style={{ padding: '12px', flex: 1 }}>
                <div>FilterPane (placeholder)</div>
                <div>Events: {events.length}</div>
            </div>
            <ResizeHandle
                orientation="vertical"
                onResize={(delta) => onWidthChange(width + delta)}
            />
        </div>
    );
};

