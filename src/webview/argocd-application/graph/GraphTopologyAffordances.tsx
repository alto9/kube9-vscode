import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    getLimitedTopologyAffordanceMessage,
    GRAPH_TRUNCATION_AFFORDANCE_MESSAGE,
    shouldShowLimitedTopologyAffordance,
    shouldShowTruncationAffordance
} from './graphTopologyAffordanceRules';

interface GraphTopologyAffordancesProps {
    resourceGraph: ApplicationResourceGraph;
    hidden?: boolean;
}

export function GraphTopologyAffordances({
    resourceGraph,
    hidden = false
}: GraphTopologyAffordancesProps): React.JSX.Element | null {
    if (hidden) {
        return null;
    }

    const showLimited = shouldShowLimitedTopologyAffordance(resourceGraph);
    const showTruncated = shouldShowTruncationAffordance(resourceGraph);
    const limitedMessage = getLimitedTopologyAffordanceMessage(resourceGraph);

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
                    <span>{limitedMessage}</span>
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
