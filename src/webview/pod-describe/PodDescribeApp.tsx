import React, { useState, useEffect, useCallback } from 'react';
import { PodDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { EventsTab } from './components/EventsTab';
import { ContainersTab } from './components/ContainersTab';
import { ConditionsTab } from './components/ConditionsTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for Pod Describe webview.
 */
type PodDescribeTab = 'overview' | 'containers' | 'conditions' | 'events';

/**
 * Root component for Pod Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const PodDescribeApp: React.FC = () => {
    const [podData, setPodData] = useState<PodDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<PodDescribeTab>('overview');

    // Derive loading state from podData and error
    const loading = podData === null && error === null;

    // Send message to extension
    const sendMessage = useCallback((message: WebviewToExtensionMessage) => {
        if (vscode) {
            vscode.postMessage(message);
        }
    }, []);

    // Handle messages from extension
    useEffect(() => {
        if (!vscode) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            console.log('[PodDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updatePodData':
                    setPodData(message.data as PodDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setPodData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[PodDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[PodDescribeApp] Cleaning up message listener');
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

    // Handle tab change
    const handleTabChange = useCallback((tab: PodDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Get status badge class name based on health status
    const getStatusBadgeClass = (health: string): string => {
        return `status-badge ${health.toLowerCase()}`;
    };

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading Pod details...</div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="pod-describe-container">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <div className="error-message">{error}</div>
                </div>
            </div>
        );
    }

    // Render main UI
    if (!podData) {
        return null;
    }

    // Get status banner class and content
    const getStatusBannerClass = (health: string): string => {
        const healthLower = health.toLowerCase();
        return `status-banner status-${healthLower}`;
    };

    const getStatusIcon = (health: string): string => {
        const healthLower = health.toLowerCase();
        if (healthLower === 'healthy') return '✓';
        if (healthLower === 'degraded') return '⚠';
        if (healthLower === 'unhealthy') return '⚠';
        return '?';
    };

    const getStatusText = (health: string): string => {
        const healthLower = health.toLowerCase();
        if (healthLower === 'healthy') return 'Pod is Healthy';
        if (healthLower === 'degraded') return 'Pod is Degraded';
        if (healthLower === 'unhealthy') return 'Pod is Unhealthy';
        return 'Pod status is Unknown';
    };

    const healthStatus = podData.overview.status.health || 'Unknown';

    const headerActions: WebviewHeaderAction[] = [
        {
            label: 'Refresh',
            icon: 'codicon-refresh',
            onClick: handleRefresh
        },
        {
            label: 'View YAML',
            icon: 'codicon-file-code',
            onClick: handleViewYaml
        }
    ];

    return (
        <div className="pod-describe-container">
            <div className="container">
                {/* Header */}
                <WebviewHeader
                    title={`Pod / ${podData.overview.name}`}
                    actions={headerActions}
                    helpContext="describe-webview"
                />

                {/* Status Banner */}
                <div className={getStatusBannerClass(healthStatus)}>
                    <span className="status-icon">{getStatusIcon(healthStatus)}</span>
                    <span className="status-text">{getStatusText(healthStatus)}</span>
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
                        className={`tab-btn ${activeTab === 'containers' ? 'active' : ''}`}
                        onClick={() => handleTabChange('containers')}
                    >
                        Containers ({podData.containers.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
                        onClick={() => handleTabChange('conditions')}
                    >
                        Conditions
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => handleTabChange('events')}
                    >
                        Events ({podData.events.length})
                    </button>
                </nav>

                {/* Tab Content */}
                <main className="tab-content">
                    {activeTab === 'overview' && (
                        <OverviewTab data={podData.overview} />
                    )}
                    {activeTab === 'containers' && (
                        <ContainersTab 
                            containers={podData.containers} 
                            initContainers={podData.initContainers} 
                        />
                    )}
                    {activeTab === 'conditions' && (
                        <ConditionsTab conditions={podData.conditions} />
                    )}
                    {activeTab === 'events' && <EventsTab events={podData.events} />}
                </main>
            </div>
        </div>
    );
};

