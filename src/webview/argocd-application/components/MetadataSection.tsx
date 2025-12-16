import React from 'react';
import { ArgoCDApplication } from '../../../types/argocd';
import { formatDate } from '../utils/dateUtils';

interface MetadataSectionProps {
    application: ArgoCDApplication;
}

/**
 * Metadata section component displaying application metadata.
 */
export function MetadataSection({ application }: MetadataSectionProps): React.JSX.Element {
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

    return (
        <div style={sectionStyle}>
            <h3 style={titleStyle}>Metadata</h3>
            <div style={gridStyle}>
                <div style={labelStyle}>Name</div>
                <div style={valueStyle}>{application.name}</div>

                <div style={labelStyle}>Namespace</div>
                <div style={valueStyle}>{application.namespace}</div>

                <div style={labelStyle}>Project</div>
                <div style={valueStyle}>{application.project}</div>

                <div style={labelStyle}>Created</div>
                <div style={valueStyle}>{formatDate(application.createdAt)}</div>
            </div>
        </div>
    );
}

