import React from 'react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    getLimitedTopologyAffordanceMessage,
    LARGE_APP_GROUPING_AFFORDANCE_MESSAGE,
    shouldShowLargeAppGroupingAffordance,
    shouldShowLimitedTopologyAffordance
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
    const showGrouped = shouldShowLargeAppGroupingAffordance(resourceGraph);
    const limitedMessage = getLimitedTopologyAffordanceMessage(resourceGraph);

    if (!showLimited && !showGrouped) {
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
