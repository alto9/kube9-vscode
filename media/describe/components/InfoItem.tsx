import React, { useState } from 'react';

interface InfoItemProps {
    /** Label text */
    label: string;
    /** Value text */
    value: string;
    /** Whether the value is copyable */
    copyable?: boolean;
}

/**
 * Individual info item component displaying label-value pairs.
 * Supports copyable values with a copy button.
 */
export const InfoItem: React.FC<InfoItemProps> = ({ label, value, copyable = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    return (
        <div className="info-item">
            <div className="info-label">{label}</div>
            <div className="info-value">
                <span className="info-value-text">{value}</span>
                {copyable && (
                    <button
                        className="copy-btn"
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy to clipboard'}
                        aria-label={`Copy ${label} to clipboard`}
                    >
                        {copied ? '✓' : '📋'}
                    </button>
                )}
            </div>
        </div>
    );
};

