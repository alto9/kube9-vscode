import React from 'react';
import { ArgoCDResource, HealthStatusCode } from '../../../types/argocd';

interface ResourceRowProps {
    resource: ArgoCDResource;
    isExpanded: boolean;
    onToggle: () => void;
    onNavigate: (kind: string, name: string, namespace: string) => void;
}

/**
 * Expandable table row component displaying resource details.
 */
export function ResourceRow({ resource, isExpanded, onToggle, onNavigate }: ResourceRowProps): React.JSX.Element {
    const getSyncStatusBadgeStyle = (status: string): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 500
        };

        if (status === 'OutOfSync') {
            return {
                ...baseStyle,
                backgroundColor: 'var(--vscode-testing-iconQueued)',
                color: 'var(--vscode-foreground)'
            };
        } else {
            return {
                ...baseStyle,
                backgroundColor: 'var(--vscode-testing-iconPassed)',
                color: 'var(--vscode-foreground)'
            };
        }
    };

    const getHealthStatusBadgeStyle = (status?: HealthStatusCode): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 500
        };

        if (!status) {
            return {
                ...baseStyle,
                backgroundColor: 'var(--vscode-descriptionForeground)',
                color: 'var(--vscode-foreground)',
                opacity: 0.6
            };
        }

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
            default:
                return {
                    ...baseStyle,
                    backgroundColor: 'var(--vscode-descriptionForeground)',
                    color: 'var(--vscode-foreground)',
                    opacity: 0.6
                };
        }
    };

    const getSyncStatusIcon = (status: string): string => {
        return status === 'OutOfSync' ? 'codicon-warning' : 'codicon-check';
    };

    const rowStyle: React.CSSProperties = {
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: resource.syncStatus === 'OutOfSync' 
            ? 'var(--vscode-testing-iconQueued)' 
            : 'transparent',
        opacity: resource.syncStatus === 'OutOfSync' ? 0.15 : 1,
        cursor: 'pointer'
    };

    const cellStyle: React.CSSProperties = {
        padding: '12px 16px',
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        verticalAlign: 'middle'
    };

    const nameCellStyle: React.CSSProperties = {
        ...cellStyle,
        color: 'var(--vscode-textLink-foreground)',
        textDecoration: 'underline',
        cursor: 'pointer'
    };

    const expandCellStyle: React.CSSProperties = {
        ...cellStyle,
        width: '32px',
        textAlign: 'center'
    };

    const expandedContentStyle: React.CSSProperties = {
        padding: '12px 16px 12px 48px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        borderTop: '1px solid var(--vscode-panel-border)',
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        lineHeight: '1.5'
    };

    const handleNameClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
        onNavigate(resource.kind, resource.name, resource.namespace);
    };

    return (
        <>
            <tr style={rowStyle} onClick={onToggle}>
                <td style={expandCellStyle}>
                    <span 
                        className={isExpanded ? 'codicon codicon-chevron-down' : 'codicon codicon-chevron-right'}
                        style={{ fontSize: '14px' }}
                    ></span>
                </td>
                <td style={cellStyle}>{resource.kind}</td>
                <td style={nameCellStyle} onClick={handleNameClick}>
                    {resource.name}
                </td>
                <td style={cellStyle}>{resource.namespace}</td>
                <td style={cellStyle}>
                    <div style={getSyncStatusBadgeStyle(resource.syncStatus)}>
                        <span className={getSyncStatusIcon(resource.syncStatus)} style={{ fontSize: '12px' }}></span>
                        <span>{resource.syncStatus}</span>
                    </div>
                </td>
                <td style={cellStyle}>
                    {resource.healthStatus ? (
                        <div style={getHealthStatusBadgeStyle(resource.healthStatus)}>
                            <span>{resource.healthStatus}</span>
                        </div>
                    ) : (
                        <span style={{ color: 'var(--vscode-descriptionForeground)', opacity: 0.6 }}>—</span>
                    )}
                </td>
            </tr>
            {isExpanded && resource.message && (
                <tr>
                    <td colSpan={6} style={expandedContentStyle}>
                        {resource.message}
                    </td>
                </tr>
            )}
        </>
    );
}

