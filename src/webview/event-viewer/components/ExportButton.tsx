import React, { useState, useEffect, useRef } from 'react';

/**
 * Props for ExportButton component.
 */
interface ExportButtonProps {
    onExport: (format: 'json' | 'csv') => void;
}

/**
 * ExportButton component with dropdown menu for selecting export format.
 * Allows users to export events as JSON or CSV.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    const buttonStyle: React.CSSProperties = {
        padding: '6px 14px',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        transition: 'opacity 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        position: 'relative'
    };

    const dropdownMenuStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '4px',
        backgroundColor: 'var(--vscode-dropdown-background)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '3px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        minWidth: '150px',
        display: 'flex',
        flexDirection: 'column'
    };

    const menuItemStyle: React.CSSProperties = {
        padding: '8px 12px',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--vscode-dropdown-foreground)',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        textAlign: 'left',
        transition: 'background-color 0.15s ease'
    };

    const handleMenuItemClick = (format: 'json' | 'csv') => {
        onExport(format);
        setMenuOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                style={buttonStyle}
                onClick={() => setMenuOpen(!menuOpen)}
                title="Export events"
                aria-label="Export events"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <span className="codicon codicon-export" style={{ fontSize: '14px' }}></span>
                Export
                <span className="codicon codicon-chevron-down" style={{ fontSize: '12px', marginLeft: '4px' }}></span>
            </button>
            {menuOpen && (
                <div style={dropdownMenuStyle} role="menu">
                    <button
                        style={menuItemStyle}
                        onClick={() => handleMenuItemClick('json')}
                        role="menuitem"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        Export as JSON
                    </button>
                    <button
                        style={menuItemStyle}
                        onClick={() => handleMenuItemClick('csv')}
                        role="menuitem"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        Export as CSV
                    </button>
                </div>
            )}
        </div>
    );
};

