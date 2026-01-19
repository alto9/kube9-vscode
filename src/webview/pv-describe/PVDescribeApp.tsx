import React, { useState, useEffect, useCallback } from 'react';
import { PVDescribeData, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { OverviewTab } from './components/OverviewTab';
import { SourceDetailsTab } from './components/SourceDetailsTab';
import { BindingTab } from './components/BindingTab';
import { EventsTab } from './components/EventsTab';
import { MetadataTab } from './components/MetadataTab';

// Acquire VS Code API and expose on window for shared use
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;
if (vscode && typeof window !== 'undefined') {
    (window as any).vscodeApi = vscode;
}

/**
 * Tab type for PV Describe webview.
 */
type PVDescribeTab = 'overview' | 'sourceDetails' | 'binding' | 'events' | 'metadata';

/**
 * Root component for PV Describe webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const PVDescribeApp: React.FC = () => {
    const [pvData, setPvData] = useState<PVDescribeData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<PVDescribeTab>('overview');

    // Derive loading state from pvData and error
    const loading = pvData === null && error === null;

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
            console.log('[PVDescribeApp] Received message:', message.command);

            switch (message.command) {
                case 'updatePVData':
                    setPvData(message.data as PVDescribeData);
                    setError(null);
                    break;

                case 'showError':
                    setError((message.data as { message: string }).message);
                    setPvData(null);
                    break;

                default:
                    console.log('Unknown message command:', (message as any).command);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[PVDescribeApp] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[PVDescribeApp] Cleaning up message listener');
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
    const handleTabChange = useCallback((tab: PVDescribeTab) => {
        setActiveTab(tab);
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="pod-describe-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading PV details...</div>
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
                    <button className="retry-button" onClick={handleRefresh}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Render main content
    if (!pvData) {
        return null;
    }

    const headerActions: WebviewHeaderAction[] = [
        {
            icon: 'refresh',
            label: 'Refresh',
            onClick: handleRefresh
        },
        {
            icon: 'code',
            label: 'View YAML',
            onClick: handleViewYaml
        }
    ];

    return (
        <div className="pod-describe-container">
            <WebviewHeader
                title={`PersistentVolume / ${pvData.overview.name}`}
                actions={headerActions}
            />
            <div className="tab-bar">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-button ${activeTab === 'sourceDetails' ? 'active' : ''}`}
                    onClick={() => handleTabChange('sourceDetails')}
                >
                    Source Details
                </button>
                <button
                    className={`tab-button ${activeTab === 'binding' ? 'active' : ''}`}
                    onClick={() => handleTabChange('binding')}
                >
                    Binding
                </button>
                <button
                    className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => handleTabChange('events')}
                >
                    Events
                </button>
                <button
                    className={`tab-button ${activeTab === 'metadata' ? 'active' : ''}`}
                    onClick={() => handleTabChange('metadata')}
                >
                    Metadata
                </button>
            </div>
            <div className="tab-content">
                {activeTab === 'overview' && <OverviewTab data={pvData.overview} />}
                {activeTab === 'sourceDetails' && <SourceDetailsTab data={pvData.sourceDetails} />}
                {activeTab === 'binding' && <BindingTab data={pvData.binding} pvName={pvData.overview.name} />}
                {activeTab === 'events' && <EventsTab events={pvData.events} />}
                {activeTab === 'metadata' && <MetadataTab metadata={pvData.metadata} />}
            </div>
        </div>
    );
};
