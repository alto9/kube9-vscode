import React, { useState, useEffect, useCallback } from 'react';
import { HelmRelease, UpgradeParams, ExtensionToWebviewMessage } from '../types';
import { YAMLEditor } from './YAMLEditor';
import { getVSCodeAPI } from '../vscodeApi';

// Get shared VS Code API instance
const vscode = getVSCodeAPI();

/**
 * Props for UpgradeReleaseModal component.
 */
interface UpgradeReleaseModalProps {
    /** Release to upgrade */
    release: HelmRelease | null;
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when upgrade is triggered with parameters */
    onUpgrade: (params: UpgradeParams) => Promise<void>;
}

/**
 * UpgradeReleaseModal component for upgrading Helm releases.
 * Includes version selection, values editing, and upgrade confirmation.
 */
export const UpgradeReleaseModal: React.FC<UpgradeReleaseModalProps> = ({
    release,
    open,
    onClose,
    onUpgrade
}) => {
    const [availableVersions, setAvailableVersions] = useState<string[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [reuseValues, setReuseValues] = useState(true);
    const [customValues, setCustomValues] = useState('');
    const [currentValues, setCurrentValues] = useState('');
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [valuesValid, setValuesValid] = useState(true);

    /**
     * Reset form when modal closes.
     */
    useEffect(() => {
        if (!open) {
            setAvailableVersions([]);
            setSelectedVersion('');
            setReuseValues(true);
            setCustomValues('');
            setCurrentValues('');
            setUpgrading(false);
            setError(null);
            setLoading(false);
            setValuesValid(true);
        }
    }, [open]);

    /**
     * Fetch upgrade info when modal opens.
     */
    useEffect(() => {
        if (open && release && vscode) {
            fetchUpgradeInfo(release);
        }
    }, [open, release]);

    /**
     * Handle messages from extension.
     */
    useEffect(() => {
        if (!vscode || !open) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;

            if (message.type === 'upgradeInfoLoaded') {
                const upgradeInfo = message.data as { currentValues: string; availableVersions: string[] };
                setCurrentValues(upgradeInfo.currentValues || '');
                setAvailableVersions(upgradeInfo.availableVersions || []);
                if (upgradeInfo.availableVersions && upgradeInfo.availableVersions.length > 0) {
                    // Select first available version by default
                    setSelectedVersion(upgradeInfo.availableVersions[0]);
                }
                setLoading(false);
                setError(null);
            } else if (message.type === 'operationError' && message.operation === 'getUpgradeInfo') {
                setError(message.error || 'Failed to load upgrade information');
                setLoading(false);
            } else if (message.type === 'operationComplete' && message.operation === 'upgradeRelease') {
                setUpgrading(false);
                if (message.success) {
                    onClose();
                } else {
                    setError(message.message || 'Upgrade failed');
                }
            } else if (message.type === 'operationError' && message.operation === 'upgradeRelease') {
                setUpgrading(false);
                setError(message.error || 'Upgrade failed');
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [open, onClose]);

    /**
     * Fetch upgrade information (available versions and current values).
     */
    const fetchUpgradeInfo = useCallback((releaseToFetch: HelmRelease) => {
        if (!vscode) {
            return;
        }

        setLoading(true);
        setError(null);

        vscode.postMessage({
            command: 'getUpgradeInfo',
            name: releaseToFetch.name,
            namespace: releaseToFetch.namespace,
            chart: releaseToFetch.chart
        });
    }, []);

    /**
     * Handle upgrade button click.
     */
    const handleUpgrade = async () => {
        if (!release) {
            return;
        }

        // Validate values if not reusing
        if (!reuseValues && !valuesValid) {
            setError('Invalid YAML values. Please fix the errors before upgrading.');
            return;
        }

        setUpgrading(true);
        setError(null);

        try {
            await onUpgrade({
                releaseName: release.name,
                namespace: release.namespace,
                chart: release.chart,
                version: selectedVersion || undefined,
                reuseValues,
                values: reuseValues ? undefined : customValues.trim() || undefined
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            setUpgrading(false);
        }
    };

    /**
     * Handle YAML editor value change.
     */
    const handleValuesChange = (newValues: string, valid: boolean) => {
        setCustomValues(newValues);
        setValuesValid(valid);
        // Clear errors when user starts typing
        if (error && valid) {
            setError(null);
        }
    };

    /**
     * Handle Escape key press to close modal.
     */
    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !upgrading && !loading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, upgrading, loading, onClose]);

    /**
     * Handle overlay click to close modal.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !upgrading && !loading) {
            onClose();
        }
    };

    if (!open || !release) return null;

    const isFormValid = reuseValues || valuesValid;
    const currentVersion = release.version || 'Unknown';

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
        zIndex: 2000, // Higher than ReleaseDetailModal
        padding: '20px'
    };

    // Modal content styles
    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto'
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

    const versionInfoStyle: React.CSSProperties = {
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
    };

    const versionDisplayStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const versionValueStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const selectStyle: React.CSSProperties = {
        padding: '6px 8px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-input-foreground)',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px',
        outline: 'none',
        cursor: 'pointer',
        flex: 1
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

    const loadingContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        gap: '8px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const spinnerStyle: React.CSSProperties = {
        fontSize: '16px'
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

    const upgradeButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const upgradeButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const upgradeButtonDisabledStyle: React.CSSProperties = {
        opacity: 0.5,
        cursor: 'not-allowed'
    };

    const [cancelHovered, setCancelHovered] = useState(false);
    const [upgradeHovered, setUpgradeHovered] = useState(false);

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <h3 style={titleStyle}>Upgrade {release.name}</h3>

                {loading ? (
                    <div style={loadingContainerStyle}>
                        <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
                        <span>Loading upgrade information...</span>
                    </div>
                ) : (
                    <>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Version</label>
                            <div style={versionInfoStyle}>
                                <div style={versionDisplayStyle}>
                                    <label style={{ ...labelStyle, fontSize: '12px' }}>Current Version</label>
                                    <div style={versionValueStyle}>{currentVersion}</div>
                                </div>
                                <div style={versionDisplayStyle}>
                                    <label style={{ ...labelStyle, fontSize: '12px' }}>Upgrade To</label>
                                    <select
                                        value={selectedVersion}
                                        onChange={(e) => setSelectedVersion(e.target.value)}
                                        style={selectStyle}
                                        disabled={upgrading || availableVersions.length === 0}
                                    >
                                        {availableVersions.length === 0 ? (
                                            <option value="">No versions available</option>
                                        ) : (
                                            availableVersions.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={inputGroupStyle}>
                            <div style={checkboxContainerStyle}>
                                <input
                                    id="reuse-values"
                                    type="checkbox"
                                    checked={reuseValues}
                                    onChange={(e) => setReuseValues(e.target.checked)}
                                    style={checkboxStyle}
                                    disabled={upgrading}
                                />
                                <label style={checkboxLabelStyle} htmlFor="reuse-values">
                                    Reuse existing values
                                </label>
                            </div>
                        </div>

                        {!reuseValues && (
                            <div style={inputGroupStyle}>
                                <YAMLEditor
                                    defaultValues={currentValues}
                                    onChange={handleValuesChange}
                                />
                            </div>
                        )}

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
                                disabled={upgrading}
                            >
                                Cancel
                            </button>
                            <button
                                style={
                                    upgrading || !isFormValid || availableVersions.length === 0
                                        ? { ...upgradeButtonStyle, ...upgradeButtonDisabledStyle }
                                        : upgradeHovered
                                          ? { ...upgradeButtonStyle, ...upgradeButtonHoverStyle }
                                          : upgradeButtonStyle
                                }
                                onClick={handleUpgrade}
                                onMouseEnter={() => setUpgradeHovered(true)}
                                onMouseLeave={() => setUpgradeHovered(false)}
                                disabled={upgrading || !isFormValid || availableVersions.length === 0}
                            >
                                {upgrading ? 'Upgrading...' : 'Upgrade'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

