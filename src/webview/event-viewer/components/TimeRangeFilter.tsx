import React, { useState, useEffect, useRef } from 'react';

/**
 * Props for TimeRangeFilter component.
 */
interface TimeRangeFilterProps {
    selected?: string; // 'all' | '1h' | '24h' | '7d' | 'custom'
    onChange: (since: string) => void;
}

/**
 * TimeRangeFilter component.
 * Dropdown for filtering events by time range with quick options and custom range placeholder.
 */
export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({ selected = 'all', onChange }) => {
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

    const getDisplayText = (value: string): string => {
        switch (value) {
            case 'all':
                return 'All';
            case '1h':
                return 'Last 1 hour';
            case '24h':
                return 'Last 24 hours';
            case '7d':
                return 'Last 7 days';
            case 'custom':
                return 'Custom Range';
            default:
                return 'All';
        }
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
        justifyContent: 'space-between'
    };

    const disabledMenuItemStyle: React.CSSProperties = {
        ...menuItemStyle,
        opacity: 0.5,
        cursor: 'not-allowed',
        color: 'var(--vscode-descriptionForeground)'
    };

    const handleMenuItemClick = (value: string) => {
        if (value === 'custom') {
            // Placeholder for future enhancement
            return;
        }
        onChange(value);
        setMenuOpen(false);
    };

    const timeRangeOptions = [
        { value: 'all', label: 'All' },
        { value: '1h', label: 'Last 1 hour' },
        { value: '24h', label: 'Last 24 hours' },
        { value: '7d', label: 'Last 7 days' },
        { value: 'custom', label: 'Custom Range', disabled: true }
    ];

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <button
                style={buttonStyle}
                onClick={() => setMenuOpen(!menuOpen)}
                title="Select time range"
                aria-label="Select time range"
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
                    {timeRangeOptions.map((option) => {
                        const isSelected = selected === option.value;
                        const isDisabled = option.disabled || false;
                        const itemStyle = isDisabled ? disabledMenuItemStyle : menuItemStyle;

                        return (
                            <button
                                key={option.value}
                                style={{
                                    ...itemStyle,
                                    backgroundColor: isSelected
                                        ? 'var(--vscode-list-activeSelectionBackground)'
                                        : 'transparent',
                                    color: isSelected
                                        ? 'var(--vscode-list-activeSelectionForeground)'
                                        : itemStyle.color
                                }}
                                onClick={() => !isDisabled && handleMenuItemClick(option.value)}
                                role="menuitem"
                                disabled={isDisabled}
                                aria-disabled={isDisabled}
                                onMouseEnter={(e) => {
                                    if (!isDisabled) {
                                        e.currentTarget.style.backgroundColor = isSelected
                                            ? 'var(--vscode-list-activeSelectionBackground)'
                                            : 'var(--vscode-list-hoverBackground)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isDisabled) {
                                        e.currentTarget.style.backgroundColor = isSelected
                                            ? 'var(--vscode-list-activeSelectionBackground)'
                                            : 'transparent';
                                    }
                                }}
                            >
                                <span>{option.label}</span>
                                {isSelected && (
                                    <span className="codicon codicon-check" style={{ fontSize: '14px' }}></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

