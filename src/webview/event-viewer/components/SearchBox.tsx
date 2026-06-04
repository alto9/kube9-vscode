import React, { useState, useEffect, useRef } from 'react';

/**
 * Props for SearchBox component.
 */
interface SearchBoxProps {
    value: string;
    onChange: (text: string) => void;
}

/**
 * SearchBox component for real-time text search in event toolbar.
 * Provides debounced input with clear button and keyboard shortcuts.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local value when prop value changes externally
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounce onChange calls
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onChange(localValue);
        }, 300);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localValue]); // Don't include onChange - causes infinite loop when parent passes inline function

    // Handle Escape key to clear search
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setLocalValue('');
            onChange('');
            inputRef.current?.blur();
        }
    };

    // Handle clear button click
    const handleClear = () => {
        setLocalValue('');
        onChange('');
        inputRef.current?.focus();
    };

    return (
        <div className="event-viewer-search">
            <div className="event-viewer-search-field">
                <span className="codicon codicon-search event-viewer-search-icon" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="text"
                    className="event-viewer-search-input"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search events..."
                    aria-label="Search events"
                    title="Search events (Press Escape to clear)"
                />
                {localValue ? (
                    <button
                        type="button"
                        className="event-viewer-search-clear"
                        onClick={handleClear}
                        aria-label="Clear search"
                        title="Clear search"
                    >
                        <span className="codicon codicon-close" aria-hidden="true" />
                    </button>
                ) : null}
            </div>
        </div>
    );
};

