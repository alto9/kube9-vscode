import React from 'react';

/**
 * Props for ReadmeViewer component.
 */
interface ReadmeViewerProps {
    /** Markdown content to render */
    markdown: string;
}

/**
 * ReadmeViewer component for rendering chart README markdown content.
 * Uses simple HTML rendering for now (markdown library can be added later).
 */
export const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ markdown }) => {
    if (!markdown || markdown.trim() === '') {
        return (
            <div style={{
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '13px',
                fontStyle: 'italic'
            }}>
                No README available for this chart.
            </div>
        );
    }

    // For now, render markdown as plain text with basic formatting
    // In the future, this could use a markdown library like react-markdown
    const containerStyle: React.CSSProperties = {
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '13px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
    };

    return (
        <div style={containerStyle}>
            {markdown}
        </div>
    );
};

