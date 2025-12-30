import React, { useRef, useEffect } from 'react';

/**
 * Props for SearchBar component.
 */
interface SearchBarProps {
    /** Current search query */
    query: string;
    /** Array of log line indices that match the search query */
    matches: number[];
    /** Current match index (0-based) */
    currentMatchIndex: number;
    /** Callback when search query changes */
    onQueryChange: (query: string) => void;
    /** Callback to navigate to next match */
    onNextMatch: () => void;
    /** Callback to navigate to previous match */
    onPreviousMatch: () => void;
    /** Callback to close search bar */
    onClose: () => void;
}

/**
 * SearchBar component for searching and navigating log matches.
 * Provides search input, match counter, navigation buttons, and keyboard shortcuts.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
    query,
    matches,
    currentMatchIndex,
    onQueryChange,
    onNextMatch,
    onPreviousMatch,
    onClose
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when component mounts
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                onPreviousMatch();
            } else {
                onNextMatch();
            }
        }
    };

    const matchCount = matches.length;
    const matchText = matchCount > 0 
        ? `${currentMatchIndex + 1} of ${matchCount}`
        : matchCount === 0 && query 
            ? 'No matches'
            : '';

    return (
        <div className="search-bar">
            <div className="search-input-wrapper">
                <span className="codicon codicon-search" style={{ fontSize: '14px', color: 'var(--vscode-input-foreground)', opacity: 0.7 }}></span>
                <input
                    ref={inputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search logs..."
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Search logs"
                    title="Search logs (Enter: next, Shift+Enter: previous, Escape: close)"
                />
            </div>

            {matchText && (
                <div className="search-matches">
                    {matchText}
                </div>
            )}

            <button
                className="btn-icon search-nav-btn"
                onClick={onPreviousMatch}
                disabled={matchCount === 0}
                title="Previous match (Shift+Enter)"
                aria-label="Previous match"
            >
                <span className="codicon codicon-arrow-up"></span>
            </button>

            <button
                className="btn-icon search-nav-btn"
                onClick={onNextMatch}
                disabled={matchCount === 0}
                title="Next match (Enter)"
                aria-label="Next match"
            >
                <span className="codicon codicon-arrow-down"></span>
            </button>

            <button
                className="btn-icon search-close-btn"
                onClick={onClose}
                title="Close search (Escape)"
                aria-label="Close search"
            >
                <span className="codicon codicon-close"></span>
            </button>
        </div>
    );
};

