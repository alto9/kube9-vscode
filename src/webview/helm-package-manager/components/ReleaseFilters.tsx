import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ReleaseFilters, ReleaseStatus, HelmRelease } from '../types';

/**
 * Props for ReleaseFilters component.
 */
interface ReleaseFiltersProps {
    filters: ReleaseFilters;
    releases: HelmRelease[];
    onChange: (filters: ReleaseFilters) => void;
}

/**
 * ReleaseFilters component.
 * Provides namespace dropdown, status dropdown, search input, and clear filters button.
 */
export const ReleaseFiltersComponent: React.FC<ReleaseFiltersProps> = ({
    filters,
    releases,
    onChange
}) => {
    const namespaceRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const [namespaceMenuOpen, setNamespaceMenuOpen] = useState(false);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);

    // Extract unique namespaces from releases
    const namespaceData = useMemo(() => {
        const namespaceMap = new Map<string, number>();
        releases.forEach((release) => {
            const namespace = release.namespace || '';
            namespaceMap.set(namespace, (namespaceMap.get(namespace) || 0) + 1);
        });
        return Array.from(namespaceMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [releases]);

    // Extract unique statuses from releases
    const statusData = useMemo(() => {
        const statusMap = new Map<ReleaseStatus, number>();
        releases.forEach((release) => {
            const status = release.status;
            statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        return Array.from(statusMap.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => a.status.localeCompare(b.status));
    }, [releases]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (namespaceRef.current && !namespaceRef.current.contains(event.target as Node)) {
                setNamespaceMenuOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setStatusMenuOpen(false);
            }
        };

        if (namespaceMenuOpen || statusMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [namespaceMenuOpen, statusMenuOpen]);

    const getNamespaceDisplayText = (value: string | 'all'): string => {
        if (value === 'all' || !value) {
            return 'All Namespaces';
        }
        return value;
    };

    const getStatusDisplayText = (value: ReleaseStatus | 'all'): string => {
        if (value === 'all') {
            return 'All Statuses';
        }
        // Format status text (e.g., 'pending-install' -> 'Pending Install')
        return value
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleNamespaceChange = (namespace: string) => {
        onChange({ ...filters, namespace });
        setNamespaceMenuOpen(false);
    };

    const handleStatusChange = (status: ReleaseStatus | 'all') => {
        onChange({ ...filters, status });
        setStatusMenuOpen(false);
    };

    const handleSearchChange = (searchQuery: string) => {
        onChange({ ...filters, searchQuery });
    };

    const handleClearFilters = () => {
        onChange({
            namespace: 'all',
            status: 'all',
            searchQuery: ''
        });
    };

    const hasActiveFilters = filters.namespace !== 'all' || filters.status !== 'all' || filters.searchQuery !== '';

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '3px'
    };

    const dropdownContainerStyle: React.CSSProperties = {
        position: 'relative',
        minWidth: '150px'
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

    const searchInputStyle: React.CSSProperties = {
        flex: '1',
        minWidth: '200px',
        padding: '6px 12px',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '3px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)'
    };

    const clearButtonStyle: React.CSSProperties = {
        padding: '6px 12px',
        border: '1px solid var(--vscode-button-secondaryBackground)',
        borderRadius: '3px',
        cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        opacity: hasActiveFilters ? 1 : 0.5,
        transition: 'opacity 0.15s ease'
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
        zIndex: 10000,
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

    return (
        <div style={containerStyle}>
            {/* Namespace Filter */}
            <div ref={namespaceRef} style={dropdownContainerStyle}>
                <button
                    style={buttonStyle}
                    onClick={() => setNamespaceMenuOpen(!namespaceMenuOpen)}
                    title="Filter by namespace"
                    aria-label="Filter by namespace"
                    aria-haspopup="menu"
                    aria-expanded={namespaceMenuOpen}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-dropdown-background)';
                    }}
                >
                    <span>{getNamespaceDisplayText(filters.namespace)}</span>
                    <span className="codicon codicon-chevron-down" style={{ fontSize: '12px' }}></span>
                </button>
                {namespaceMenuOpen && (
                    <div style={dropdownMenuStyle} role="menu">
                        <button
                            style={{
                                ...menuItemStyle,
                                backgroundColor:
                                    filters.namespace === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent',
                                color:
                                    filters.namespace === 'all'
                                        ? 'var(--vscode-list-activeSelectionForeground)'
                                        : menuItemStyle.color
                            }}
                            onClick={() => handleNamespaceChange('all')}
                            role="menuitem"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    filters.namespace === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'var(--vscode-list-hoverBackground)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    filters.namespace === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent';
                            }}
                        >
                            <span>All Namespaces</span>
                            <span style={countBadgeStyle}>{releases.length}</span>
                        </button>
                        {namespaceData.map(({ name, count }) => {
                            const isSelected = filters.namespace === name;
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
                                    onClick={() => handleNamespaceChange(name)}
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

            {/* Status Filter */}
            <div ref={statusRef} style={dropdownContainerStyle}>
                <button
                    style={buttonStyle}
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    title="Filter by status"
                    aria-label="Filter by status"
                    aria-haspopup="menu"
                    aria-expanded={statusMenuOpen}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-dropdown-background)';
                    }}
                >
                    <span>{getStatusDisplayText(filters.status)}</span>
                    <span className="codicon codicon-chevron-down" style={{ fontSize: '12px' }}></span>
                </button>
                {statusMenuOpen && (
                    <div style={dropdownMenuStyle} role="menu">
                        <button
                            style={{
                                ...menuItemStyle,
                                backgroundColor:
                                    filters.status === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent',
                                color:
                                    filters.status === 'all'
                                        ? 'var(--vscode-list-activeSelectionForeground)'
                                        : menuItemStyle.color
                            }}
                            onClick={() => handleStatusChange('all')}
                            role="menuitem"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    filters.status === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'var(--vscode-list-hoverBackground)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    filters.status === 'all'
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent';
                            }}
                        >
                            <span>All Statuses</span>
                            <span style={countBadgeStyle}>{releases.length}</span>
                        </button>
                        {statusData.map(({ status, count }) => {
                            const isSelected = filters.status === status;
                            return (
                                <button
                                    key={status}
                                    style={{
                                        ...menuItemStyle,
                                        backgroundColor: isSelected
                                            ? 'var(--vscode-list-activeSelectionBackground)'
                                            : 'transparent',
                                        color: isSelected
                                            ? 'var(--vscode-list-activeSelectionForeground)'
                                            : menuItemStyle.color
                                    }}
                                    onClick={() => handleStatusChange(status)}
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
                                    <span>{getStatusDisplayText(status)}</span>
                                    <span style={countBadgeStyle}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Search Input */}
            <input
                type="text"
                placeholder="Search by name or chart..."
                value={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={searchInputStyle}
            />

            {/* Clear Filters Button */}
            <button
                style={clearButtonStyle}
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                title="Clear all filters"
            >
                Clear Filters
            </button>
        </div>
    );
};

