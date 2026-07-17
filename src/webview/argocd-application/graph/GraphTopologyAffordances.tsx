import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    getLimitedTopologyAffordanceMessage,
    LARGE_APP_GROUPING_AFFORDANCE_MESSAGE,
    shouldShowLargeAppGroupingAffordance,
    shouldShowLimitedTopologyAffordance
} from './graphTopologyAffordanceRules';
import {
    GRAPH_FILTER_ZERO_MATCH_MESSAGE,
    shouldShowGraphFilterZeroMatchAffordance,
    type GraphFilterState
} from './argocdGraphFilters';

interface GraphTopologyAffordancesProps {
    resourceGraph: ApplicationResourceGraph;
    hidden?: boolean;
    filters?: GraphFilterState;
}

export function GraphTopologyAffordances({
    resourceGraph,
    hidden = false,
    filters
}: GraphTopologyAffordancesProps): React.JSX.Element | null {
    if (hidden) {
        return null;
    }

    const showLimited = shouldShowLimitedTopologyAffordance(resourceGraph);
    const showGrouped = shouldShowLargeAppGroupingAffordance(resourceGraph);
    const showFilterZeroMatch =
        filters !== undefined && shouldShowGraphFilterZeroMatchAffordance(resourceGraph, filters);
    const limitedMessage = getLimitedTopologyAffordanceMessage(resourceGraph);

    if (!showLimited && !showGrouped && !showFilterZeroMatch) {
        return null;
    }

    return (
        <div className="argocd-graph-affordances" data-testid="graph-topology-affordances">
            {showFilterZeroMatch && (
                <p
                    className="argocd-graph-affordance argocd-graph-affordance--filter-zero-match"
                    role="status"
                    data-testid="graph-filter-zero-match-affordance"
                >
                    <span className="codicon codicon-info" aria-hidden="true" />
                    <span>{GRAPH_FILTER_ZERO_MATCH_MESSAGE}</span>
                </p>
            )}
            {showLimited && (
                <p
                    className="argocd-graph-affordance argocd-graph-affordance--limited"
                    role="note"
                    data-testid="graph-limited-topology-affordance"
                >
                    <span className="codicon codicon-info" aria-hidden="true" />
                    <span>{limitedMessage}</span>
                </p>
            )}
            {showGrouped && (
                <p
                    className="argocd-graph-affordance argocd-graph-affordance--grouped"
                    role="note"
                    data-testid="graph-grouping-affordance"
                >
                    <span className="codicon codicon-info" aria-hidden="true" />
                    <span>{LARGE_APP_GROUPING_AFFORDANCE_MESSAGE}</span>
                </p>
            )}
        </div>
    );
}
