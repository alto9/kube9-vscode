import React from 'react';

/**
 * Props for RefreshButton component.
 */
interface RefreshButtonProps {
    onClick: () => void;
}

/**
 * RefreshButton component for manually refreshing events.
 * Displays a refresh icon and triggers the refresh action when clicked.
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick }) => {
    const buttonStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        transition: 'opacity 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    return (
        <button
            style={buttonStyle}
            onClick={onClick}
            title="Refresh events"
            aria-label="Refresh events"
        >
            <span className="codicon codicon-refresh" style={{ fontSize: '14px' }}></span>
            Refresh
        </button>
    );
};

