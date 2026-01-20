import React, { useState, useEffect, useCallback } from 'react';
import { ServiceDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { EndpointsTab } from './components/EndpointsTab';
import { EventsTab } from './components/EventsTab';
import { MetadataTab } from './components/MetadataTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for Service Describe webview.
 */
type ServiceDescribeTab = 'overview' | 'endpoints' | 'events' | 'metadata';

/**
 * Root component for Service Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const ServiceDescribeApp: React.FC = () => {
    const [serviceData, setServiceData] = useState<ServiceDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ServiceDescribeTab>('overview');

    // Derive loading state from serviceData and error
    const loading = serviceData === null && error === null;

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
            console.log('[ServiceDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updateServiceData':
                    setServiceData(message.data as ServiceDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setServiceData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[ServiceDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[ServiceDescribeApp] Cleaning up message listener');
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
    const handleTabChange = useCallback((tab: ServiceDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading Service details...</div>
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
    if (!serviceData) {
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
        if (healthLower === 'healthy') return 'Service is Healthy';
        if (healthLower === 'degraded') return 'Service is Degraded';
        if (healthLower === 'unhealthy') return 'Service is Unhealthy';
        return 'Service status is Unknown';
    };

    const healthStatus = serviceData.overview.status.health || 'Unknown';

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
                    title={`Service / ${serviceData.overview.name}`}
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
                        className={`tab-btn ${activeTab === 'endpoints' ? 'active' : ''}`}
                        onClick={() => handleTabChange('endpoints')}
                    >
                        Endpoints ({serviceData.endpoints.totalEndpoints})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => handleTabChange('events')}
                    >
                        Events ({serviceData.events.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'metadata' ? 'active' : ''}`}
                        onClick={() => handleTabChange('metadata')}
                    >
                        Metadata
                    </button>
                </nav>

                {/* Tab Content */}
                <main className="tab-content">
                    {activeTab === 'overview' && (
                        <OverviewTab data={serviceData.overview} />
                    )}
                    {activeTab === 'endpoints' && (
                        <EndpointsTab data={serviceData.endpoints} />
                    )}
                    {activeTab === 'events' && <EventsTab events={serviceData.events} />}
                    {activeTab === 'metadata' && <MetadataTab metadata={serviceData.metadata} />}
                </main>
            </div>
        </div>
    );
};
