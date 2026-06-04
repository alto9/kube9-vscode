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

    const handleMenuItemClick = (format: 'json' | 'csv') => {
        onExport(format);
        setMenuOpen(false);
    };

    return (
        <div ref={containerRef} className="event-viewer-export">
            <button
                type="button"
                className="webview-header-action-btn event-viewer-export-trigger"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Export events"
                aria-label="Export events"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <span className="codicon codicon-export" aria-hidden="true" />
                <span className="webview-header-action-label">Export</span>
                <span className="codicon codicon-chevron-down event-viewer-export-chevron" aria-hidden="true" />
            </button>
            {menuOpen && (
                <div className="event-viewer-export-menu" role="menu">
                    <button
                        type="button"
                        className="event-viewer-export-menu-item"
                        onClick={() => handleMenuItemClick('json')}
                        role="menuitem"
                    >
                        Export as JSON
                    </button>
                    <button
                        type="button"
                        className="event-viewer-export-menu-item"
                        onClick={() => handleMenuItemClick('csv')}
                        role="menuitem"
                    >
                        Export as CSV
                    </button>
                </div>
            )}
        </div>
    );
};

