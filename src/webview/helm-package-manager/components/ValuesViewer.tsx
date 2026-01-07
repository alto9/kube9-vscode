import React from 'react';

/**
 * Props for ValuesViewer component.
 */
interface ValuesViewerProps {
    /** YAML content to display */
    yaml: string;
}

/**
 * ValuesViewer component for displaying chart default values in YAML format.
 * Uses monospace font and preserves formatting (syntax highlighting can be added later).
 */
export const ValuesViewer: React.FC<ValuesViewerProps> = ({ yaml }) => {
    if (!yaml || yaml.trim() === '') {
        return (
            <div style={{
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '13px',
                fontStyle: 'italic'
            }}>
                No default values available for this chart.
            </div>
        );
    }

    const containerStyle: React.CSSProperties = {
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-editor-font-family)',
        fontSize: '13px',
        lineHeight: '1.6',
        whiteSpace: 'pre',
        wordWrap: 'normal',
        overflowX: 'auto',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '12px',
        margin: 0
    };

    return (
        <pre style={containerStyle}>
            <code>{yaml}</code>
        </pre>
    );
};

