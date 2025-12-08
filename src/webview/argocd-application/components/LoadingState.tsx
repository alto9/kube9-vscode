import React from 'react';

/**
 * Loading state component displayed while fetching application data.
 */
export function LoadingState(): React.JSX.Element {
    return (
        <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--vscode-descriptionForeground)'
        }}>
            <div style={{ marginBottom: '12px' }}>
                <span className="codicon codicon-loading codicon-modifier-spin" style={{ fontSize: '24px' }}></span>
            </div>
            <div>Loading application data...</div>
        </div>
    );
}

