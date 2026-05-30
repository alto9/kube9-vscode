import React from 'react';

interface GraphLoadingPlaceholderProps {
    applicationName: string;
}

export function GraphLoadingPlaceholder({
    applicationName
}: GraphLoadingPlaceholderProps): React.JSX.Element {
    return (
        <div
            className="argocd-graph-state argocd-graph-state--loading"
            data-testid="graph-loading-placeholder"
            role="status"
            aria-live="polite"
        >
            <span
                className="codicon codicon-loading codicon-modifier-spin argocd-graph-state__icon"
                aria-hidden="true"
            />
            <p className="argocd-graph-state__title">Loading resource graph</p>
            <p className="argocd-graph-state__detail">
                Waiting for topology data for {applicationName}
            </p>
        </div>
    );
}
