import React from 'react';

interface GraphEmptyStateProps {
    applicationName: string;
}

export const GRAPH_EMPTY_MANAGED_MESSAGE =
    'No managed resources are reported for this Application. Sync or refresh after adding manifests, or verify status.resources on the Application CR.';

export function GraphEmptyState({ applicationName }: GraphEmptyStateProps): React.JSX.Element {
    return (
        <div
            className="argocd-graph-empty-state"
            data-testid="graph-empty-state"
            role="status"
            aria-label={`No managed resources for ${applicationName}. ${GRAPH_EMPTY_MANAGED_MESSAGE}`}
        >
            <span className="codicon codicon-info argocd-graph-empty-state__icon" aria-hidden="true" />
            <p className="argocd-graph-empty-state__title">No managed resources</p>
            <p className="argocd-graph-empty-state__detail">{GRAPH_EMPTY_MANAGED_MESSAGE}</p>
        </div>
    );
}
