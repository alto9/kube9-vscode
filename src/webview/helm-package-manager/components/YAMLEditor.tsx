import React, { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';

/**
 * Props for YAMLEditor component.
 */
interface YAMLEditorProps {
    /** Default/initial YAML values */
    defaultValues: string;
    /** Callback when values change, includes validation status */
    onChange: (values: string, valid: boolean) => void;
}

/**
 * YAMLEditor component for editing YAML values with real-time validation.
 * Provides syntax validation, error display, and reset functionality.
 */
export const YAMLEditor: React.FC<YAMLEditorProps> = ({
    defaultValues,
    onChange
}) => {
    const [value, setValue] = useState(defaultValues);
    const [error, setError] = useState<string | null>(null);

    // Update value when defaultValues prop changes
    useEffect(() => {
        setValue(defaultValues);
    }, [defaultValues]);

    /**
     * Handle textarea value change with YAML validation.
     */
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);

        // Validate YAML
        try {
            // Empty YAML is valid (optional values)
            if (newValue.trim() === '') {
                setError(null);
                onChange(newValue, true);
                return;
            }

            yaml.load(newValue);
            setError(null);
            onChange(newValue, true);
        } catch (err) {
            const yamlError = err as yaml.YAMLException;
            const lineNumber = yamlError.mark?.line !== undefined ? yamlError.mark.line + 1 : 0;
            const errorMessage = lineNumber > 0
                ? `Line ${lineNumber}: ${yamlError.message}`
                : yamlError.message;
            setError(errorMessage);
            onChange(newValue, false);
        }
    };

    /**
     * Handle reset button click - restore default values.
     */
    const handleReset = () => {
        setValue(defaultValues);
        setError(null);
        // Validate default values
        try {
            if (defaultValues.trim() === '') {
                onChange(defaultValues, true);
            } else {
                yaml.load(defaultValues);
                onChange(defaultValues, true);
            }
        } catch (err) {
            // Default values should be valid, but handle edge case
            const yamlError = err as yaml.YAMLException;
            const lineNumber = yamlError.mark?.line !== undefined ? yamlError.mark.line + 1 : 0;
            const errorMessage = lineNumber > 0
                ? `Line ${lineNumber}: ${yamlError.message}`
                : yamlError.message;
            setError(errorMessage);
            onChange(defaultValues, false);
        }
    };

    // Container styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    // Header styles (label and reset button)
    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const resetButtonStyle: React.CSSProperties = {
        padding: '4px 8px',
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const resetButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    // Textarea styles
    const textareaStyle: React.CSSProperties = {
        padding: '8px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-editor-font-family, monospace)',
        color: 'var(--vscode-input-foreground)',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px',
        outline: 'none',
        minHeight: '200px',
        resize: 'vertical',
        whiteSpace: 'pre',
        wordWrap: 'normal',
        overflowWrap: 'normal',
        overflowX: 'auto'
    };

    const textareaErrorStyle: React.CSSProperties = {
        ...textareaStyle,
        borderColor: 'var(--vscode-inputValidation-errorBorder)'
    };

    // Error message styles
    const errorStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-errorForeground)',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '2px',
        padding: '8px',
        marginTop: '4px'
    };

    const [resetHovered, setResetHovered] = useState(false);

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <label style={labelStyle} htmlFor="yaml-editor">
                    Values (YAML)
                </label>
                <button
                    style={resetHovered ? { ...resetButtonStyle, ...resetButtonHoverStyle } : resetButtonStyle}
                    onClick={handleReset}
                    onMouseEnter={() => setResetHovered(true)}
                    onMouseLeave={() => setResetHovered(false)}
                    type="button"
                >
                    Reset to Defaults
                </button>
            </div>
            <textarea
                id="yaml-editor"
                value={value}
                onChange={handleChange}
                spellCheck={false}
                style={error ? textareaErrorStyle : textareaStyle}
                placeholder="Enter YAML values..."
            />
            {error && (
                <div style={errorStyle}>
                    {error}
                </div>
            )}
        </div>
    );
};

