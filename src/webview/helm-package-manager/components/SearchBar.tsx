import React, { useState, useEffect, useRef } from 'react';

/**
 * Props for SearchBar component.
 */
interface SearchBarProps {
    /** Callback when search query changes (debounced) */
    onSearch: (query: string) => void;
    /** Debounce delay in milliseconds */
    debounceMs: number;
}

/**
 * SearchBar component for chart search with debounced input.
 * Provides search input with clear button and keyboard shortcuts.
 */
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, debounceMs }) => {
    const [localValue, setLocalValue] = useState('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce onChange calls
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onSearch(localValue);
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localValue]); // Don't include onSearch - causes infinite loop when parent passes inline function

    // Handle Escape key to clear search
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setLocalValue('');
            onSearch('');
            inputRef.current?.blur();
        }
    };

    // Handle clear button click
    const handleClear = () => {
        setLocalValue('');
        onSearch('');
        inputRef.current?.focus();
    };

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: '500px'
    };

    const inputWrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '3px',
        padding: '4px 8px',
        gap: '6px'
    };

    const inputStyle: React.CSSProperties = {
        flex: 1,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        color: 'var(--vscode-input-foreground)',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        padding: '2px 0'
    };

    const clearButtonStyle: React.CSSProperties = {
        padding: '2px',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--vscode-input-foreground)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '2px',
        transition: 'background-color 0.15s ease',
        opacity: localValue ? 1 : 0,
        pointerEvents: localValue ? 'auto' : 'none'
    };

    return (
        <div style={containerStyle}>
            <div style={inputWrapperStyle}>
                <span className="codicon codicon-search" style={{ fontSize: '14px', color: 'var(--vscode-input-foreground)', opacity: 0.7 }}></span>
                <input
                    ref={inputRef}
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for charts..."
                    style={inputStyle}
                    aria-label="Search charts"
                    title="Search charts (Press Escape to clear)"
                />
                {localValue && (
                    <button
                        onClick={handleClear}
                        style={clearButtonStyle}
                        aria-label="Clear search"
                        title="Clear search"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--vscode-inputOption-hoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <span className="codicon codicon-close" style={{ fontSize: '14px' }}></span>
                    </button>
                )}
            </div>
        </div>
    );
};

