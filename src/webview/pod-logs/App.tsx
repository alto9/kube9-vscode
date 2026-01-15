import React, { useEffect, useState } from 'react';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage, InitialState } from '../../types/messages';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { Footer } from './components/Footer';
import { Toolbar } from './components/Toolbar';
import { LogDisplay } from './components/LogDisplay';
import { SearchBar } from './components/SearchBar';
import { LoadingState, EmptyState, ErrorState } from './components/StateDisplay';
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
    const [streamStatus, setStreamStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'error'>('disconnected');
    const [preferences, setPreferences] = useState<PanelPreferences | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchVisible, setSearchVisible] = useState<boolean>(false);
    const [searchMatches, setSearchMatches] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
    const [viewState, setViewState] = useState<'loading' | 'loaded' | 'empty' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [announcement, setAnnouncement] = useState<string>('');

    // Send message to extension
    const sendMessage = React.useCallback((message: WebviewToExtensionMessage) => {
        if (vscode) {
            vscode.postMessage(message);
        }
    }, []);

    // Handle messages from extension
    useEffect(() => {
        if (!vscode) {
            console.error('[PodLogsApp] vscode API not available!');
            return;
        }

        console.log('[PodLogsApp] Setting up message listener');

        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            console.log('[PodLogsApp] Received message:', message.type, message);

            switch (message.type) {
                case 'initialState':
                    setInitialState(message.data);
                    setPreferences(message.data.preferences);
                    // Keep viewState as 'loading' - waiting for logs
                    break;
                case 'logData':
                    // Append new log data and update line count
                    setLogs(prev => {
                        const newLogs = [...prev, ...message.data];
                        // Transition to 'loaded' if we were loading or empty and now have data
                        if (message.data.length > 0) {
                            setViewState(currentState => {
                                if (currentState === 'loading' || currentState === 'empty') {
                                    return 'loaded';
                                }
                                return currentState;
                            });
                        }
                        return newLogs;
                    });
                    setLineCount(prev => prev + message.data.length);
                    console.log('[PodLogsApp] Received logData:', message.data.length, 'lines');
                    break;
                case 'streamStatus':
                    // Update stream status
                    setStreamStatus(message.status);
                    console.log('[PodLogsApp] Stream status:', message.status);
                    
                    // Announce status changes for accessibility
                    if (message.status === 'connected') {
                        setAnnouncement('Logs streaming');
                    } else if (message.status === 'disconnected') {
                        setAnnouncement('Logs paused');
                    } else if (message.status === 'reconnecting') {
                        setAnnouncement('Connection lost. Reconnecting...');
                    } else if (message.status === 'error') {
                        setAnnouncement('Connection error');
                    }
                    
                    // Handle state transitions based on stream status
                    if (message.status === 'error') {
                        // Only set error state if we don't have a specific error message
                        if (!errorMessage) {
                            setViewState('error');
                            setErrorMessage('Failed to fetch logs. Please check your connection and try again.');
                        }
                    } else if (message.status === 'reconnecting') {
                        // Keep logs visible during reconnection, don't change viewState
                        // Footer will show reconnecting status
                    } else if (message.status === 'connected') {
                        // Transition from error/reconnecting to loaded when connected
                        setViewState(currentState => {
                            if (currentState === 'error' || currentState === 'loading') {
                                // If we have logs, show loaded, otherwise keep loading
                                return logs.length > 0 ? 'loaded' : 'loading';
                            }
                            return currentState;
                        });
                        // Clear error message on successful connection
                        if (errorMessage) {
                            setErrorMessage('');
                        }
                    } else if (message.status === 'disconnected') {
                        // Keep current state, just update status
                    }
                    break;
                case 'error':
                    // Handle specific error messages
                    setErrorMessage(message.error);
                    setViewState('error');
                    // Update stream status based on error type
                    if (message.errorType === 'podNotFound' || message.errorType === 'permissionDenied') {
                        // These errors don't trigger reconnection, so status is error
                        setStreamStatus('error');
                    } else if (message.errorType === 'maxReconnectAttempts') {
                        // Max attempts reached, status is error
                        setStreamStatus('error');
                    }
                    break;
                default:
                    console.log('[PodLogsApp] Unknown message type:', message);
            }
        };

        window.addEventListener('message', handleMessage);

        // Send ready message on mount
        console.log('[PodLogsApp] Sending ready message to extension');
        sendMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

    // Check for empty state when stream disconnects with no logs
    useEffect(() => {
        if (streamStatus === 'disconnected' && logs.length === 0 && viewState === 'loading') {
            setViewState('empty');
        }
    }, [streamStatus, logs.length, viewState]);

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

    // Toolbar handlers
    const handleContainerChange = React.useCallback((container: string) => {
        console.log('[PodLogsApp] Container change requested:', container);
        
        // Clear existing logs
        setLogs([]);
        setLineCount(0);
        
        // Update pod state with new container
        if (initialState) {
            setInitialState({
                ...initialState,
                pod: {
                    ...initialState.pod,
                    container: container === 'all' ? 'all' : container
                }
            });
        }
        
        // Send switchContainer message to extension
        sendMessage({ type: 'switchContainer', container: container === 'all' ? 'all' : container });
    }, [initialState, sendMessage]);

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
            const newShowPrevious = !preferences.showPrevious;
            const newPrefs = { ...preferences, showPrevious: newShowPrevious };
            setPreferences(newPrefs);
            sendMessage({ type: 'setPrevious', enabled: newShowPrevious });
        }
    }, [preferences, sendMessage]);

    const handleRefresh = React.useCallback(() => {
        // Clear logs and reset to loading state when retrying
        setLogs([]);
        setLineCount(0);
        setViewState('loading');
        setErrorMessage('');
        setAnnouncement('Logs refreshed');
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

        // Announce copy action
        setAnnouncement('Logs copied to clipboard');

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
        setAnnouncement('Search opened');
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

    // Keyboard shortcuts: Ctrl+F / Cmd+F to open search, Ctrl+R / Cmd+R to refresh, Ctrl+Shift+C / Cmd+Shift+C to copy
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+F / Cmd+F: Open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
                e.preventDefault();
                handleSearchOpen();
            }
            // Ctrl+R / Cmd+R: Refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
                e.preventDefault();
                handleRefresh();
            }
            // Ctrl+Shift+C / Cmd+Shift+C: Copy
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
                e.preventDefault();
                handleCopy();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleSearchOpen, handleRefresh, handleCopy]);

    // Build header actions
    const headerActions: WebviewHeaderAction[] = [];
    if (initialState && preferences) {
        headerActions.push(
            {
                label: 'Refresh',
                icon: 'codicon-refresh',
                onClick: handleRefresh
            },
            {
                label: 'Clear',
                icon: 'codicon-clear-all',
                onClick: handleClear
            },
            {
                label: 'Copy',
                icon: 'codicon-copy',
                onClick: handleCopy
            },
            {
                label: 'Export',
                icon: 'codicon-save',
                onClick: handleExport
            },
            {
                label: 'Search',
                icon: 'codicon-search',
                onClick: handleSearchOpen
            }
        );
    }

    const podTitle = initialState?.pod 
        ? `Pod Logs: ${initialState.pod.name}${initialState.pod.container && initialState.pod.container !== 'all' ? ` (${initialState.pod.container})` : ''}`
        : 'Pod Logs';

    return (
        <div className="pod-logs-viewer">
            <WebviewHeader
                title={podTitle}
                actions={headerActions}
                helpContext="pod-logs"
            />
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
            ) : null}
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
            {preferences?.showPrevious && (
                <div className="previous-logs-badge">
                    ⚠ Viewing previous container logs
                </div>
            )}
            {viewState === 'loading' && <LoadingState />}
            {viewState === 'empty' && <EmptyState />}
            {viewState === 'error' && <ErrorState error={errorMessage} onRetry={handleRefresh} />}
            {viewState === 'loaded' && initialState && preferences && (
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
            <Footer 
                lineCount={lineCount} 
                streamStatus={streamStatus}
                reconnecting={streamStatus === 'reconnecting'}
            />
            {/* ARIA live region for screen reader announcements */}
            <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true" 
                className="sr-only"
            >
                {announcement}
            </div>
        </div>
    );
};

