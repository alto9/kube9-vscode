import React, { useState } from 'react';

interface KeyValueListProps {
    /** Key-value pairs to display */
    items: Record<string, string>;
    /** Whether items are copyable */
    copyable?: boolean;
}

/**
 * Component for displaying key-value pairs (labels/annotations).
 * Renders as a list of key-value pairs with optional copy functionality.
 */
export const KeyValueList: React.FC<KeyValueListProps> = ({ items, copyable = false }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = async (key: string, value: string) => {
        try {
            // Copy the full key-value pair
            await navigator.clipboard.writeText(`${key}: ${value}`);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const entries = Object.entries(items);

    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="key-value-list">
            {entries.map(([key, value]) => (
                <div key={key} className="key-value-item">
                    <div className="key-value-key">{key}</div>
                    <div className="key-value-value">
                        <span className="key-value-value-text">{value}</span>
                        {copyable && (
                            <button
                                className="copy-btn"
                                onClick={() => handleCopy(key, value)}
                                title={copiedKey === key ? 'Copied!' : 'Copy to clipboard'}
                                aria-label={`Copy ${key} to clipboard`}
                            >
                                {copiedKey === key ? '✓' : '📋'}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

