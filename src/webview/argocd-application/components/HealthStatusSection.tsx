import React from 'react';
import { HealthStatus, HealthStatusCode } from '../../../types/argocd';

interface HealthStatusSectionProps {
    healthStatus: HealthStatus;
}

/**
 * Health status section component displaying health status badge and message.
 */
export function HealthStatusSection({ healthStatus }: HealthStatusSectionProps): React.JSX.Element {
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

    const getStatusBadgeStyle = (status: HealthStatusCode): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: healthStatus.message ? '12px' : '0'
        };

        switch (status) {
            case 'Healthy':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-testing-iconPassed)',
                    color: 'var(--vscode-foreground)'
                };
            case 'Degraded':
            case 'Missing':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-testing-iconFailed)',
                    color: 'var(--vscode-foreground)'
                };
            case 'Progressing':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-testing-iconQueued)',
                    color: 'var(--vscode-foreground)'
                };
            case 'Suspended':
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-descriptionForeground)',
                    color: 'var(--vscode-foreground)',
                    opacity: 0.6
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

    const getStatusIcon = (status: HealthStatusCode): string => {
        switch (status) {
            case 'Healthy':
                return 'codicon-heart';
            case 'Degraded':
            case 'Missing':
                return 'codicon-error';
            case 'Progressing':
                return 'codicon-sync';
            case 'Suspended':
                return 'codicon-pause';
            default:
                return 'codicon-question';
        }
    };

    const messageStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        padding: '8px 12px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        borderLeft: '3px solid var(--vscode-panel-border)',
        borderRadius: '2px',
        marginTop: '8px'
    };

    return (
        <div style={sectionStyle}>
            <h3 style={titleStyle}>Health Status</h3>
            <div style={getStatusBadgeStyle(healthStatus.status)}>
                <span className={getStatusIcon(healthStatus.status)} style={{ fontSize: '14px' }}></span>
                <span>{healthStatus.status}</span>
            </div>
            {healthStatus.message && (
                <div style={messageStyle}>{healthStatus.message}</div>
            )}
        </div>
    );
}

