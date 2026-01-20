import React, { useState } from 'react';
import { ConfigMapData } from '../../../providers/ConfigMapDescribeProvider';

/**
 * Props for DataTab component.
 */
interface DataTabProps {
    /** ConfigMap data to display */
    data: ConfigMapData;
}

/**
 * Helper function to detect if a value looks like JSON, YAML, or properties format.
 */
function detectFormat(value: string): 'json' | 'yaml' | 'properties' | 'text' {
    const trimmed = value.trim();
    
    // Check for JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(value);
            return 'json';
        } catch {
            // Not valid JSON, continue checking
        }
    }
    
    // Check for YAML-like structure (key: value pairs)
    if (trimmed.includes(':') && !trimmed.startsWith('{')) {
        const lines = trimmed.split('\n');
        const yamlLikeLines = lines.filter(line => {
            const trimmedLine = line.trim();
            return trimmedLine.includes(':') && !trimmedLine.startsWith('#');
        });
        if (yamlLikeLines.length > 0 && yamlLikeLines.length / lines.length > 0.3) {
            return 'yaml';
        }
    }
    
    // Check for properties format (key=value)
    if (trimmed.includes('=')) {
        const lines = trimmed.split('\n');
        const propLikeLines = lines.filter(line => {
            const trimmedLine = line.trim();
            return trimmedLine.includes('=') && !trimmedLine.startsWith('#');
        });
        if (propLikeLines.length > 0 && propLikeLines.length / lines.length > 0.3) {
            return 'properties';
        }
    }
    
    return 'text';
}

/**
 * Data tab component that displays ConfigMap data keys and values.
 * Supports syntax highlighting for JSON, YAML, and properties formats.
 */
export const DataTab: React.FC<DataTabProps> = ({ data }) => {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const toggleKey = (key: string) => {
        const newExpanded = new Set(expandedKeys);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
            if (selectedKey === key) {
                setSelectedKey(null);
            }
        } else {
            newExpanded.add(key);
            setSelectedKey(key);
        }
        setExpandedKeys(newExpanded);
    };

    const dataKeys = Object.keys(data.data);
    const binaryKeys = Object.keys(data.binaryData);

    if (data.totalKeys === 0) {
        return (
            <div className="data-tab">
                <div className="empty-state">
                    <p>This ConfigMap has no data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="data-tab">
            <div className="section">
                <h2>Data</h2>
                <p className="section-description">
                    {data.totalKeys} key{data.totalKeys !== 1 ? 's' : ''} total
                    {dataKeys.length > 0 && ` (${dataKeys.length} data key${dataKeys.length !== 1 ? 's' : ''})`}
                    {binaryKeys.length > 0 && ` (${binaryKeys.length} binary key${binaryKeys.length !== 1 ? 's' : ''})`}
                </p>

                {/* Regular Data Keys */}
                {dataKeys.length > 0 && (
                    <div className="data-section">
                        <h3>Data Keys</h3>
                        <div className="data-list">
                            {dataKeys.map(key => {
                                const value = data.data[key];
                                const format = detectFormat(value);
                                const isExpanded = expandedKeys.has(key);
                                const isLong = value.length > 200;

                                return (
                                    <div key={key} className="data-item">
                                        <div 
                                            className="data-key-header"
                                            onClick={() => toggleKey(key)}
                                        >
                                            <span className="key-name">{key}</span>
                                            <span className="key-format">{format}</span>
                                            <span className="key-size">({value.length} chars)</span>
                                            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                        </div>
                                        {isExpanded && (
                                            <div className="data-value-container">
                                                <pre className={`data-value format-${format}`}>
                                                    <code>{isLong ? value.substring(0, 200) + '...' : value}</code>
                                                </pre>
                                                {isLong && (
                                                    <div className="data-value-note">
                                                        Value truncated. Full value has {value.length} characters.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Binary Data Keys */}
                {binaryKeys.length > 0 && (
                    <div className="data-section">
                        <h3>Binary Data Keys</h3>
                        <div className="data-list">
                            {binaryKeys.map(key => {
                                const value = data.binaryData[key];
                                const isExpanded = expandedKeys.has(key);
                                const displayLength = Math.min(100, value.length);

                                return (
                                    <div key={key} className="data-item">
                                        <div 
                                            className="data-key-header"
                                            onClick={() => toggleKey(key)}
                                        >
                                            <span className="key-name">{key}</span>
                                            <span className="key-format">binary</span>
                                            <span className="key-size">({value.length} chars, base64)</span>
                                            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                        </div>
                                        {isExpanded && (
                                            <div className="data-value-container">
                                                <pre className="data-value format-binary">
                                                    <code>{value.substring(0, displayLength)}{value.length > displayLength ? '...' : ''}</code>
                                                </pre>
                                                <div className="data-value-note">
                                                    Binary data (base64 encoded). Full value has {value.length} characters.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
