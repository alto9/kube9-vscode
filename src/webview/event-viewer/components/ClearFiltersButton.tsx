import React from 'react';

/**
 * Props for ClearFiltersButton component.
 */
interface ClearFiltersButtonProps {
    onClick: () => void;
    disabled: boolean;
}

/**
 * ClearFiltersButton component for clearing all active filters.
 * Disabled when no filters are active.
 */
export const ClearFiltersButton: React.FC<ClearFiltersButtonProps> = ({ onClick, disabled }) => {
    const buttonBaseStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
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

    const disabledStyle: React.CSSProperties = {
        opacity: 0.5
    };

    const buttonStyle = disabled
        ? { ...buttonBaseStyle, ...disabledStyle }
        : buttonBaseStyle;

    return (
        <button
            style={buttonStyle}
            onClick={onClick}
            disabled={disabled}
            title="Clear filters"
            aria-label="Clear filters"
        >
            <span className="codicon codicon-clear-all" style={{ fontSize: '14px' }}></span>
            Clear Filters
        </button>
    );
};

