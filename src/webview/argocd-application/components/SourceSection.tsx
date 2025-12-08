import React from 'react';
import { ApplicationSource } from '../../../types/argocd';

interface SourceSectionProps {
    source: ApplicationSource;
}

/**
 * Source section component displaying Git repository information.
 */
export function SourceSection({ source }: SourceSectionProps): React.JSX.Element {
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

    const linkStyle: React.CSSProperties = {
        ...valueStyle,
        color: 'var(--vscode-textLink-foreground)',
        textDecoration: 'none',
        cursor: 'pointer'
    };

    const handleRepositoryClick = (e: React.MouseEvent): void => {
        e.preventDefault();
        // Open repository URL in external browser
        // In VS Code webviews, window.open should work for external links
        window.open(source.repoURL, '_blank');
    };

    return (
        <div style={sectionStyle}>
            <h3 style={titleStyle}>Source</h3>
            <div style={gridStyle}>
                <div style={labelStyle}>Repository</div>
                <div>
                    <a
                        href={source.repoURL}
                        onClick={handleRepositoryClick}
                        style={linkStyle}
                        title={`Open ${source.repoURL} in browser`}
                    >
                        {source.repoURL}
                    </a>
                </div>

                <div style={labelStyle}>Path</div>
                <div style={valueStyle}>{source.path}</div>

                <div style={labelStyle}>Target Revision</div>
                <div style={valueStyle}>{source.targetRevision}</div>
            </div>
        </div>
    );
}

