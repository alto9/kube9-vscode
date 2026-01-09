import React, { useState } from 'react';

/**
 * Props for ManifestViewer component.
 */
interface ManifestViewerProps {
    /** YAML manifest content to display */
    manifest: string;
    /** Callback when copy button is clicked */
    onCopy?: (content: string) => void;
}

/**
 * ManifestViewer component for displaying YAML manifests.
 * Uses monospace font and preserves formatting with copy functionality.
 */
export const ManifestViewer: React.FC<ManifestViewerProps> = ({ manifest, onCopy }) => {
    const [copyHovered, setCopyHovered] = useState(false);

    if (!manifest || manifest.trim() === '') {
        return (
            <div style={{
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '13px',
                fontStyle: 'italic'
            }}>
                No manifest available for this release.
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
            onCopy(manifest);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <label style={labelStyle}>Manifest (YAML)</label>
                {onCopy && (
                    <button
                        style={copyHovered ? { ...copyButtonStyle, ...copyButtonHoverStyle } : copyButtonStyle}
                        onClick={handleCopy}
                        onMouseEnter={() => setCopyHovered(true)}
                        onMouseLeave={() => setCopyHovered(false)}
                        title="Copy manifest to clipboard"
                    >
                        <span className="codicon codicon-copy"></span>
                        Copy
                    </button>
                )}
            </div>
            <pre style={contentStyle}>
                <code>{manifest}</code>
            </pre>
        </div>
    );
};

