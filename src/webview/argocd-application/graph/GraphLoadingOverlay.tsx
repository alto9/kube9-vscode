import React from 'react';

interface GraphLoadingOverlayProps {
    message?: string;
}

export function GraphLoadingOverlay({
    message = 'Updating graph…'
}: GraphLoadingOverlayProps): React.JSX.Element {
    return (
        <div
            className="argocd-graph-loading-overlay"
            data-testid="graph-loading-overlay"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span
                className="codicon codicon-loading codicon-modifier-spin argocd-graph-loading-overlay__icon"
                aria-hidden="true"
            />
            <span className="argocd-graph-loading-overlay__message">{message}</span>
        </div>
    );
}
