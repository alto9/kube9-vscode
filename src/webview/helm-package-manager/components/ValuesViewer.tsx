import React, { useState } from 'react';

/**
 * Props for ValuesViewer component.
 */
interface ValuesViewerProps {
    /** YAML content to display */
    yaml: string;
    /** Callback when copy button is clicked */
    onCopy?: (content: string) => void;
}

/**
 * ValuesViewer component for displaying chart default values in YAML format.
 * Uses monospace font and preserves formatting (syntax highlighting can be added later).
 */
export const ValuesViewer: React.FC<ValuesViewerProps> = ({ yaml, onCopy }) => {
    const [copyHovered, setCopyHovered] = useState(false);

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
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const copyButtonStyle: React.CSSProperties = {
        padding: '4px 8px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        transition: 'background-color 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
    };

    const copyButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const contentStyle: React.CSSProperties = {
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

    const handleCopy = () => {
        if (onCopy) {
            onCopy(yaml);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <label style={labelStyle}>Values (YAML)</label>
                {onCopy && (
                    <button
                        style={copyHovered ? { ...copyButtonStyle, ...copyButtonHoverStyle } : copyButtonStyle}
                        onClick={handleCopy}
                        onMouseEnter={() => setCopyHovered(true)}
                        onMouseLeave={() => setCopyHovered(false)}
                        title="Copy values to clipboard"
                    >
                        <span className="codicon codicon-copy"></span>
                        Copy
                    </button>
                )}
            </div>
            <pre style={contentStyle}>
                <code>{yaml}</code>
            </pre>
        </div>
    );
};

