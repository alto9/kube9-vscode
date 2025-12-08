import React from 'react';

interface ResourceFilterProps {
    showOnlyOutOfSync: boolean;
    onToggle: (value: boolean) => void;
}

/**
 * Filter component with checkbox to show only out-of-sync resources.
 */
export function ResourceFilter({ showOnlyOutOfSync, onToggle }: ResourceFilterProps): React.JSX.Element {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '8px 0'
    };

    const checkboxStyle: React.CSSProperties = {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
        accentColor: 'var(--vscode-button-background)'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        cursor: 'pointer',
        userSelect: 'none'
    };

    return (
        <div style={containerStyle}>
            <input
                type="checkbox"
                id="showOnlyOutOfSync"
                checked={showOnlyOutOfSync}
                onChange={(e) => onToggle(e.target.checked)}
                style={checkboxStyle}
            />
            <label htmlFor="showOnlyOutOfSync" style={labelStyle}>
                Show only out-of-sync resources
            </label>
        </div>
    );
}

