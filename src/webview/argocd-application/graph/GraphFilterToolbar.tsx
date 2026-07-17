import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import type { SyncStatusCode } from '../../../types/argocd';
import {
    collectDistinctKindsFromGraph,
    graphFilterChipAriaPressed,
    hasActiveGraphFilters,
    SYNC_FILTER_OPTIONS,
    toggleGraphFilterKind,
    toggleGraphFilterSyncStatus,
    type GraphFilterState
} from './argocdGraphFilters';

interface GraphFilterToolbarProps {
    resourceGraph: ApplicationResourceGraph;
    filters: GraphFilterState;
    onNameQueryChange: (value: string) => void;
    onToggleKind: (kind: string) => void;
    onToggleSyncStatus: (syncStatus: SyncStatusCode) => void;
    onClearFilters: () => void;
}

export { toggleGraphFilterKind, toggleGraphFilterSyncStatus };

export function GraphFilterToolbar({
    resourceGraph,
    filters,
    onNameQueryChange,
    onToggleKind,
    onToggleSyncStatus,
    onClearFilters
}: GraphFilterToolbarProps): React.JSX.Element {
    const kinds = collectDistinctKindsFromGraph(resourceGraph);
    const filtersActive = hasActiveGraphFilters(filters);

    return (
        <div className="argocd-graph-toolbar__filters" data-testid="graph-filter-toolbar">
            <label className="argocd-graph-filter-search">
                <span className="argocd-graph-filter-search__label">Filter resources by name</span>
                <input
                    type="search"
                    className="argocd-graph-filter-search__input"
                    data-testid="graph-filter-name-search"
                    aria-label="Filter resources by name"
                    value={filters.nameQuery}
                    onChange={(event) => onNameQueryChange(event.target.value)}
                />
            </label>
            <div
                className="argocd-graph-filter-chips"
                role="group"
                aria-label="Filter by kind"
                data-testid="graph-filter-kind-chips"
            >
                {kinds.map((kind) => {
                    const selected = filters.selectedKinds.has(kind);
                    return (
                        <button
                            key={kind}
                            type="button"
                            className={[
                                'argocd-graph-filter-chip',
                                selected ? 'argocd-graph-filter-chip--selected' : ''
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-pressed={graphFilterChipAriaPressed(selected)}
                            onClick={() => onToggleKind(kind)}
                        >
                            {kind}
                        </button>
                    );
                })}
            </div>
            <div
                className="argocd-graph-filter-chips"
                role="group"
                aria-label="Filter by sync status"
                data-testid="graph-filter-sync-chips"
            >
                {SYNC_FILTER_OPTIONS.map((syncStatus) => {
                    const selected = filters.selectedSyncStatuses.has(syncStatus);
                    return (
                        <button
                            key={syncStatus}
                            type="button"
                            className={[
                                'argocd-graph-filter-chip',
                                selected ? 'argocd-graph-filter-chip--selected' : ''
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            aria-pressed={graphFilterChipAriaPressed(selected)}
                            onClick={() => onToggleSyncStatus(syncStatus)}
                        >
                            {syncStatus}
                        </button>
                    );
                })}
            </div>
            {filtersActive && (
                <button
                    type="button"
                    className="argocd-graph-toolbar__button argocd-graph-filter-clear"
                    data-testid="graph-filter-clear"
                    onClick={onClearFilters}
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
