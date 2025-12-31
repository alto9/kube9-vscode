import React, { useState, useEffect, useCallback } from 'react';
import { PodDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';

// Acquire VS Code API
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

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

    return (
        <div className="pod-describe-container">
            <header className="pod-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1>{podData.overview.name}</h1>
                    <div className={getStatusBadgeClass(podData.overview.status.health)}>
                        {podData.overview.status.health}
                    </div>
                </div>
                <div className="header-actions">
                    <button className="header-btn" onClick={handleRefresh}>
                        Refresh
                    </button>
                    <button className="header-btn" onClick={handleViewYaml}>
                        View YAML
                    </button>
                </div>
            </header>

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

            <main className="tab-content">
                {activeTab === 'overview' && (
                    <div>
                        <p>Overview tab content will be implemented in a later story.</p>
                    </div>
                )}
                {activeTab === 'containers' && (
                    <div>
                        <p>Containers tab content will be implemented in a later story.</p>
                    </div>
                )}
                {activeTab === 'conditions' && (
                    <div>
                        <p>Conditions tab content will be implemented in a later story.</p>
                    </div>
                )}
                {activeTab === 'events' && (
                    <div>
                        <p>Events tab content will be implemented in a later story.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

