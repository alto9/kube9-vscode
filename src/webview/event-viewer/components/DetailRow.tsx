import React from 'react';

/**
 * Props for DetailRow component.
 */
interface DetailRowProps {
    label: string;
    value: string;
}

/**
 * DetailRow component.
 * Displays a label-value pair in a consistent format.
 * Used for displaying event details in the EventDetails pane.
 */
export const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => {
    const rowStyle: React.CSSProperties = {
        display: 'flex',
        padding: '8px 12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '13px'
    };

    const labelStyle: React.CSSProperties = {
        minWidth: '140px',
        fontWeight: 500,
        color: 'var(--vscode-descriptionForeground)',
        flexShrink: 0
    };

    const valueStyle: React.CSSProperties = {
        flex: 1,
        color: 'var(--vscode-foreground)',
        wordBreak: 'break-word'
    };

    return (
        <div className="detail-row" style={rowStyle}>
            <div className="detail-label" style={labelStyle}>
                {label}:
            </div>
            <div className="detail-value" style={valueStyle}>
                {value}
            </div>
        </div>
    );
};

