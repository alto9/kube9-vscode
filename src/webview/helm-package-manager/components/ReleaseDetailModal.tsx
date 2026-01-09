import React, { useState, useEffect, useCallback } from 'react';
import { HelmRelease, ReleaseDetails, ExtensionToWebviewMessage, UpgradeParams } from '../types';
import { ReleaseInfoTab } from './ReleaseInfoTab';
import { ManifestViewer } from './ManifestViewer';
import { ValuesViewer } from './ValuesViewer';
import { HistoryTab } from './HistoryTab';
import { UpgradeReleaseModal } from './UpgradeReleaseModal';
import { getVSCodeAPI } from '../vscodeApi';

// Get shared VS Code API instance
const vscode = getVSCodeAPI();

/**
 * Tab type for Release Detail Modal.
 */
type ReleaseDetailTab = 'info' | 'manifest' | 'values' | 'history';

/**
 * Props for ReleaseDetailModal component.
 */
interface ReleaseDetailModalProps {
    /** Release to display details for */
    release: HelmRelease | null;
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when upgrade button is clicked */
    onUpgrade: (release: HelmRelease) => void;
    /** Callback when rollback button is clicked */
    onRollback: (release: HelmRelease, revision: number) => void;
    /** Callback when uninstall button is clicked */
    onUninstall: (release: HelmRelease) => void;
}

/**
 * ReleaseDetailModal component for displaying detailed release information.
 * Shows Info, Manifest, Values, and History in a tabbed interface.
 */
export const ReleaseDetailModal: React.FC<ReleaseDetailModalProps> = ({
    release,
    open,
    onClose,
    onUpgrade,
    onRollback,
    onUninstall
}) => {
    const [details, setDetails] = useState<ReleaseDetails | null>(null);
    const [activeTab, setActiveTab] = useState<ReleaseDetailTab>('info');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeHovered, setUpgradeHovered] = useState(false);
    const [uninstallHovered, setUninstallHovered] = useState(false);
    const [closeHovered, setCloseHovered] = useState(false);
    const [retryHovered, setRetryHovered] = useState(false);

    /**
     * Fetch release details from extension.
     */
    const fetchReleaseDetails = useCallback(async (releaseToFetch: HelmRelease) => {
        if (!vscode) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            vscode.postMessage({
                command: 'getReleaseDetails',
                name: releaseToFetch.name,
                namespace: releaseToFetch.namespace
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            setLoading(false);
        }
    }, []);

    /**
     * Handle messages from extension.
     */
    useEffect(() => {
        if (!vscode || !open) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            
            if (message.type === 'releaseDetailsLoaded') {
                setDetails(message.data as ReleaseDetails);
                setLoading(false);
                setError(null);
            } else if (message.type === 'operationError') {
                setError(message.error || 'Failed to load release details');
                setLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [open]);

    /**
     * Fetch details when modal opens or release changes.
     */
    useEffect(() => {
        if (open && release) {
            fetchReleaseDetails(release);
        }
    }, [open, release, fetchReleaseDetails]);

    /**
     * Reset state when modal closes.
     */
    useEffect(() => {
        if (!open) {
            setDetails(null);
            setError(null);
            setLoading(false);
            setActiveTab('info');
        }
    }, [open]);

    /**
     * Handle Escape key press to close modal.
     */
    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, loading, onClose]);

    /**
     * Handle overlay click to close modal.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    /**
     * Handle retry button click.
     */
    const handleRetry = useCallback(() => {
        if (release) {
            fetchReleaseDetails(release);
        }
    }, [release, fetchReleaseDetails]);

    /**
     * Handle copy action.
     */
    const handleCopy = useCallback((content: string) => {
        if (vscode) {
            vscode.postMessage({
                command: 'copyValue',
                value: content
            });
        }
    }, []);

    if (!open || !release) return null;

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

    // Modal content styles - large width for documentation
    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: 0,
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    };

    // Modal header styles
    const headerStyle: React.CSSProperties = {
        padding: '16px 24px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
    };

    const titleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        margin: 0,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    const namespaceBadgeStyle: React.CSSProperties = {
        padding: '2px 8px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        fontSize: '12px',
        fontWeight: 500
    };

    const headerActionsStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
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

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)'
    };

    const primaryButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    };

    const secondaryButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-secondaryHoverBackground)'
    };

    const closeButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'transparent',
        color: 'var(--vscode-foreground)',
        fontSize: '20px',
        padding: '0 8px',
        minWidth: '32px'
    };

    const closeButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-list-hoverBackground)'
    };

    // Tab navigation styles
    const tabNavStyle: React.CSSProperties = {
        display: 'flex',
        borderBottom: '1px solid var(--vscode-panel-border)',
        padding: '0 24px',
        gap: '0'
    };

    const tabButtonStyle: React.CSSProperties = {
        padding: '10px 16px',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease'
    };

    const tabButtonActiveStyle: React.CSSProperties = {
        ...tabButtonStyle,
        borderBottomColor: 'var(--vscode-focusBorder)',
        fontWeight: 600
    };

    // Tab content styles
    const tabContentStyle: React.CSSProperties = {
        padding: '24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0
    };

    // Loading and error styles
    const loadingContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '12px',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)'
    };

    const spinnerStyle: React.CSSProperties = {
        fontSize: '24px'
    };

    const errorContainerStyle: React.CSSProperties = {
        padding: '20px',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '4px',
        color: 'var(--vscode-errorForeground)',
        fontFamily: 'var(--vscode-font-family)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const retryButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        alignSelf: 'flex-start'
    };

    const retryButtonHoverStyle: React.CSSProperties = {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    };

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={titleStyle}>
                        <span>{release.name}</span>
                        <span style={namespaceBadgeStyle}>{release.namespace}</span>
                    </div>
                    <div style={headerActionsStyle}>
                        <button
                            style={
                                upgradeHovered
                                    ? { ...primaryButtonStyle, ...primaryButtonHoverStyle }
                                    : primaryButtonStyle
                            }
                            onClick={() => setUpgradeModalOpen(true)}
                            onMouseEnter={() => setUpgradeHovered(true)}
                            onMouseLeave={() => setUpgradeHovered(false)}
                            disabled={loading}
                        >
                            Upgrade
                        </button>
                        <button
                            style={
                                uninstallHovered
                                    ? { ...secondaryButtonStyle, ...secondaryButtonHoverStyle }
                                    : secondaryButtonStyle
                            }
                            onClick={() => onUninstall(release)}
                            onMouseEnter={() => setUninstallHovered(true)}
                            onMouseLeave={() => setUninstallHovered(false)}
                            disabled={loading}
                        >
                            Uninstall
                        </button>
                        <button
                            style={closeHovered ? { ...closeButtonStyle, ...closeButtonHoverStyle } : closeButtonStyle}
                            onClick={onClose}
                            onMouseEnter={() => setCloseHovered(true)}
                            onMouseLeave={() => setCloseHovered(false)}
                            disabled={loading}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <nav style={tabNavStyle}>
                    <button
                        style={activeTab === 'info' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('info')}
                    >
                        Info
                    </button>
                    <button
                        style={activeTab === 'manifest' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('manifest')}
                    >
                        Manifest
                    </button>
                    <button
                        style={activeTab === 'values' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('values')}
                    >
                        Values
                    </button>
                    <button
                        style={activeTab === 'history' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </nav>

                {/* Tab Content */}
                <div style={tabContentStyle}>
                    {loading && (
                        <div style={loadingContainerStyle}>
                            <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
                            <div>Loading release details...</div>
                        </div>
                    )}

                    {error && (
                        <div style={errorContainerStyle}>
                            <div>{error}</div>
                            <button
                                style={retryHovered ? { ...retryButtonStyle, ...retryButtonHoverStyle } : retryButtonStyle}
                                onClick={handleRetry}
                                onMouseEnter={() => setRetryHovered(true)}
                                onMouseLeave={() => setRetryHovered(false)}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && details && (
                        <>
                            {activeTab === 'info' && <ReleaseInfoTab details={details} release={release} />}
                            {activeTab === 'manifest' && <ManifestViewer manifest={details.manifest} onCopy={handleCopy} />}
                            {activeTab === 'values' && <ValuesViewer yaml={details.values} onCopy={handleCopy} />}
                            {activeTab === 'history' && (
                                <HistoryTab
                                    history={details.history}
                                    currentRevision={details.revision}
                                    onRollback={(revision) => onRollback(release, revision)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Upgrade Release Modal */}
            {release && (
                <UpgradeReleaseModal
                    release={release}
                    open={upgradeModalOpen}
                    onClose={() => {
                        setUpgradeModalOpen(false);
                        // Refresh release details after upgrade
                        if (release) {
                            fetchReleaseDetails(release);
                        }
                    }}
                    onUpgrade={async (params: UpgradeParams) => {
                        // Send upgrade command via vscode API
                        if (vscode) {
                            vscode.postMessage({
                                command: 'upgradeRelease',
                                params
                            });
                        }
                        // Wait for operationComplete message (handled in modal)
                    }}
                />
            )}
        </div>
    );
};

