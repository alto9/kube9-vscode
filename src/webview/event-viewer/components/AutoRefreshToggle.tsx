import React from 'react';

/**
 * Props for AutoRefreshToggle component.
 */
interface AutoRefreshToggleProps {
    enabled: boolean;
    onClick: () => void;
}

/**
 * AutoRefreshToggle component for toggling auto-refresh on/off.
 * Shows current state and allows users to enable/disable automatic event refreshing.
 */
export const AutoRefreshToggle: React.FC<AutoRefreshToggleProps> = ({ enabled, onClick }) => {
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
        backgroundColor: enabled
            ? 'var(--vscode-button-background)'
            : 'var(--vscode-button-secondaryBackground)',
        color: enabled
            ? 'var(--vscode-button-foreground)'
            : 'var(--vscode-button-secondaryForeground)',
        opacity: enabled ? 1 : 0.8
    };

    const iconClass = enabled ? 'codicon-debug-pause' : 'codicon-debug-start';
    const stateText = enabled ? 'On' : 'Off';

    return (
        <button
            style={buttonStyle}
            onClick={onClick}
            title={`Auto-refresh: ${stateText}`}
            aria-label={`Auto-refresh: ${stateText}`}
            aria-pressed={enabled}
        >
            <span className={`codicon ${iconClass}`} style={{ fontSize: '14px' }}></span>
            Auto-refresh: {stateText}
        </button>
    );
};

