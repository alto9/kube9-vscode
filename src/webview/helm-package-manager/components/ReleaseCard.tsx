import React from 'react';
import { HelmRelease, ReleaseStatus } from '../types';

/**
 * Props for ReleaseCard component.
 */
interface ReleaseCardProps {
    release: HelmRelease;
    onUpgrade: (release: HelmRelease) => void;
    onViewDetails: (release: HelmRelease) => void;
    onUninstall: (release: HelmRelease) => void;
}

/**
 * ReleaseCard component.
 * Displays a single Helm release with status indicator and action buttons.
 */
export const ReleaseCard: React.FC<ReleaseCardProps> = ({
    release,
    onUpgrade,
    onViewDetails,
    onUninstall
}) => {
    const getStatusIndicator = (status: ReleaseStatus, upgradeAvailable?: string): { emoji: string; label: string; color: string } => {
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
    };

    const statusInfo = getStatusIndicator(release.status, release.upgradeAvailable);
    const hasUpgrade = !!release.upgradeAvailable;

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.2s ease',
        minWidth: '300px'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        margin: 0,
        flex: 1
    };

    const statusBadgeStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        fontSize: '12px',
        fontWeight: 500
    };

    const infoGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        fontSize: '13px'
    };

    const infoItemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    };

    const labelStyle: React.CSSProperties = {
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '12px',
        fontWeight: 500
    };

    const valueStyle: React.CSSProperties = {
        color: 'var(--vscode-foreground)',
        fontSize: '13px'
    };

    const upgradeBadgeStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-testing-iconQueued)',
        color: 'var(--vscode-editor-background)',
        fontSize: '11px',
        fontWeight: 600,
        marginLeft: '8px'
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '4px'
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        transition: 'opacity 0.15s ease, background-color 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    const upgradeButtonStyle: React.CSSProperties = {
        ...primaryButtonStyle,
        border: hasUpgrade ? '2px solid var(--vscode-testing-iconQueued)' : undefined,
        boxShadow: hasUpgrade ? '0 0 0 1px var(--vscode-testing-iconQueued)' : undefined
    };

    const formatDate = (date: Date): string => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return 'Unknown';
        }
        return date.toLocaleString();
    };

    return (
        <div className="release-card" style={cardStyle}>
            <div style={headerStyle}>
                <h3 style={titleStyle}>{release.name}</h3>
                <div style={statusBadgeStyle}>
                    <span>{statusInfo.emoji}</span>
                    <span>{statusInfo.label}</span>
                </div>
            </div>

            <div style={infoGridStyle}>
                <div style={infoItemStyle}>
                    <span style={labelStyle}>Namespace</span>
                    <span style={valueStyle}>{release.namespace || '(default)'}</span>
                </div>
                <div style={infoItemStyle}>
                    <span style={labelStyle}>Chart</span>
                    <span style={valueStyle}>
                        {release.chart}
                        {hasUpgrade && (
                            <span style={upgradeBadgeStyle}>v{release.upgradeAvailable} available</span>
                        )}
                    </span>
                </div>
                <div style={infoItemStyle}>
                    <span style={labelStyle}>Version</span>
                    <span style={valueStyle}>{release.version}</span>
                </div>
                <div style={infoItemStyle}>
                    <span style={labelStyle}>Revision</span>
                    <span style={valueStyle}>{release.revision}</span>
                </div>
                <div style={infoItemStyle}>
                    <span style={labelStyle}>Updated</span>
                    <span style={valueStyle}>{formatDate(release.updated)}</span>
                </div>
            </div>

            <div style={actionsStyle}>
                {hasUpgrade && (
                    <button
                        style={upgradeButtonStyle}
                        onClick={() => onUpgrade(release)}
                        title={`Upgrade to version ${release.upgradeAvailable}`}
                    >
                        <span className="codicon codicon-arrow-up"></span>
                        Upgrade
                    </button>
                )}
                <button
                    style={secondaryButtonStyle}
                    onClick={() => onViewDetails(release)}
                    title="View release details"
                >
                    <span className="codicon codicon-eye"></span>
                    View Details
                </button>
                <button
                    style={secondaryButtonStyle}
                    onClick={() => onUninstall(release)}
                    title="Uninstall release"
                >
                    <span className="codicon codicon-trash"></span>
                    Uninstall
                </button>
            </div>
        </div>
    );
};

