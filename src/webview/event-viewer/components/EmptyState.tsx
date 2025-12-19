import React from 'react';

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

