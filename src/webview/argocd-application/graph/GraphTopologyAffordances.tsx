import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    GRAPH_TRUNCATION_AFFORDANCE_MESSAGE,
    LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE,
    shouldShowLimitedTopologyAffordance,
    shouldShowTruncationAffordance
} from './graphTopologyAffordanceRules';

interface GraphTopologyAffordancesProps {
    resourceGraph: ApplicationResourceGraph;
}

export function GraphTopologyAffordances({
    resourceGraph
}: GraphTopologyAffordancesProps): React.JSX.Element | null {
    const showLimited = shouldShowLimitedTopologyAffordance(resourceGraph);
    const showTruncated = shouldShowTruncationAffordance(resourceGraph);

    if (!showLimited && !showTruncated) {
        return null;
    }

    return (
        <div className="argocd-graph-affordances" data-testid="graph-topology-affordances">
            {showLimited && (
                <p
                    className="argocd-graph-affordance argocd-graph-affordance--limited"
                    role="note"
                    data-testid="graph-limited-topology-affordance"
                >
                    <span className="codicon codicon-info" aria-hidden="true" />
                    <span>{LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE}</span>
                </p>
            )}
            {showTruncated && (
                <p
                    className="argocd-graph-affordance argocd-graph-affordance--truncated"
                    role="note"
                    data-testid="graph-truncation-affordance"
                >
                    <span className="codicon codicon-warning" aria-hidden="true" />
                    <span>{GRAPH_TRUNCATION_AFFORDANCE_MESSAGE}</span>
                </p>
            )}
        </div>
    );
}
