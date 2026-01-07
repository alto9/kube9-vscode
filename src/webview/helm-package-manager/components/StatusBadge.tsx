import React from 'react';
import { OperatorInstallationStatus } from '../types';

/**
 * Props for StatusBadge component.
 */
interface StatusBadgeProps {
    /** Operator installation status */
    status: OperatorInstallationStatus;
}

/**
 * StatusBadge component displays the installation status of the operator.
 * Shows different colors based on status: gray (not installed), green (installed), yellow (update available).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getBadgeContent = (): { text: string; color: string; backgroundColor: string } => {
        if (!status.installed) {
            return {
                text: 'Not Installed',
                color: 'var(--vscode-descriptionForeground)',
                backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)'
            };
        } else if (status.upgradeAvailable && status.latestVersion) {
            return {
                text: `Update Available: v${status.latestVersion}`,
                color: 'var(--vscode-inputValidation-warningForeground)',
                backgroundColor: 'var(--vscode-inputValidation-warningBackground)'
            };
        } else {
            return {
                text: `Installed v${status.version || 'unknown'}`,
                color: 'var(--vscode-testing-iconPassed)',
                backgroundColor: 'var(--vscode-inputValidation-infoBackground)'
            };
        }
    };

    const badgeContent = getBadgeContent();

    const badgeStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '3px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'var(--vscode-font-family)',
        color: badgeContent.color,
        backgroundColor: badgeContent.backgroundColor,
        border: `1px solid ${badgeContent.color}`,
        lineHeight: '1.2'
    };

    return (
        <span style={badgeStyle} aria-label={`Operator status: ${badgeContent.text}`}>
            {badgeContent.text}
        </span>
    );
};

