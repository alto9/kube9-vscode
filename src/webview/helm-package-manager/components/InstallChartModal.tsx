import React, { useState, useEffect } from 'react';
import { ChartSearchResult, InstallParams } from '../types';
import { YAMLEditor } from './YAMLEditor';

/**
 * Props for InstallChartModal component.
 */
interface InstallChartModalProps {
    /** Chart search result to install */
    chart: ChartSearchResult | null;
    /** Whether the modal is open */
    open: boolean;
    /** Array of available namespace names */
    namespaces: string[];
    /** Default YAML values for the chart */
    defaultValues?: string;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when install is triggered with parameters */
    onInstall: (params: InstallParams) => Promise<void>;
}

/**
 * InstallChartModal component for configuring Helm chart installation.
 * Includes release name input, namespace selection, and validation.
 */
export const InstallChartModal: React.FC<InstallChartModalProps> = ({
    chart,
    open,
    namespaces,
    defaultValues = '',
    onClose,
    onInstall
}) => {
    const [releaseName, setReleaseName] = useState('');
    const [namespace, setNamespace] = useState('default');
    const [createNamespace, setCreateNamespace] = useState(false);
    const [values, setValues] = useState('');
    const [valuesValid, setValuesValid] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setReleaseName('');
            setNamespace('default');
            setCreateNamespace(false);
            setValues(defaultValues || '');
            setValuesValid(true);
            setInstalling(false);
            setError(null);
        }
    }, [open, defaultValues]);

    // Auto-generate release name when modal opens with a chart
    useEffect(() => {
        if (open && chart) {
            // Generate release name from chart name
            const generated = chart.chart.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            setReleaseName(generated);
            // Initialize values with defaults
            setValues(defaultValues || '');
            setValuesValid(true);
        }
    }, [open, chart, defaultValues]);

    /**
     * Validate release name format.
     * Returns error message or null if valid.
     */
    const validateReleaseName = (name: string): string | null => {
        if (!name.trim()) {
            return 'Release name is required';
        }
        if (!/^[a-z0-9-]+$/.test(name)) {
            return 'Release name must contain only lowercase letters, numbers, and hyphens';
        }
        return null;
    };

    /**
     * Handle install button click.
     */
    const handleInstall = async () => {
        if (!chart) {
            return;
        }

        // Validate release name
        const nameError = validateReleaseName(releaseName);
        if (nameError) {
            setError(nameError);
            return;
        }

        setInstalling(true);
        setError(null);

        try {
            await onInstall({
                chart: chart.repository ? `${chart.repository}/${chart.chart}` : chart.chart,
                releaseName: releaseName.trim(),
                namespace: namespace.trim(),
                createNamespace,
                values: values.trim() || undefined
            });
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
        } finally {
            setInstalling(false);
        }
    };

    /**
     * Handle release name input change.
     */
    const handleReleaseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReleaseName(e.target.value);
        // Clear errors when user starts typing
        if (error) {
            setError(null);
        }
    };

    /**
     * Handle namespace selection change.
     */
    const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setNamespace(e.target.value);
    };

    /**
     * Handle create namespace checkbox change.
     */
    const handleCreateNamespaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateNamespace(e.target.checked);
    };

    /**
     * Handle Escape key press to close modal.
     */
    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !installing) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, installing, onClose]);

    /**
     * Handle overlay click to close modal.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !installing) {
            onClose();
        }
    };

    if (!open || !chart) return null;

    const chartName = chart.chart || chart.name || 'Unknown Chart';
    const isFormValid = releaseName.trim() && !validateReleaseName(releaseName) && valuesValid;

    /**
     * Handle YAML editor value change.
     */
    const handleValuesChange = (newValues: string, valid: boolean) => {
        setValues(newValues);
        setValuesValid(valid);
    };

    // Modal overlay styles
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000, // Higher than ChartDetailModal
        padding: '20px'
    };

    // Modal content styles
    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0
    };

    const inputGroupStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const inputStyle: React.CSSProperties = {
        padding: '6px 8px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-input-foreground)',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px',
        outline: 'none'
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        cursor: 'pointer'
    };

    const inputFocusStyle: React.CSSProperties = {
        borderColor: 'var(--vscode-focusBorder)'
    };

    const checkboxContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '4px'
    };

    const checkboxLabelStyle: React.CSSProperties = {
        ...labelStyle,
        fontWeight: 400,
        cursor: 'pointer',
        margin: 0
    };

    const checkboxStyle: React.CSSProperties = {
        cursor: 'pointer',
        width: '16px',
        height: '16px'
    };

    const errorMessageStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-errorForeground)',
        fontFamily: 'var(--vscode-font-family)',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '2px',
        padding: '8px',
        marginTop: '4px'
    };

    const actionsStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '8px'
    };

    const buttonStyle: React.CSSProperties = {
        padding: '6px 12px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    const cancelButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const installButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const installButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const installButtonDisabledStyle: React.CSSProperties = {
        opacity: 0.5,
        cursor: 'not-allowed'
    };

    const [cancelHovered, setCancelHovered] = useState(false);
    const [installHovered, setInstallHovered] = useState(false);
    const [releaseNameFocused, setReleaseNameFocused] = useState(false);
    const [namespaceFocused, setNamespaceFocused] = useState(false);

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <h3 style={titleStyle}>Install {chartName}</h3>

                <div style={inputGroupStyle}>
                    <label style={labelStyle} htmlFor="release-name">
                        Release Name
                    </label>
                    <input
                        id="release-name"
                        type="text"
                        placeholder="my-release"
                        value={releaseName}
                        onChange={handleReleaseNameChange}
                        onBlur={() => {
                            const validationError = validateReleaseName(releaseName);
                            if (validationError) {
                                setError(validationError);
                            }
                        }}
                        onFocus={() => {
                            setReleaseNameFocused(true);
                            if (error) {
                                setError(null);
                            }
                        }}
                        style={releaseNameFocused ? { ...inputStyle, ...inputFocusStyle } : inputStyle}
                        disabled={installing}
                        autoFocus
                    />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle} htmlFor="namespace">
                        Namespace
                    </label>
                    <select
                        id="namespace"
                        value={namespace}
                        onChange={handleNamespaceChange}
                        onFocus={() => setNamespaceFocused(true)}
                        style={namespaceFocused ? { ...selectStyle, ...inputFocusStyle } : selectStyle}
                        disabled={installing}
                    >
                        {namespaces.length > 0 ? (
                            namespaces.map(ns => (
                                <option key={ns} value={ns}>
                                    {ns}
                                </option>
                            ))
                        ) : (
                            <option value="default">default</option>
                        )}
                    </select>
                    <div style={checkboxContainerStyle}>
                        <input
                            id="create-namespace"
                            type="checkbox"
                            checked={createNamespace}
                            onChange={handleCreateNamespaceChange}
                            style={checkboxStyle}
                            disabled={installing}
                        />
                        <label style={checkboxLabelStyle} htmlFor="create-namespace">
                            Create namespace if it doesn't exist
                        </label>
                    </div>
                </div>

                <YAMLEditor
                    defaultValues={defaultValues || ''}
                    onChange={handleValuesChange}
                />

                {error && (
                    <div style={errorMessageStyle}>
                        {error}
                    </div>
                )}

                <div style={actionsStyle}>
                    <button
                        style={cancelHovered ? { ...cancelButtonStyle, ...cancelButtonHoverStyle } : cancelButtonStyle}
                        onClick={onClose}
                        onMouseEnter={() => setCancelHovered(true)}
                        onMouseLeave={() => setCancelHovered(false)}
                        disabled={installing}
                    >
                        Cancel
                    </button>
                    <button
                        style={
                            installing || !isFormValid
                                ? { ...installButtonStyle, ...installButtonDisabledStyle }
                                : installHovered
                                  ? { ...installButtonStyle, ...installButtonHoverStyle }
                                  : installButtonStyle
                        }
                        onClick={handleInstall}
                        onMouseEnter={() => setInstallHovered(true)}
                        onMouseLeave={() => setInstallHovered(false)}
                        disabled={installing || !isFormValid}
                    >
                        {installing ? 'Installing...' : 'Install'}
                    </button>
                </div>
            </div>
        </div>
    );
};

