import React from 'react';

interface ErrorStateProps {
    message: string;
}

/**
 * Error state component displayed when application data fails to load.
 */
export function ErrorState({ message }: ErrorStateProps): React.JSX.Element {
    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
            borderRadius: '4px',
            color: 'var(--vscode-errorForeground)',
            marginBottom: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span className="codicon codicon-error" style={{ marginRight: '8px' }}></span>
                <strong>Error</strong>
            </div>
            <div>{message}</div>
        </div>
    );
}

