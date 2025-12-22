import React from 'react';

/**
 * Props for LoadingState component.
 */
interface LoadingStateProps {}

/**
 * LoadingState component.
 * Displays a loading spinner and message while events are being fetched.
 */
export const LoadingState: React.FC<LoadingStateProps> = () => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const spinnerStyle: React.CSSProperties = {
        fontSize: '24px'
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)'
    };

    return (
        <div className="loading-state" style={containerStyle}>
            <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
            <div style={messageStyle}>Loading events...</div>
        </div>
    );
};

