import React, { useState, useEffect, useCallback } from 'react';
import { ChartSearchResult, ChartDetails, VSCodeAPI, ExtensionToWebviewMessage, InstallParams } from '../types';
import { ReadmeViewer } from './ReadmeViewer';
import { ValuesViewer } from './ValuesViewer';
import { VersionsList } from './VersionsList';
import { InstallChartModal } from './InstallChartModal';

// Acquire VS Code API
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * Tab type for Chart Detail Modal.
 */
type ChartDetailTab = 'readme' | 'values' | 'versions';

/**
 * Props for ChartDetailModal component.
 */
interface ChartDetailModalProps {
    /** Chart search result to display */
    chart: ChartSearchResult | null;
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when install button is clicked */
    onInstall: (chart: ChartSearchResult) => void;
}

/**
 * ChartDetailModal component for displaying detailed chart information.
 * Shows README, values, and versions in a tabbed interface.
 */
export const ChartDetailModal: React.FC<ChartDetailModalProps> = ({
    chart,
    open,
    onClose,
    onInstall
}) => {
    const [details, setDetails] = useState<ChartDetails | null>(null);
    const [activeTab, setActiveTab] = useState<ChartDetailTab>('readme');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [installModalOpen, setInstallModalOpen] = useState(false);
    const [namespaces, setNamespaces] = useState<string[]>(['default']);

    /**
     * Fetch chart details from extension.
     */
    const fetchChartDetails = useCallback(async (chartToFetch: ChartSearchResult, version?: string) => {
        if (!vscode) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Send message to extension to fetch details
            // For now, use the chart name as-is (version support can be added to backend later)
            // The chart name format is typically "repository/chart" or just "chart"
            vscode.postMessage({ command: 'getChartDetails', chart: chartToFetch.name });
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
            
            if (message.type === 'chartDetails') {
                setDetails(message.data as ChartDetails);
                setLoading(false);
                setError(null);
            } else if (message.type === 'namespacesLoaded') {
                const namespaceList = message.data as string[];
                setNamespaces(namespaceList.length > 0 ? namespaceList : ['default']);
            } else if (message.type === 'operationError') {
                setError(message.error || 'Failed to load chart details');
                setLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [open]);

    /**
     * Fetch details when modal opens or chart changes.
     */
    useEffect(() => {
        if (open && chart) {
            fetchChartDetails(chart, selectedVersion || undefined);
        }
    }, [open, chart, selectedVersion, fetchChartDetails]);

    /**
     * Reset state when modal closes.
     */
    useEffect(() => {
        if (!open) {
            setDetails(null);
            setError(null);
            setLoading(false);
            setActiveTab('readme');
            setSelectedVersion(null);
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
     * Handle version change.
     */
    const handleVersionChange = useCallback((version: string) => {
        setSelectedVersion(version);
        // Details will be re-fetched via useEffect
    }, []);

    /**
     * Handle retry button click.
     */
    const handleRetry = useCallback(() => {
        if (chart) {
            fetchChartDetails(chart, selectedVersion || undefined);
        }
    }, [chart, selectedVersion, fetchChartDetails]);

    /**
     * Handle install button click - open install modal and fetch namespaces.
     */
    const handleInstallClick = useCallback(() => {
        if (!vscode || !chart) {
            return;
        }

        // Fetch namespaces from extension
        vscode.postMessage({ command: 'getNamespaces' });
        
        // Open install modal
        setInstallModalOpen(true);
    }, [chart]);

    /**
     * Handle install modal close.
     */
    const handleInstallModalClose = useCallback(() => {
        setInstallModalOpen(false);
    }, []);

    /**
     * Handle install from modal - forward to parent's onInstall.
     * Note: The parent's onInstall currently expects ChartSearchResult, but
     * the actual installation with params will be implemented in story 012.
     * For now, we call the parent handler with the chart to maintain compatibility.
     */
    const handleInstall = useCallback(async (params: InstallParams) => {
        // The actual installation with params will be handled in story 012
        // For now, call parent's onInstall with the chart to maintain compatibility
        if (onInstall && chart) {
            await onInstall(chart);
        }
    }, [chart, onInstall]);

    if (!open || !chart) return null;

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
        zIndex: 1000,
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
        flex: 1
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

    const [installHovered, setInstallHovered] = useState(false);
    const [closeHovered, setCloseHovered] = useState(false);
    const [retryHovered, setRetryHovered] = useState(false);

    const chartName = chart.name || chart.chart || 'Unknown Chart';
    const isInstallDisabled = loading || !details;

    return (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <h2 style={titleStyle}>{chartName}</h2>
                    <div style={headerActionsStyle}>
                        <button
                            style={
                                isInstallDisabled
                                    ? { ...installButtonStyle, ...installButtonDisabledStyle }
                                    : installHovered
                                      ? { ...installButtonStyle, ...installButtonHoverStyle }
                                      : installButtonStyle
                            }
                            onClick={handleInstallClick}
                            onMouseEnter={() => setInstallHovered(true)}
                            onMouseLeave={() => setInstallHovered(false)}
                            disabled={isInstallDisabled}
                        >
                            Install
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
                        style={activeTab === 'readme' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('readme')}
                    >
                        README
                    </button>
                    <button
                        style={activeTab === 'values' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('values')}
                    >
                        Values
                    </button>
                    <button
                        style={activeTab === 'versions' ? tabButtonActiveStyle : tabButtonStyle}
                        onClick={() => setActiveTab('versions')}
                    >
                        Versions
                    </button>
                </nav>

                {/* Tab Content */}
                <div style={tabContentStyle}>
                    {loading && (
                        <div style={loadingContainerStyle}>
                            <span className="codicon codicon-loading codicon-modifier-spin" style={spinnerStyle}></span>
                            <div>Loading chart details...</div>
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
                            {activeTab === 'readme' && <ReadmeViewer markdown={details.readme} />}
                            {activeTab === 'values' && <ValuesViewer yaml={details.values} />}
                            {activeTab === 'versions' && (
                                <VersionsList
                                    versions={details.versions}
                                    selectedVersion={selectedVersion || chart.version}
                                    onVersionChange={handleVersionChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Install Chart Modal */}
            <InstallChartModal
                chart={chart}
                open={installModalOpen}
                namespaces={namespaces}
                onClose={handleInstallModalClose}
                onInstall={handleInstall}
            />
        </div>
    );
};

