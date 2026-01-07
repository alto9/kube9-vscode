import React, { useState, useEffect } from 'react';
import { InstallParams } from '../types';

// Declare vscode for TypeScript
declare const vscode: {
    postMessage: (message: any) => void;
} | undefined;

/**
 * Props for OperatorInstallModal component.
 */
interface OperatorInstallModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when installation completes */
    onInstalled: () => void;
}

/**
 * OperatorInstallModal component for installing the Kube9 Operator.
 * Provides pre-filled defaults and optional Pro tier API key entry.
 */
export const OperatorInstallModal: React.FC<OperatorInstallModalProps> = ({
    open,
    onClose,
    onInstalled
}) => {
    const [namespace, setNamespace] = useState('kube9-system');
    const [createNamespace, setCreateNamespace] = useState(true);
    const [apiKey, setApiKey] = useState('');
    const [showProSection, setShowProSection] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setNamespace('kube9-system');
            setCreateNamespace(true);
            setApiKey('');
            setShowProSection(false);
            setInstalling(false);
            setProgress(0);
            setError(null);
        }
    }, [open]);

    // Listen for progress updates and completion messages
    useEffect(() => {
        if (!open || !vscode) return;

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            if (message.type === 'operationProgress' && message.operation === 'installOperator') {
                if (message.progress !== undefined) {
                    setProgress(message.progress);
                }
            } else if (message.type === 'operationComplete' && message.operation === 'installOperator') {
                setInstalling(false);
                setProgress(100);
                onInstalled();
                onClose();
            } else if (message.type === 'operationError' && message.operation === 'installOperator') {
                setInstalling(false);
                setError(message.error || 'Installation failed');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [open, onClose, onInstalled]);

    /**
     * Handle install button click.
     */
    const handleInstall = async () => {
        if (!vscode) {
            setError('VS Code API not available');
            return;
        }

        setInstalling(true);
        setError(null);
        setProgress(0);

        try {
            // Step 1: Ensure kube9 repository (10%)
            setProgress(10);
            vscode.postMessage({ command: 'ensureKube9Repository' });
            
            // Wait a bit for repository operations
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 2: Repository updated (20%)
            setProgress(20);
            
            // Step 3: Prepare installation params (30%)
            setProgress(30);
            const installParams: InstallParams = {
                chart: 'kube9/kube9-operator',
                releaseName: 'kube9-operator',
                namespace: namespace.trim(),
                createNamespace,
                wait: true,
                timeout: '5m',
                values: apiKey.trim() ? `apiKey: ${apiKey.trim()}` : undefined
            };
            
            // Send install command
            vscode.postMessage({ 
                command: 'installOperator', 
                params: installParams 
            });
            
            // Progress will be updated via message handler
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            setInstalling(false);
        }
    };

    /**
     * Handle namespace input change.
     */
    const handleNamespaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNamespace(e.target.value);
        if (error) {
            setError(null);
        }
    };

    /**
     * Handle create namespace checkbox change.
     */
    const handleCreateNamespaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateNamespace(e.target.checked);
    };

    /**
     * Handle API key input change.
     */
    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
    };

    /**
     * Handle external link click.
     */
    const handleGetApiKeyClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (vscode) {
            vscode.postMessage({ 
                command: 'openExternalLink', 
                url: 'https://portal.kube9.dev' 
            });
        } else {
            window.open('https://portal.kube9.dev', '_blank');
        }
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

    if (!open) return null;

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
        zIndex: 2000,
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

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '8px'
    };

    const logoStyle: React.CSSProperties = {
        fontSize: '32px',
        lineHeight: '1',
        flexShrink: 0
    };

    const headerContentStyle: React.CSSProperties = {
        flex: 1
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        marginBottom: '4px'
    };

    const subtitleStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-descriptionForeground)',
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

    const inputDisabledStyle: React.CSSProperties = {
        ...inputStyle,
        opacity: 0.6,
        cursor: 'not-allowed'
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

    const proSectionStyle: React.CSSProperties = {
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '12px',
        marginTop: '8px'
    };

    const expandButtonStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 12px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        fontWeight: 500,
        backgroundColor: 'transparent',
        color: 'var(--vscode-foreground)',
        border: 'none',
        borderRadius: '2px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left'
    };

    const expandButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-hoverBackground)'
    };

    const proContentStyle: React.CSSProperties = {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--vscode-panel-border)'
    };

    const listStyle: React.CSSProperties = {
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: '8px 0',
        paddingLeft: '20px'
    };

    const linkStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-textLink-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        textDecoration: 'none',
        cursor: 'pointer',
        marginTop: '4px',
        display: 'inline-block'
    };

    const progressBarContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '24px',
        backgroundColor: 'var(--vscode-progressBar-background)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '8px'
    };

    const progressBarFillStyle: React.CSSProperties = {
        height: '100%',
        backgroundColor: 'var(--vscode-progressBar-background)',
        transition: 'width 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        color: 'var(--vscode-progressBar-foreground)',
        fontWeight: 500
    };

    const progressTextStyle: React.CSSProperties = {
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        fontFamily: 'var(--vscode-font-family)',
        marginTop: '4px'
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
    const [expandHovered, setExpandHovered] = useState(false);

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div style={logoStyle}>🎯</div>
                    <div style={headerContentStyle}>
                        <h3 style={titleStyle}>Install Kube9 Operator</h3>
                        <p style={subtitleStyle}>Advanced Kubernetes management for VS Code</p>
                    </div>
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Release Name</label>
                    <input
                        type="text"
                        value="kube9-operator"
                        disabled
                        style={inputDisabledStyle}
                    />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>Namespace</label>
                    <input
                        type="text"
                        value={namespace}
                        onChange={handleNamespaceChange}
                        style={inputStyle}
                        disabled={installing}
                        placeholder="kube9-system"
                    />
                    <div style={checkboxContainerStyle}>
                        <input
                            type="checkbox"
                            checked={createNamespace}
                            onChange={handleCreateNamespaceChange}
                            style={checkboxStyle}
                            disabled={installing}
                            id="create-namespace"
                        />
                        <label style={checkboxLabelStyle} htmlFor="create-namespace">
                            Create namespace if it doesn't exist
                        </label>
                    </div>
                </div>

                <div style={proSectionStyle}>
                    <button
                        style={expandHovered ? { ...expandButtonStyle, ...expandButtonHoverStyle } : expandButtonStyle}
                        onClick={() => setShowProSection(!showProSection)}
                        onMouseEnter={() => setExpandHovered(true)}
                        onMouseLeave={() => setExpandHovered(false)}
                        disabled={installing}
                    >
                        <span>⭐ Pro Tier</span>
                        <span>{showProSection ? '▼' : '▶'}</span>
                    </button>

                    {showProSection && (
                        <div style={proContentStyle}>
                            <p style={{ fontSize: '13px', color: 'var(--vscode-foreground)', margin: '0 0 8px 0', fontFamily: 'var(--vscode-font-family)' }}>
                                Enable advanced features with a Pro API key:
                            </p>
                            <ul style={listStyle}>
                                <li>AI-powered cluster insights</li>
                                <li>Predictive resource recommendations</li>
                                <li>Advanced security scanning</li>
                                <li>Priority support</li>
                            </ul>

                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>API Key (Optional)</label>
                                <input
                                    type="password"
                                    placeholder="kdy_prod_..."
                                    value={apiKey}
                                    onChange={handleApiKeyChange}
                                    style={inputStyle}
                                    disabled={installing}
                                />
                                <a
                                    href="#"
                                    style={linkStyle}
                                    onClick={handleGetApiKeyClick}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.textDecoration = 'underline';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.textDecoration = 'none';
                                    }}
                                >
                                    Get your API key →
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {installing && (
                    <div>
                        <div style={progressBarContainerStyle}>
                            <div style={{ ...progressBarFillStyle, width: `${progress}%` }}>
                                {progress > 0 && `${progress}%`}
                            </div>
                        </div>
                        <div style={progressTextStyle}>
                            {progress < 20 ? 'Preparing installation...' :
                             progress < 30 ? 'Installing operator...' :
                             progress < 100 ? 'Installing operator...' :
                             'Installation complete!'}
                        </div>
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
                        disabled={installing}
                    >
                        Cancel
                    </button>
                    <button
                        style={
                            installing
                                ? { ...installButtonStyle, ...installButtonDisabledStyle }
                                : installHovered
                                  ? { ...installButtonStyle, ...installButtonHoverStyle }
                                  : installButtonStyle
                        }
                        onClick={handleInstall}
                        onMouseEnter={() => setInstallHovered(true)}
                        onMouseLeave={() => setInstallHovered(false)}
                        disabled={installing}
                    >
                        {installing ? 'Installing...' : 'Install Operator'}
                    </button>
                </div>
            </div>
        </div>
    );
};

