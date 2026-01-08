import React from 'react';
import { ReleaseDetails, HelmRelease, ReleaseStatus } from '../types';

/**
 * Props for ReleaseInfoTab component.
 */
interface ReleaseInfoTabProps {
    /** Release details */
    details: ReleaseDetails;
    /** Original release data */
    release: HelmRelease;
}

/**
 * Get status indicator information.
 */
function getStatusIndicator(status: ReleaseStatus, upgradeAvailable?: string): { emoji: string; label: string; color: string } {
    if (upgradeAvailable) {
        return {
            emoji: '🟡',
            label: 'Upgrade Available',
            color: 'var(--vscode-testing-iconQueued)'
        };
    }
    
    switch (status) {
        case 'deployed':
            return {
                emoji: '🟢',
                label: 'Deployed',
                color: 'var(--vscode-testing-iconPassed)'
            };
        case 'failed':
            return {
                emoji: '🔴',
                label: 'Failed',
                color: 'var(--vscode-testing-iconFailed)'
            };
        case 'pending-install':
        case 'pending-upgrade':
        case 'pending-rollback':
            return {
                emoji: '🟡',
                label: 'Pending',
                color: 'var(--vscode-testing-iconQueued)'
            };
        default:
            return {
                emoji: '⚪',
                label: status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' '),
                color: 'var(--vscode-descriptionForeground)'
            };
    }
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
 * ReleaseInfoTab component.
 * Displays release metadata in a structured format.
 */
export const ReleaseInfoTab: React.FC<ReleaseInfoTabProps> = ({ details, release }) => {
    const statusInfo = getStatusIndicator(details.status, release.upgradeAvailable);

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)'
    };

    const sectionStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        marginBottom: '4px'
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px'
    };

    const infoItemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const labelStyle: React.CSSProperties = {
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '12px',
        fontWeight: 500
    };

    const valueStyle: React.CSSProperties = {
        color: 'var(--vscode-foreground)',
        fontSize: '13px',
        wordBreak: 'break-word'
    };

    const statusBadgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        fontSize: '12px',
        fontWeight: 500,
        width: 'fit-content'
    };

    const descriptionStyle: React.CSSProperties = {
        ...valueStyle,
        padding: '12px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
    };

    const notesStyle: React.CSSProperties = {
        ...valueStyle,
        padding: '12px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'var(--vscode-editor-font-family)'
    };

    return (
        <div style={containerStyle}>
            {/* Basic Information */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Basic Information</h3>
                <div style={gridStyle}>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Release Name</span>
                        <span style={valueStyle}>{details.name}</span>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Namespace</span>
                        <span style={valueStyle}>{details.namespace}</span>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Chart</span>
                        <span style={valueStyle}>{details.chart}</span>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Chart Version</span>
                        <span style={valueStyle}>{details.version}</span>
                    </div>
                    {details.appVersion && (
                        <div style={infoItemStyle}>
                            <span style={labelStyle}>App Version</span>
                            <span style={valueStyle}>{details.appVersion}</span>
                        </div>
                    )}
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Status</span>
                        <div style={statusBadgeStyle}>
                            <span>{statusInfo.emoji}</span>
                            <span>{statusInfo.label}</span>
                        </div>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Revision</span>
                        <span style={valueStyle}>{details.revision}</span>
                    </div>
                    <div style={infoItemStyle}>
                        <span style={labelStyle}>Last Updated</span>
                        <span style={valueStyle}>{formatDate(details.updated)}</span>
                    </div>
                </div>
            </div>

            {/* Description */}
            {details.description && (
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Description</h3>
                    <div style={descriptionStyle}>{details.description}</div>
                </div>
            )}

            {/* Notes */}
            {details.notes && (
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Notes</h3>
                    {details.status === 'failed' && (
                        <div style={{
                            ...notesStyle,
                            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                            border: '1px solid var(--vscode-inputValidation-errorBorder)',
                            color: 'var(--vscode-errorForeground)',
                            marginBottom: '12px',
                            padding: '8px 12px',
                            fontSize: '12px'
                        }}>
                            ⚠️ <strong>Warning:</strong> These notes are from the Helm chart template and may not reflect the current failed state of this release.
                        </div>
                    )}
                    <div style={notesStyle}>{details.notes}</div>
                </div>
            )}
        </div>
    );
};

