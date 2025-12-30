import React, { useEffect, useState } from 'react';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage, InitialState } from '../../types/messages';
import { Footer, Toolbar, LogDisplay } from './components';
import { PanelPreferences } from '../../utils/PreferencesManager';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * Main App component for the Pod Logs Viewer webview.
 * Manages message handling and initial state.
 */
export const App: React.FC = () => {
    const [initialState, setInitialState] = useState<InitialState | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [lineCount, setLineCount] = useState<number>(0);
    const [streamStatus, setStreamStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
    const [preferences, setPreferences] = useState<PanelPreferences | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Send message to extension
    const sendMessage = React.useCallback((message: WebviewToExtensionMessage) => {
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
            console.log('[PodLogsApp] Received message:', message.type);

            switch (message.type) {
                case 'initialState':
                    setInitialState(message.data);
                    setPreferences(message.data.preferences);
                    break;
                case 'logData':
                    // Append new log data and update line count
                    setLogs(prev => [...prev, ...message.data]);
                    setLineCount(prev => prev + message.data.length);
                    console.log('[PodLogsApp] Received logData:', message.data.length, 'lines');
                    break;
                case 'streamStatus':
                    // Update stream status
                    setStreamStatus(message.status);
                    console.log('[PodLogsApp] Stream status:', message.status);
                    break;
                default:
                    console.log('[PodLogsApp] Unknown message type:', message);
            }
        };

        window.addEventListener('message', handleMessage);

        // Send ready message on mount
        sendMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

    // Toolbar handlers
    const handleContainerChange = React.useCallback((container: string) => {
        // TODO: Implement container change in future story
        console.log('[PodLogsApp] Container change requested:', container);
        sendMessage({ type: 'refresh' });
    }, [sendMessage]);

    const handleLineLimitChange = React.useCallback((limit: number | 'all') => {
        // TODO: Implement line limit change in future story
        console.log('[PodLogsApp] Line limit change requested:', limit);
        if (preferences) {
            setPreferences({ ...preferences, lineLimit: limit });
        }
    }, [preferences]);

    const handleToggleTimestamps = React.useCallback(() => {
        if (preferences) {
            const newPrefs = { ...preferences, showTimestamps: !preferences.showTimestamps };
            setPreferences(newPrefs);
            // TODO: Send preference update to extension in future story
        }
    }, [preferences]);

    const handleToggleFollow = React.useCallback(() => {
        if (preferences) {
            const newFollowMode = !preferences.followMode;
            const newPrefs = { ...preferences, followMode: newFollowMode };
            setPreferences(newPrefs);
            sendMessage({ type: 'toggleFollow', enabled: newFollowMode });
        }
    }, [preferences, sendMessage]);

    const handleTogglePrevious = React.useCallback(() => {
        if (preferences) {
            const newPrefs = { ...preferences, showPrevious: !preferences.showPrevious };
            setPreferences(newPrefs);
            // TODO: Send preference update to extension in future story
            sendMessage({ type: 'refresh' });
        }
    }, [preferences, sendMessage]);

    const handleRefresh = React.useCallback(() => {
        sendMessage({ type: 'refresh' });
    }, [sendMessage]);

    const handleClear = React.useCallback(() => {
        // Clear logs from display
        setLogs([]);
        setLineCount(0);
    }, []);

    const handleScrollUp = React.useCallback(() => {
        // Disable follow mode when user scrolls up
        if (preferences && preferences.followMode) {
            const newPrefs = { ...preferences, followMode: false };
            setPreferences(newPrefs);
            sendMessage({ type: 'toggleFollow', enabled: false });
        }
    }, [preferences, sendMessage]);

    const handleCopy = React.useCallback(() => {
        // TODO: Implement copy action in future story
        console.log('[PodLogsApp] Copy requested');
    }, []);

    const handleExport = React.useCallback(() => {
        // TODO: Implement export action in future story
        console.log('[PodLogsApp] Export requested');
    }, []);

    const handleSearch = React.useCallback(() => {
        // TODO: Implement search UI in future story
        // For now, search query can be set via state when search UI is implemented
        console.log('[PodLogsApp] Search requested');
    }, []);

    return (
        <div className="pod-logs-viewer">
            {initialState && preferences ? (
                <Toolbar
                    pod={initialState.pod}
                    containers={initialState.containers}
                    preferences={preferences}
                    onContainerChange={handleContainerChange}
                    onLineLimitChange={handleLineLimitChange}
                    onToggleTimestamps={handleToggleTimestamps}
                    onToggleFollow={handleToggleFollow}
                    onTogglePrevious={handleTogglePrevious}
                    onRefresh={handleRefresh}
                    onClear={handleClear}
                    onCopy={handleCopy}
                    onExport={handleExport}
                    onSearch={handleSearch}
                />
            ) : (
                <div className="loading-state">
                    <p>Loading...</p>
                </div>
            )}
            {initialState && preferences && (
                <LogDisplay
                    logs={logs}
                    showTimestamps={preferences.showTimestamps}
                    followMode={preferences.followMode}
                    searchQuery={searchQuery}
                    onScrollUp={handleScrollUp}
                />
            )}
            <Footer lineCount={lineCount} streamStatus={streamStatus} />
        </div>
    );
};

