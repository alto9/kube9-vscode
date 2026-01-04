import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KubernetesEvent } from '../../../types/Events';

/**
 * Props for ResourceTypeFilter component.
 */
interface ResourceTypeFilterProps {
    selected?: string; // 'all' | resource type name
    onChange: (resourceType: string) => void;
    events: KubernetesEvent[];
}

/**
 * ResourceTypeFilter component.
 * Dropdown for filtering events by resource type with dynamic list and counts extracted from events.
 */
export const ResourceTypeFilter: React.FC<ResourceTypeFilterProps> = ({
    selected = 'all',
    onChange,
    events
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract unique resource kinds and calculate counts
    const resourceTypeData = useMemo(() => {
        const resourceTypeMap = new Map<string, number>();

        events.forEach((event) => {
            const resourceType = event.involvedObject.kind || '';
            resourceTypeMap.set(resourceType, (resourceTypeMap.get(resourceType) || 0) + 1);
        });

        // Convert to array and sort alphabetically
        const resourceTypes = Array.from(resourceTypeMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return resourceTypes;
    }, [events]);

    const totalCount = useMemo(() => {
        return events.length;
    }, [events]);

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

    const getDisplayText = (value: string): string => {
        if (value === 'all' || !value) {
            return 'All Resource Types';
        }
        return value;
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '6px 12px',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-dropdown-background)',
        color: 'var(--vscode-dropdown-foreground)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        transition: 'background-color 0.15s ease'
    };

    const dropdownMenuStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: 'var(--vscode-dropdown-background)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '3px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 10000, // Much higher z-index
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '250px',
        overflowY: 'auto'
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
        transition: 'background-color 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
    };

    const countBadgeStyle: React.CSSProperties = {
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)'
    };

    const handleMenuItemClick = (value: string) => {
        onChange(value);
        setMenuOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <button
                style={buttonStyle}
                onClick={() => setMenuOpen(!menuOpen)}
                title="Select resource type"
                aria-label="Select resource type"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-dropdown-background)';
                }}
            >
                <span>{getDisplayText(selected)}</span>
                <span className="codicon codicon-chevron-down" style={{ fontSize: '12px' }}></span>
            </button>
            {menuOpen && (
                <div style={dropdownMenuStyle} role="menu">
                    <button
                        style={{
                            ...menuItemStyle,
                            backgroundColor:
                                selected === 'all' ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                            color:
                                selected === 'all'
                                    ? 'var(--vscode-list-activeSelectionForeground)'
                                    : menuItemStyle.color
                        }}
                        onClick={() => handleMenuItemClick('all')}
                        role="menuitem"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                                selected === 'all'
                                    ? 'var(--vscode-list-activeSelectionBackground)'
                                    : 'var(--vscode-list-hoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                                selected === 'all'
                                    ? 'var(--vscode-list-activeSelectionBackground)'
                                    : 'transparent';
                        }}
                    >
                        <span>All Resource Types</span>
                        <span style={countBadgeStyle}>{totalCount}</span>
                    </button>
                    {resourceTypeData.map(({ name, count }) => {
                        const isSelected = selected === name;
                        return (
                            <button
                                key={name}
                                style={{
                                    ...menuItemStyle,
                                    backgroundColor: isSelected
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent',
                                    color: isSelected
                                        ? 'var(--vscode-list-activeSelectionForeground)'
                                        : menuItemStyle.color
                                }}
                                onClick={() => handleMenuItemClick(name)}
                                role="menuitem"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'var(--vscode-list-hoverBackground)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent';
                                }}
                            >
                                <span>{name}</span>
                                <span style={countBadgeStyle}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

