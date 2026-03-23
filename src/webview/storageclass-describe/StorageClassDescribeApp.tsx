import React, { useState, useEffect, useCallback } from 'react';
import { StorageClassDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { ParametersTab } from './components/ParametersTab';
import { UsageTab } from './components/UsageTab';
import { EventsTab } from './components/EventsTab';
import { MetadataTab } from './components/MetadataTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for StorageClass Describe webview.
 */
type StorageClassDescribeTab = 'overview' | 'parameters' | 'usage' | 'events' | 'metadata';

/**
 * Root component for StorageClass Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const StorageClassDescribeApp: React.FC = () => {
    const [scData, setScData] = useState<StorageClassDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<StorageClassDescribeTab>('overview');

    // Derive loading state from scData and error
    const loading = scData === null && error === null;

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
            console.log('[StorageClassDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updateStorageClassData':
                    setScData(message.data as StorageClassDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setScData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[StorageClassDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[StorageClassDescribeApp] Cleaning up message listener');
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
    const handleTabChange = useCallback((tab: StorageClassDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading StorageClass details...</div>
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
    if (!scData) {
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
                    title={`StorageClass / ${scData.overview.name}`}
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
                        className={`tab-btn ${activeTab === 'parameters' ? 'active' : ''}`}
                        onClick={() => handleTabChange('parameters')}
                    >
                        Parameters
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => handleTabChange('usage')}
                    >
                        Usage ({scData.usage.totalPVCs} PVC{scData.usage.totalPVCs !== 1 ? 's' : ''})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => handleTabChange('events')}
                    >
                        Events ({scData.events.length})
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
                        <OverviewTab data={scData.overview} />
                    )}
                    {activeTab === 'parameters' && (
                        <ParametersTab data={scData.parameters} />
                    )}
                    {activeTab === 'usage' && (
                        <UsageTab data={scData.usage} />
                    )}
                    {activeTab === 'events' && (
                        <EventsTab events={scData.events} />
                    )}
                    {activeTab === 'metadata' && (
                        <MetadataTab metadata={scData.metadata} />
                    )}
                </main>
            </div>
        </div>
    );
};
