import React from 'react';
import { getErrorRecoveryHint } from './errorRecoveryHints';

interface GraphErrorStateProps {
    message: string;
}

export function GraphErrorState({ message }: GraphErrorStateProps): React.JSX.Element {
    const recoveryHint = getErrorRecoveryHint(message);

    return (
        <div
            className="argocd-graph-state argocd-graph-state--error"
            data-testid="graph-error-state"
            role="alert"
        >
            <span className="codicon codicon-error argocd-graph-state__icon" aria-hidden="true" />
            <p className="argocd-graph-state__title">Resource graph unavailable</p>
            <p className="argocd-graph-state__detail">{message}</p>
            <p className="argocd-graph-state__hint">{recoveryHint}</p>
        </div>
    );
}
