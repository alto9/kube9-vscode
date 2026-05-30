import React from 'react';
import { ArgoCDResource } from '../../../types/argocd';
import { SyncHealthBadges } from '../graph/syncHealthBadges';

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

    const badgeStatus = {
        syncStatus: resource.syncStatus,
        healthStatus: resource.healthStatus,
        message: resource.message
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
                    <SyncHealthBadges status={badgeStatus} showHealth={false} />
                </td>
                <td style={cellStyle}>
                    <SyncHealthBadges status={badgeStatus} showSync={false} />
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
