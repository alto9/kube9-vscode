import React from 'react';

interface GraphDegradationBannerProps {
    message: string;
}

export function GraphDegradationBanner({ message }: GraphDegradationBannerProps): React.JSX.Element {
    return (
        <div
            className="argocd-graph-degradation-banner"
            data-testid="graph-degradation-banner"
            role="status"
            aria-live="polite"
        >
            <span className="codicon codicon-warning argocd-graph-degradation-banner__icon" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
