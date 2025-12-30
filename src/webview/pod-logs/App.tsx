import React, { useEffect, useState } from 'react';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage, InitialState } from '../../types/messages';
import { Footer, Toolbar, LogDisplay, SearchBar } from './components';
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
    const [searchVisible, setSearchVisible] = useState<boolean>(false);
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

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

    // Search logic: find matching log lines
    useEffect(() => {
        if (!searchQuery || searchQuery.trim() === '') {
            setSearchMatches([]);
            setCurrentMatchIndex(0);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const matches: number[] = [];

        logs.forEach((log, index) => {
            const parsed = log.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/);
            const content = parsed ? parsed[2] : log;
            
            if (content.toLowerCase().includes(lowerQuery)) {
                matches.push(index);
            }
        });

        setSearchMatches(matches);
        // Reset to first match when query changes
        setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
    }, [searchQuery, logs]);

    // Keyboard shortcuts: Ctrl+F / Cmd+F to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setSearchVisible(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Toolbar handlers
    const handleContainerChange = React.useCallback((container: string) => {
        // TODO: Implement container change in future story
        console.log('[PodLogsApp] Container change requested:', container);
        sendMessage({ type: 'refresh' });
    }, [sendMessage]);

    const handleLineLimitChange = React.useCallback((limit: number | 'all' | 'custom') => {
        console.log('[PodLogsApp] Line limit change requested:', limit);
        // Send message to extension to handle line limit change
        // Extension will handle custom input prompt if needed
        sendMessage({ type: 'setLineLimit', limit });
    }, [sendMessage]);

    const handleToggleTimestamps = React.useCallback(() => {
        if (preferences) {
            const newShowTimestamps = !preferences.showTimestamps;
            const newPrefs = { ...preferences, showTimestamps: newShowTimestamps };
            setPreferences(newPrefs);
            sendMessage({ type: 'toggleTimestamps', enabled: newShowTimestamps });
        }
    }, [preferences, sendMessage]);

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
        if (!preferences || logs.length === 0) {
            console.log('[PodLogsApp] Copy requested but no logs or preferences available');
            return;
        }

        // Parse and format logs based on timestamp preference
        const formattedLines = logs.map(line => {
            // Parse timestamp if present in format: 2024-12-29T10:30:45.123Z <content>
            const timestampRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/;
            const match = line.match(timestampRegex);
            
            if (match) {
                const [, timestamp, content] = match;
                // Include timestamp if preference is enabled
                return preferences.showTimestamps ? `${timestamp} ${content}` : content;
            }
            
            // No timestamp in log line, return as-is
            return line;
        });

        // Send copy message to extension
        sendMessage({
            type: 'copy',
            lines: formattedLines,
            includeTimestamps: preferences.showTimestamps
        });
    }, [logs, preferences, sendMessage]);

    const handleExport = React.useCallback(() => {
        if (!initialState || !preferences) {
            console.log('[PodLogsApp] Cannot export: initialState or preferences not available');
            return;
        }
        
        sendMessage({
            type: 'export',
            lines: logs,
            podName: initialState.pod.name,
            containerName: initialState.pod.container,
            includeTimestamps: preferences.showTimestamps
        });
    }, [logs, initialState, preferences, sendMessage]);

    const handleSearchOpen = React.useCallback(() => {
        setSearchVisible(true);
    }, []);

    const handleSearchClose = React.useCallback(() => {
        setSearchVisible(false);
        setSearchQuery('');
        setSearchMatches([]);
        setCurrentMatchIndex(0);
    }, []);

    const handleSearchQueryChange = React.useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    const handleNextMatch = React.useCallback(() => {
        if (searchMatches.length === 0) {
            return;
        }
        const nextIndex = currentMatchIndex < searchMatches.length - 1 
            ? currentMatchIndex + 1 
            : 0; // Wrap around to first match
        setCurrentMatchIndex(nextIndex);
    }, [searchMatches, currentMatchIndex]);

    const handlePreviousMatch = React.useCallback(() => {
        if (searchMatches.length === 0) {
            return;
        }
        const prevIndex = currentMatchIndex > 0 
            ? currentMatchIndex - 1 
            : searchMatches.length - 1; // Wrap around to last match
        setCurrentMatchIndex(prevIndex);
    }, [searchMatches, currentMatchIndex]);

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
                    onSearch={handleSearchOpen}
                />
            ) : (
                <div className="loading-state">
                    <p>Loading...</p>
                </div>
            )}
            {searchVisible && initialState && preferences && (
                <SearchBar
                    query={searchQuery}
                    matches={searchMatches}
                    currentMatchIndex={currentMatchIndex >= 0 ? currentMatchIndex : 0}
                    onQueryChange={handleSearchQueryChange}
                    onNextMatch={handleNextMatch}
                    onPreviousMatch={handlePreviousMatch}
                    onClose={handleSearchClose}
                />
            )}
            {initialState && preferences && (
                <LogDisplay
                    logs={logs}
                    showTimestamps={preferences.showTimestamps}
                    followMode={preferences.followMode}
                    searchQuery={searchQuery}
                    searchMatches={searchMatches}
                    currentMatchIndex={currentMatchIndex}
                    onScrollUp={handleScrollUp}
                />
            )}
            <Footer lineCount={lineCount} streamStatus={streamStatus} />
        </div>
    );
};

