import React, { useState } from 'react';

/**
 * Props for FilterSection component.
 */
interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
}

/**
 * FilterSection component.
 * Collapsible wrapper for organizing filter controls in sections.
 */
export const FilterSection: React.FC<FilterSectionProps> = ({ title, children }) => {
    const [collapsed, setCollapsed] = useState(false);

    const headerStyle: React.CSSProperties = {
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--vscode-panel-border)',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0 // Prevent header from shrinking
    };

    const toggleButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        color: 'var(--vscode-foreground)',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center'
    };

    const contentStyle: React.CSSProperties = {
        padding: '8px 12px',
        overflow: 'visible',
        display: 'block',
        minHeight: '60px' // Ensure content has minimum height
    };

    const sectionStyle: React.CSSProperties = {
        display: 'block',
        borderBottom: '1px solid var(--vscode-panel-border)',
        minHeight: '100px' // Ensure section has minimum height
    };

    return (
        <div className="filter-section" style={sectionStyle}>
            <div
                className="filter-section-header"
                style={headerStyle}
                onClick={() => setCollapsed(!collapsed)}
                role="button"
                tabIndex={0}
                aria-expanded={!collapsed}
                aria-label={collapsed ? `Expand ${title} section` : `Collapse ${title} section`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCollapsed(!collapsed);
                    }
                }}
            >
                <span style={{ fontWeight: '500' }}>{title}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed(!collapsed);
                    }}
                    className="collapse-button"
                    style={toggleButtonStyle}
                    aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
                >
                    <span className={`codicon codicon-chevron-${collapsed ? 'right' : 'down'}`}></span>
                </button>
            </div>
            {!collapsed && (
                <div className="filter-section-content" style={contentStyle}>
                    {children}
                </div>
            )}
        </div>
    );
};

