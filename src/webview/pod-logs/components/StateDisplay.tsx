import React from 'react';

/**
 * Props for LoadingState component.
 */
interface LoadingStateProps {}

/**
 * LoadingState component.
 * Displays a loading spinner and message while logs are being fetched.
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
        <div className="state-display loading" style={containerStyle}>
            <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
            <div style={messageStyle}>Loading logs...</div>
        </div>
    );
};

/**
 * Props for EmptyState component.
 */
interface EmptyStateProps {}

/**
 * EmptyState component.
 * Displays a message when no logs are available.
 */
export const EmptyState: React.FC<EmptyStateProps> = () => {
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
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.6
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)',
        textAlign: 'center',
        maxWidth: '400px'
    };

    const subMessageStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.8,
        textAlign: 'center',
        marginTop: '4px'
    };

    return (
        <div className="state-display empty" style={containerStyle}>
            <span className="codicon codicon-inbox" style={iconStyle}></span>
            <div style={messageStyle}>No logs available</div>
            <div style={subMessageStyle}>This pod hasn't written any logs yet</div>
        </div>
    );
};

/**
 * Props for ErrorState component.
 */
interface ErrorStateProps {
    /** Error message to display */
    error: string;
    /** Callback function when retry button is clicked */
    onRetry: () => void;
}

/**
 * ErrorState component.
 * Displays an error message when log fetching fails.
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
        <div className="state-display error" style={containerStyle}>
            <span className="codicon codicon-error" style={iconStyle}></span>
            <div style={messageStyle}>{error}</div>
            <button style={retryButtonStyle} onClick={onRetry}>
                Retry
            </button>
        </div>
    );
};

