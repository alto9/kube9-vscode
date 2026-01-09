import React, { useState, useMemo } from 'react';

/**
 * Props for VersionsList component.
 */
interface VersionsListProps {
    /** Array of available chart versions */
    versions: string[];
    /** Currently selected version */
    selectedVersion: string;
    /** Callback when version is changed */
    onVersionChange: (version: string) => void;
}

/**
 * VersionsList component for displaying and selecting chart versions.
 * Versions are sorted from newest to oldest.
 */
export const VersionsList: React.FC<VersionsListProps> = ({
    versions,
    selectedVersion,
    onVersionChange
}) => {
    const [isOpen, setIsOpen] = useState(false);

    /**
     * Sort versions from newest to oldest.
     * Simple version comparison (can be enhanced with semver library if needed).
     */
    const sortedVersions = useMemo(() => {
        if (versions.length === 0) {
            return [];
        }

        // Simple version sorting - split by dots and compare numerically
        return [...versions].sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || 0;
                const bPart = bParts[i] || 0;
                
                if (aPart !== bPart) {
                    return bPart - aPart; // Descending order (newest first)
                }
            }
            
            return 0;
        });
    }, [versions]);

    if (sortedVersions.length === 0) {
        return (
            <div style={{
                color: 'var(--vscode-descriptionForeground)',
                fontFamily: 'var(--vscode-font-family)',
                fontSize: '13px',
                fontStyle: 'italic'
            }}>
                No versions available for this chart.
            </div>
        );
    }

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'var(--vscode-font-family)'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--vscode-foreground)',
        marginBottom: '4px'
    };

    const dropdownContainerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%'
    };

    const dropdownButtonStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 12px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)',
        backgroundColor: 'var(--vscode-dropdown-background)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '2px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        outline: 'none'
    };

    const dropdownButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-hoverBackground)'
    };

    const dropdownListStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: 'var(--vscode-dropdown-background)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '2px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 1000
    };

    const dropdownItemStyle: React.CSSProperties = {
        padding: '8px 12px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)',
        cursor: 'pointer',
        border: 'none',
        backgroundColor: 'transparent',
        width: '100%',
        textAlign: 'left'
    };

    const dropdownItemHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-hoverBackground)'
    };

    const dropdownItemSelectedStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
        color: 'var(--vscode-list-activeSelectionForeground)'
    };

    const [buttonHovered, setButtonHovered] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const handleVersionSelect = (version: string) => {
        if (version !== selectedVersion) {
            onVersionChange(version);
        }
        setIsOpen(false);
    };

    return (
        <div style={containerStyle}>
            <div style={labelStyle}>Select Version</div>
            <div style={dropdownContainerStyle}>
                <button
                    style={buttonHovered ? { ...dropdownButtonStyle, ...dropdownButtonHoverStyle } : dropdownButtonStyle}
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => setButtonHovered(true)}
                    onMouseLeave={() => setButtonHovered(false)}
                    aria-label="Select version"
                >
                    <span>{selectedVersion}</span>
                    <span>{isOpen ? '▲' : '▼'}</span>
                </button>
                
                {isOpen && (
                    <div style={dropdownListStyle}>
                        {sortedVersions.map((version, index) => {
                            const isSelected = version === selectedVersion;
                            const isHovered = hoveredIndex === index;
                            
                            return (
                                <button
                                    key={version}
                                    style={
                                        isSelected
                                            ? { ...dropdownItemStyle, ...dropdownItemSelectedStyle }
                                            : isHovered
                                              ? { ...dropdownItemStyle, ...dropdownItemHoverStyle }
                                              : dropdownItemStyle
                                    }
                                    onClick={() => handleVersionSelect(version)}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    {version}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {selectedVersion && (
                <div style={{
                    fontSize: '12px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: '8px'
                }}>
                    Selected version: <strong>{selectedVersion}</strong>
                </div>
            )}
        </div>
    );
};

