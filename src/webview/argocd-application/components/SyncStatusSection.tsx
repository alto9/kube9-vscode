import React from 'react';
import { SyncStatus } from '../../../types/argocd';
import { formatRelativeTime } from '../utils/dateUtils';

interface SyncStatusSectionProps {
    syncStatus: SyncStatus;
    syncedAt?: string;
}

/**
 * Sync status section component displaying sync status, revision, and last sync time.
 */
export function SyncStatusSection({ syncStatus, syncedAt }: SyncStatusSectionProps): React.JSX.Element {
    const sectionStyle: React.CSSProperties = {
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--vscode-panel-border)'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 600,
        margin: '0 0 12px 0',
        color: 'var(--vscode-foreground)'
    };

    const getStatusBadgeStyle = (status: string): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '12px'
        };

        switch (status) {
            case 'Synced':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-testing-iconPassed)',
                    color: 'var(--vscode-foreground)'
                };
            case 'OutOfSync':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-testing-iconQueued)',
                    color: 'var(--vscode-foreground)'
                };
            default:
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-descriptionForeground)',
                    color: 'var(--vscode-foreground)',
                    opacity: 0.6
                };
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'Synced':
                return 'codicon-check';
            case 'OutOfSync':
                return 'codicon-warning';
            default:
                return 'codicon-question';
        }
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '150px 1fr',
        gap: '12px 16px'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontWeight: 500
    };

    const valueStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const revisionStyle: React.CSSProperties = {
        ...valueStyle,
        cursor: 'pointer',
        textDecoration: 'underline',
        textDecorationStyle: 'dashed',
        fontFamily: 'var(--vscode-editor-font-family)'
    };

    const shortRevision = syncStatus.revision.substring(0, 7);

    const handleCopyRevision = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(syncStatus.revision);
            // Could show a toast notification here if needed
        } catch (error) {
            console.error('Failed to copy revision:', error);
        }
    };

    return (
        <div style={sectionStyle}>
            <h3 style={titleStyle}>Sync Status</h3>
            <div style={getStatusBadgeStyle(syncStatus.status)}>
                <span className={getStatusIcon(syncStatus.status)} style={{ fontSize: '14px' }}></span>
                <span>{syncStatus.status}</span>
            </div>
            <div style={gridStyle}>
                <div style={labelStyle}>Current Revision</div>
                <div
                    style={revisionStyle}
                    onClick={handleCopyRevision}
                    title={`Click to copy full SHA: ${syncStatus.revision}`}
                >
                    {shortRevision}
                </div>

                <div style={labelStyle}>Target Revision</div>
                <div style={valueStyle}>{syncStatus.comparedTo.source.targetRevision}</div>

                {syncedAt && (
                    <>
                        <div style={labelStyle}>Last Sync</div>
                        <div style={valueStyle}>{formatRelativeTime(syncedAt)}</div>
                    </>
                )}
            </div>
        </div>
    );
}

