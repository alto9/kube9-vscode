import React, { useState } from 'react';
import { SecretKeys, SecretKeyInfo } from '../../../providers/SecretDescribeProvider';

/**
 * Props for KeysTab component.
 */
interface KeysTabProps {
    /** Secret keys data to display */
    data: SecretKeys;
}

/**
 * Obfuscate a secret value for display.
 * Shows first 4 characters, then masks the rest.
 */
function obfuscateValue(value: string, showLength: number = 4): string {
    if (value.length <= showLength) {
        return '*'.repeat(value.length);
    }
    return value.substring(0, showLength) + '*'.repeat(Math.min(value.length - showLength, 20));
}

/**
 * Keys tab component that displays Secret key names and sizes.
 * SECURITY: Values are hidden by default, with optional reveal toggle.
 */
export const KeysTab: React.FC<KeysTabProps> = ({ data }) => {
    const [revealValues, setRevealValues] = useState<boolean>(false);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    // Handle empty state
    if (data.totalKeys === 0) {
        return (
            <div className="keys-tab">
                <div className="empty-state">
                    <p>This Secret has no data keys</p>
                </div>
            </div>
        );
    }

    // Toggle reveal for a specific key
    const toggleRevealKey = (keyName: string) => {
        const newRevealed = new Set(revealedKeys);
        if (newRevealed.has(keyName)) {
            newRevealed.delete(keyName);
        } else {
            newRevealed.add(keyName);
        }
        setRevealedKeys(newRevealed);
    };

    // Toggle reveal all values
    const toggleRevealAll = () => {
        if (revealValues) {
            setRevealValues(false);
            setRevealedKeys(new Set());
        } else {
            setRevealValues(true);
            setRevealedKeys(new Set(data.keys.map(k => k.name)));
        }
    };

    return (
        <div className="keys-tab">
            <div className="section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Secret Keys</h2>
                    <div>
                        <button
                            className="link-button"
                            onClick={toggleRevealAll}
                            style={{
                                backgroundColor: revealValues ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-button-background)',
                                color: revealValues ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-button-foreground)',
                                border: '1px solid var(--vscode-button-border)',
                                padding: '4px 12px',
                                borderRadius: '2px',
                                cursor: 'pointer'
                            }}
                        >
                            {revealValues ? 'Hide All Values' : 'Reveal All Values'}
                        </button>
                    </div>
                </div>

                {revealValues && (
                    <div className="status-banner status-warning" style={{ 
                        backgroundColor: 'var(--vscode-inputValidation-warningBackground)', 
                        borderColor: 'var(--vscode-inputValidation-warningBorder)',
                        marginBottom: '20px',
                        padding: '12px'
                    }}>
                        <span className="status-icon">⚠️</span>
                        <span className="status-text">
                            <strong>Warning:</strong> Secret values are displayed below. Be cautious when sharing screenshots or logs.
                        </span>
                    </div>
                )}

                <p className="section-description">
                    This Secret contains {data.totalKeys} key{data.totalKeys !== 1 ? 's' : ''} with a total size of {data.totalSize > 0 ? `${(data.totalSize / 1024).toFixed(1)} KB` : 'N/A'}.
                    {!revealValues && ' Values are hidden by default for security.'}
                </p>

                <table className="conditions-table">
                    <thead>
                        <tr>
                            <th>Key Name</th>
                            <th>Size</th>
                            <th>Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.keys.map((key: SecretKeyInfo) => {
                            const isRevealed = revealedKeys.has(key.name) || revealValues;
                            return (
                                <tr key={key.name}>
                                    <td>
                                        <code style={{ backgroundColor: 'var(--vscode-textCodeBlock-background)', padding: '2px 6px', borderRadius: '2px' }}>
                                            {key.name}
                                        </code>
                                    </td>
                                    <td>{key.sizeFormatted}</td>
                                    <td>
                                        {isRevealed ? (
                                            <code style={{ 
                                                backgroundColor: 'var(--vscode-textCodeBlock-background)', 
                                                padding: '2px 6px', 
                                                borderRadius: '2px',
                                                color: 'var(--vscode-textLink-foreground)'
                                            }}>
                                                {obfuscateValue('*'.repeat(Math.min(key.size, 50)))}
                                            </code>
                                        ) : (
                                            <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                                                ••••••••
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="link-button"
                                            onClick={() => toggleRevealKey(key.name)}
                                            style={{ fontSize: '12px' }}
                                        >
                                            {isRevealed ? 'Hide' : 'Reveal'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
