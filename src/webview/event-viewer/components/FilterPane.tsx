import React, { useMemo } from 'react';
import { EventFilters, KubernetesEvent } from '../../../types/Events';
import { ResizeHandle } from './ResizeHandle';
import { FilterSection } from './FilterSection';
import { TypeFilter } from './TypeFilter';
import { TimeRangeFilter } from './TimeRangeFilter';
import { NamespaceFilter } from './NamespaceFilter';
import { ResourceTypeFilter } from './ResourceTypeFilter';

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
        flex: '1 1 auto',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: '600px', // Much larger minHeight to fill most of the space
        display: 'block'
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
                position: 'relative',
                height: '100%' // Ensure full height
            }}
        >
            <div className="filter-pane-header" style={{ padding: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                Filters
            </div>
            <div className="filter-sections" style={filterSectionsStyle}>
                <FilterSection title="Type">
                    <TypeFilter
                        selected={filters.type}
                        onChange={(type) => onFilterChange({ ...filters, type })}
                        counts={typeCounts}
                    />
                </FilterSection>
                <FilterSection title="Time Range">
                    <TimeRangeFilter
                        selected={filters.since}
                        onChange={(since) => onFilterChange({ ...filters, since })}
                    />
                </FilterSection>
                <FilterSection title="Namespace">
                    <NamespaceFilter
                        selected={filters.namespace}
                        onChange={(namespace) => onFilterChange({ ...filters, namespace })}
                        events={events}
                    />
                </FilterSection>
                <FilterSection title="Resource Type">
                    <ResourceTypeFilter
                        selected={filters.resourceType}
                        onChange={(resourceType) => onFilterChange({ ...filters, resourceType })}
                        events={events}
                    />
                </FilterSection>
            </div>
            <ResizeHandle
                orientation="vertical"
                onResize={(delta) => onWidthChange(width + delta)}
            />
        </div>
    );
};

