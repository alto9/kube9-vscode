import React from 'react';

interface GraphAssemblyInfoBannerProps {
    message: string;
}

export function GraphAssemblyInfoBanner({ message }: GraphAssemblyInfoBannerProps): React.JSX.Element {
    return (
        <div
            className="argocd-graph-assembly-info-banner"
            data-testid="graph-assembly-info-banner"
            role="note"
            aria-live="polite"
        >
            <span className="codicon codicon-info argocd-graph-assembly-info-banner__icon" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
