import React, { useState, useEffect, useCallback } from 'react';
import { ConfigMapDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { DataTab } from './components/DataTab';
import { UsageTab } from './components/UsageTab';
import { MetadataTab } from './components/MetadataTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for ConfigMap Describe webview.
 */
type ConfigMapDescribeTab = 'overview' | 'data' | 'usage' | 'metadata';

/**
 * Root component for ConfigMap Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const ConfigMapDescribeApp: React.FC = () => {
    const [configMapData, setConfigMapData] = useState<ConfigMapDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ConfigMapDescribeTab>('overview');

    // Derive loading state from configMapData and error
    const loading = configMapData === null && error === null;

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
            console.log('[ConfigMapDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updateConfigMapData':
                    setConfigMapData(message.data as ConfigMapDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setConfigMapData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[ConfigMapDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[ConfigMapDescribeApp] Cleaning up message listener');
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
    const handleTabChange = useCallback((tab: ConfigMapDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading ConfigMap details...</div>
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
    if (!configMapData) {
        return null;
    }

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
                    title={`ConfigMap / ${configMapData.overview.name}`}
                    actions={headerActions}
                    helpContext="describe-webview"
                />

                {/* Tab Navigation */}
                <nav className="tab-navigation">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
                        onClick={() => handleTabChange('data')}
                    >
                        Data ({configMapData.data.totalKeys} key{configMapData.data.totalKeys !== 1 ? 's' : ''})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => handleTabChange('usage')}
                    >
                        Usage ({configMapData.usage.totalPods} Pod{configMapData.usage.totalPods !== 1 ? 's' : ''})
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
                        <OverviewTab data={configMapData.overview} />
                    )}
                    {activeTab === 'data' && (
                        <DataTab data={configMapData.data} />
                    )}
                    {activeTab === 'usage' && (
                        <UsageTab data={configMapData.usage} namespace={configMapData.overview.namespace} />
                    )}
                    {activeTab === 'metadata' && <MetadataTab metadata={configMapData.metadata} />}
                </main>
            </div>
        </div>
    );
};
