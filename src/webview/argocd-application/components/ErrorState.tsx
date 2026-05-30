import React from 'react';
import { getErrorRecoveryHint } from '../graph/errorRecoveryHints';

interface ErrorStateProps {
    message: string;
}

/**
 * Full-panel error state when the Application detail session cannot load.
 */
export function ErrorState({ message }: ErrorStateProps): React.JSX.Element {
    const recoveryHint = getErrorRecoveryHint(message);

    return (
        <div
            className="argocd-app-error-state"
            role="alert"
            data-testid="app-error-state"
        >
            <div className="argocd-app-error-state__header">
                <span className="codicon codicon-error" aria-hidden="true" />
                <strong>Error</strong>
            </div>
            <p className="argocd-app-error-state__message">{message}</p>
            <p className="argocd-app-error-state__hint">{recoveryHint}</p>
        </div>
    );
}
