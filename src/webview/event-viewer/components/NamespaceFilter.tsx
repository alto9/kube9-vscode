import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KubernetesEvent } from '../../../types/Events';

/**
 * Props for NamespaceFilter component.
 */
interface NamespaceFilterProps {
    selected?: string; // 'all' | namespace name
    onChange: (namespace: string) => void;
    events: KubernetesEvent[];
}

/**
 * NamespaceFilter component.
 * Dropdown for filtering events by namespace with dynamic list and counts extracted from events.
 */
export const NamespaceFilter: React.FC<NamespaceFilterProps> = ({ selected = 'all', onChange, events }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract unique namespaces and calculate counts
    const namespaceData = useMemo(() => {
        const namespaceMap = new Map<string, number>();

        events.forEach((event) => {
            const namespace = event.involvedObject.namespace || '';
            namespaceMap.set(namespace, (namespaceMap.get(namespace) || 0) + 1);
        });

        // Convert to array and sort alphabetically
        const namespaces = Array.from(namespaceMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return namespaces;
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
            return 'All Namespaces';
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
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: '300px',
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
                title="Select namespace"
                aria-label="Select namespace"
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
                        <span>All Namespaces</span>
                        <span style={countBadgeStyle}>{totalCount}</span>
                    </button>
                    {namespaceData.map(({ name, count }) => {
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
                                <span>{name || '(default)'}</span>
                                <span style={countBadgeStyle}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

