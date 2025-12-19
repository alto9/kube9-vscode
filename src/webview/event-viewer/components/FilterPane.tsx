import React, { useMemo } from 'react';
import { EventFilters, KubernetesEvent } from '../../../types/Events';
import { ResizeHandle } from './ResizeHandle';
import { FilterSection } from './FilterSection';

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
 * FilterPane component.
 * Left sidebar containing filter controls organized in collapsible sections.
 */
export const FilterPane: React.FC<FilterPaneProps> = ({
    width,
    onWidthChange,
    filters,
    onFilterChange,
    events
}) => {
    // Calculate filter counts from events using useMemo for performance
    const typeCounts = useMemo(() => {
        return {
            Normal: events.filter(e => e.type === 'Normal').length,
            Warning: events.filter(e => e.type === 'Warning').length,
            Error: events.filter(e => e.type === 'Error').length
        };
    }, [events]);

    const filterSectionsStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden'
    };

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
            <div className="filter-sections" style={filterSectionsStyle}>
                <FilterSection title="Type">
                    {/* TypeFilter component will be added in story 018 */}
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        Type filter (to be implemented)
                    </div>
                </FilterSection>
                <FilterSection title="Time Range">
                    {/* TimeRangeFilter component will be added in story 018 */}
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        Time range filter (to be implemented)
                    </div>
                </FilterSection>
                <FilterSection title="Namespace">
                    {/* NamespaceFilter component will be added in story 018 */}
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        Namespace filter (to be implemented)
                    </div>
                </FilterSection>
                <FilterSection title="Resource Type">
                    {/* ResourceTypeFilter component will be added in story 018 */}
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                        Resource type filter (to be implemented)
                    </div>
                </FilterSection>
            </div>
            <ResizeHandle
                orientation="vertical"
                onResize={(delta) => onWidthChange(width + delta)}
            />
        </div>
    );
};

