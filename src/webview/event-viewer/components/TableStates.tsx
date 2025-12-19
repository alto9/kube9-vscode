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
        fontSize: '24px',
        animation: 'spin 1s linear infinite'
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)'
    };

    return (
        <div className="loading-state" style={containerStyle}>
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
            <span className="codicon codicon-sync" style={spinnerStyle}></span>
            <div style={messageStyle}>Loading events...</div>
        </div>
    );
};

/**
 * Props for ErrorState component.
 */
interface ErrorStateProps {
    error: string;
}

/**
 * ErrorState component.
 * Displays an error message when event fetching fails.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
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
            <button style={retryButtonStyle} disabled>
                Retry
            </button>
        </div>
    );
};

/**
 * Props for EmptyState component.
 */
interface EmptyStateProps {}

/**
 * EmptyState component.
 * Displays a message when no events are found.
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

    const suggestionStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        opacity: 0.8,
        textAlign: 'center',
        marginTop: '4px'
    };

    return (
        <div className="empty-state" style={containerStyle}>
            <span className="codicon codicon-inbox" style={iconStyle}></span>
            <div style={messageStyle}>No events found</div>
            <div style={suggestionStyle}>Try adjusting your filters or refreshing the events</div>
        </div>
    );
};

