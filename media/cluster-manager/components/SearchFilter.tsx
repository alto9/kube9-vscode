import React from 'react';

/**
 * Props for SearchFilter component
 */
interface SearchFilterProps {
    /** Current search value */
    value: string;
    /** Callback when search value changes */
    onChange: (value: string) => void;
    /** Callback when clear button is clicked */
    onClear: () => void;
}

/**
 * SearchFilter component provides a search input with clear button
 */
export function SearchFilter({ value, onChange, onClear }: SearchFilterProps): JSX.Element {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(e.target.value);
    };

    const handleClear = (): void => {
        onClear();
    };

    return (
        <div className="search-filter">
            <input
                type="text"
                className="search-filter-input"
                placeholder="Search clusters..."
                value={value}
                onChange={handleChange}
                aria-label="Search clusters by name or alias"
            />
            {value && (
                <button
                    type="button"
                    className="search-filter-clear"
                    onClick={handleClear}
                    aria-label="Clear search"
                    title="Clear search"
                >
                    <span className="codicon codicon-close"></span>
                </button>
            )}
        </div>
    );
}

