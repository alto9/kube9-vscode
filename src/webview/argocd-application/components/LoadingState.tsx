import React from 'react';

/**
 * Loading state component displayed while fetching application data.
 */
export function LoadingState(): React.JSX.Element {
    return (
        <div
            className="argocd-app-loading-state"
            role="status"
            aria-live="polite"
            aria-busy="true"
            data-testid="app-loading-state"
        >
            <span
                className="codicon codicon-loading codicon-modifier-spin argocd-app-loading-state__icon"
                aria-hidden="true"
            />
            <div>Loading application data...</div>
        </div>
    );
}

