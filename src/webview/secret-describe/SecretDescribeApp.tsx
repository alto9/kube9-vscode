import React, { useState, useEffect, useCallback } from 'react';
import { SecretDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { KeysTab } from './components/KeysTab';
import { UsageTab } from './components/UsageTab';
import { EventsTab } from './components/EventsTab';
import { MetadataTab } from './components/MetadataTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for Secret Describe webview.
 */
type SecretDescribeTab = 'overview' | 'keys' | 'usage' | 'events' | 'metadata';

/**
 * Root component for Secret Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const SecretDescribeApp: React.FC = () => {
    const [secretData, setSecretData] = useState<SecretDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SecretDescribeTab>('overview');

    // Derive loading state from secretData and error
    const loading = secretData === null && error === null;

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
            console.log('[SecretDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updateSecretData':
                    setSecretData(message.data as SecretDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setSecretData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[SecretDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[SecretDescribeApp] Cleaning up message listener');
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
    const handleTabChange = useCallback((tab: SecretDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading Secret details...</div>
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
    if (!secretData) {
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
                {/* Security Warning Banner */}
                <div className="status-banner status-warning" style={{ backgroundColor: 'var(--vscode-inputValidation-warningBackground)', borderColor: 'var(--vscode-inputValidation-warningBorder)' }}>
                    <span className="status-icon">🔒</span>
                    <span className="status-text">Viewing Secret data. Values are hidden by default for security.</span>
                </div>

                {/* Header */}
                <WebviewHeader
                    title={`Secret / ${secretData.overview.name}`}
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
                        className={`tab-btn ${activeTab === 'keys' ? 'active' : ''}`}
                        onClick={() => handleTabChange('keys')}
                    >
                        Keys ({secretData.keys.totalKeys})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => handleTabChange('usage')}
                    >
                        Usage ({secretData.usage.totalPods} Pod{secretData.usage.totalPods !== 1 ? 's' : ''})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => handleTabChange('events')}
                    >
                        Events ({secretData.events.length})
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
                        <OverviewTab data={secretData.overview} />
                    )}
                    {activeTab === 'keys' && (
                        <KeysTab data={secretData.keys} />
                    )}
                    {activeTab === 'usage' && (
                        <UsageTab data={secretData.usage} namespace={secretData.overview.namespace} />
                    )}
                    {activeTab === 'events' && <EventsTab events={secretData.events} />}
                    {activeTab === 'metadata' && <MetadataTab metadata={secretData.metadata} />}
                </main>
            </div>
        </div>
    );
};
