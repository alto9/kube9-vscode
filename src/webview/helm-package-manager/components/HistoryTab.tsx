import React, { useState } from 'react';
import { ReleaseRevision } from '../types';

/**
 * Props for HistoryTab component.
 */
interface HistoryTabProps {
    /** Revision history */
    history: ReleaseRevision[];
    /** Current revision number */
    currentRevision: number;
    /** Callback when rollback button is clicked */
    onRollback: (revision: number) => void;
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Unknown';
    }
    return date.toLocaleString();
}

/**
 * HistoryTab component.
 * Displays revision history with rollback buttons.
 */
export const HistoryTab: React.FC<HistoryTabProps> = ({ history, currentRevision, onRollback }) => {
    const [rollbackHovered, setRollbackHovered] = useState<number | null>(null);

    if (!history || history.length === 0) {
        return (
            <div style={{
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '13px',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '40px 20px'
            }}>
                No revision history available.
            </div>
        );
    }

    // Sort history by revision number (descending)
    const sortedHistory = [...history].sort((a, b) => b.revision - a.revision);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)'
    };

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
    };

    const headerRowStyle: React.CSSProperties = {
        borderBottom: '2px solid var(--vscode-panel-border)'
    };

    const headerCellStyle: React.CSSProperties = {
        padding: '10px 12px',
        textAlign: 'left',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    const rowStyle: React.CSSProperties = {
        borderBottom: '1px solid var(--vscode-panel-border)',
        transition: 'background-color 0.15s ease'
    };

    const currentRowStyle: React.CSSProperties = {
        ...rowStyle,
        backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
        color: 'var(--vscode-list-activeSelectionForeground)'
    };

    const cellStyle: React.CSSProperties = {
        padding: '12px',
        color: 'var(--vscode-foreground)',
        verticalAlign: 'top'
    };

    const currentCellStyle: React.CSSProperties = {
        ...cellStyle,
        color: 'var(--vscode-list-activeSelectionForeground)'
    };

    const revisionBadgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        fontSize: '12px',
        fontWeight: 600
    };

    const currentBadgeStyle: React.CSSProperties = {
        ...revisionBadgeStyle,
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        border: '2px solid var(--vscode-focusBorder)'
    };

    const statusBadgeStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        fontSize: '11px',
        fontWeight: 500
    };

    const rollbackButtonStyle: React.CSSProperties = {
        padding: '4px 10px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        transition: 'background-color 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
    };

    const rollbackButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const descriptionStyle: React.CSSProperties = {
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '12px',
        fontStyle: 'italic',
        marginTop: '4px'
    };

    const currentDescriptionStyle: React.CSSProperties = {
        ...descriptionStyle,
        color: 'var(--vscode-list-activeSelectionForeground)'
    };

    return (
        <div style={containerStyle}>
            <table style={tableStyle}>
                <thead>
                    <tr style={headerRowStyle}>
                        <th style={headerCellStyle}>Revision</th>
                        <th style={headerCellStyle}>Updated</th>
                        <th style={headerCellStyle}>Status</th>
                        <th style={headerCellStyle}>Chart</th>
                        <th style={headerCellStyle}>Description</th>
                        <th style={headerCellStyle}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedHistory.map((revision) => {
                        const isCurrent = revision.revision === currentRevision;
                        const rowStyling = isCurrent ? currentRowStyle : rowStyle;
                        const cellStyling = isCurrent ? currentCellStyle : cellStyle;
                        const descStyling = isCurrent ? currentDescriptionStyle : descriptionStyle;
                        const badgeStyling = isCurrent ? currentBadgeStyle : revisionBadgeStyle;

                        return (
                            <tr key={revision.revision} style={rowStyling}>
                                <td style={cellStyling}>
                                    <div style={badgeStyling}>
                                        {revision.revision}
                                        {isCurrent && ' (current)'}
                                    </div>
                                </td>
                                <td style={cellStyling}>{formatDate(revision.updated)}</td>
                                <td style={cellStyling}>
                                    <span style={statusBadgeStyle}>{revision.status}</span>
                                </td>
                                <td style={cellStyling}>
                                    {revision.chart}
                                    {revision.appVersion && (
                                        <div style={descStyling}>App: {revision.appVersion}</div>
                                    )}
                                </td>
                                <td style={cellStyling}>
                                    {revision.description ? (
                                        <div style={descStyling}>{revision.description}</div>
                                    ) : (
                                        <div style={descStyling}>—</div>
                                    )}
                                </td>
                                <td style={cellStyling}>
                                    {!isCurrent && (
                                        <button
                                            style={
                                                rollbackHovered === revision.revision
                                                    ? { ...rollbackButtonStyle, ...rollbackButtonHoverStyle }
                                                    : rollbackButtonStyle
                                            }
                                            onClick={() => onRollback(revision.revision)}
                                            onMouseEnter={() => setRollbackHovered(revision.revision)}
                                            onMouseLeave={() => setRollbackHovered(null)}
                                            title={`Rollback to revision ${revision.revision}`}
                                        >
                                            <span className="codicon codicon-arrow-left"></span>
                                            Rollback
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

