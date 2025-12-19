import React from 'react';

/**
 * Props for ErrorState component.
 */
interface ErrorStateProps {
    error: string;
    onRetry?: () => void;
}

/**
 * ErrorState component.
 * Displays an error message when event fetching fails.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        padding: '24px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '32px',
        color: 'var(--vscode-errorForeground)'
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-errorForeground)',
        textAlign: 'center',
        maxWidth: '400px'
    };

    const retryButtonStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        marginTop: '8px'
    };

    return (
        <div className="error-state" style={containerStyle}>
            <span className="codicon codicon-error" style={iconStyle}></span>
            <div style={messageStyle}>{error}</div>
            {onRetry && (
                <button style={retryButtonStyle} onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
};

