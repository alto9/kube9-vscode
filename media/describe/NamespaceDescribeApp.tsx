import React, { useState, useEffect, useCallback } from 'react';
import { 
    NamespaceDescribeData, 
    ExtensionToWebviewMessage, 
    WebviewToExtensionMessage, 
    VSCodeAPI,
    TabType
} from './types';
import { OverviewTab } from './components/OverviewTab';
import { ResourcesTab } from './components/ResourcesTab';

/**
 * Root component for Namespace Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const NamespaceDescribeApp: React.FC<{vscode: VSCodeAPI}> = ({vscode}) => {
    const [namespaceData, setNamespaceData] = useState<NamespaceDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Derive loading state from namespaceData and error
    const loading = namespaceData === null && error === null;

    // Send message to extension
    const sendMessage = useCallback((message: WebviewToExtensionMessage) => {
        vscode.postMessage(message);
    }, [vscode]);

    // Handle messages from extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            console.log('[NamespaceDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updateNamespaceData':
                    setNamespaceData(message.data as NamespaceDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setNamespaceData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[NamespaceDescribeApp] Sending ready message');
        sendMessage({ command: 'refresh' });

        return () => {
            console.log('[NamespaceDescribeApp] Cleaning up message listener');
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

    // Handle refresh button click
    const handleRefresh = useCallback(() => {
        sendMessage({ command: 'refresh' });
    }, [sendMessage]);

    // Handle view YAML button click
    const handleViewYaml = useCallback(() => {
        sendMessage({ command: 'viewYaml' });
    }, [sendMessage]);

    // Handle set as default namespace button click
    const handleSetDefaultNamespace = useCallback(() => {
        if (namespaceData) {
            sendMessage({ 
                command: 'setDefaultNamespace', 
                data: { namespace: namespaceData.overview.name } 
            });
        }
    }, [sendMessage, namespaceData]);

    // Handle tab change
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
    }, []);

    // Calculate resource count for badge
    const getResourceCount = (data: NamespaceDescribeData): number => {
        const resources = data.resources;
        return (
            resources.pods.total +
            resources.deployments +
            resources.statefulSets +
            resources.daemonSets +
            resources.services.total +
            resources.configMaps +
            resources.secrets +
            resources.ingresses +
            resources.jobs.total +
            resources.cronJobs +
            resources.persistentVolumeClaims.total +
            resources.replicaSets +
            resources.endpoints +
            resources.networkPolicies +
            resources.serviceAccounts +
            resources.roles +
            resources.roleBindings
        );
    };

    // Get status badge class name based on phase
    const getStatusBadgeClass = (phase: string): string => {
        const phaseLower = phase.toLowerCase();
        return `status-badge ${phaseLower}`;
    };

    // Render loading state
    if (loading) {
        return (
            <div className="namespace-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading Namespace details...</div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="namespace-describe-container">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <div className="error-message">{error}</div>
                </div>
            </div>
        );
    }

    // Render main UI
    if (!namespaceData) {
        return null;
    }

    // Get status banner class and content
    const getStatusBannerClass = (phase: string): string => {
        const phaseLower = phase.toLowerCase();
        return `status-banner status-${phaseLower}`;
    };

    const getStatusIcon = (phase: string): string => {
        const phaseLower = phase.toLowerCase();
        if (phaseLower === 'active') return '✓';
        if (phaseLower === 'terminating') return '⚠';
        return '?';
    };

    const getStatusText = (phase: string): string => {
        const phaseLower = phase.toLowerCase();
        if (phaseLower === 'active') return 'Namespace is Active';
        if (phaseLower === 'terminating') return 'Namespace is Terminating';
        return 'Namespace status is Unknown';
    };

    const phase = namespaceData.overview.phase;
    const resourceCount = getResourceCount(namespaceData);

    return (
        <div className="namespace-describe-container">
            <div className="container">
                {/* Header */}
                <div className="node-header">
                    <h1 className="node-title">
                        Namespace / <span className="node-name">{namespaceData.overview.name}</span>
                    </h1>
                    <div className="header-actions">
                        <button className="action-btn" onClick={handleRefresh}>
                            <span className="btn-icon">🔄</span>
                            <span className="btn-text">Refresh</span>
                        </button>
                        <button className="action-btn" onClick={handleViewYaml}>
                            <span className="btn-icon">📄</span>
                            <span className="btn-text">View YAML</span>
                        </button>
                        <button className="action-btn" onClick={handleSetDefaultNamespace}>
                            <span className="btn-icon">⭐</span>
                            <span className="btn-text">Set as Default</span>
                        </button>
                    </div>
                </div>

                {/* Status Banner */}
                <div className={getStatusBannerClass(phase)}>
                    <span className="status-icon">{getStatusIcon(phase)}</span>
                    <span className="status-text">{getStatusText(phase)}</span>
                </div>

                {/* Tab Navigation */}
                <nav className="tab-navigation">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
                        onClick={() => handleTabChange('resources')}
                    >
                        Resources ({resourceCount})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'quotas' ? 'active' : ''}`}
                        onClick={() => handleTabChange('quotas')}
                    >
                        Quotas ({namespaceData.quotas.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'limitRanges' ? 'active' : ''}`}
                        onClick={() => handleTabChange('limitRanges')}
                    >
                        Limit Ranges ({namespaceData.limitRanges.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => handleTabChange('events')}
                    >
                        Events ({namespaceData.events.length})
                    </button>
                </nav>

                {/* Tab Content */}
                <main className="tab-content">
                    {activeTab === 'overview' && (
                        <OverviewTab 
                            data={namespaceData.overview} 
                            metadata={namespaceData.metadata} 
                        />
                    )}
                    {activeTab === 'resources' && (
                        <ResourcesTab 
                            resources={namespaceData.resources}
                            namespace={namespaceData.overview.name}
                            vscode={vscode}
                        />
                    )}
                    {activeTab === 'quotas' && (
                        <div className="tab-placeholder">
                            <p>Quotas tab content will be implemented in story 010</p>
                        </div>
                    )}
                    {activeTab === 'limitRanges' && (
                        <div className="tab-placeholder">
                            <p>Limit Ranges tab content will be implemented in story 011</p>
                        </div>
                    )}
                    {activeTab === 'events' && (
                        <div className="tab-placeholder">
                            <p>Events tab content will be implemented in story 012</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

