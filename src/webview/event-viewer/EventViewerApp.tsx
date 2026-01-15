import React, { useState, useEffect, useCallback } from 'react';
import { KubernetesEvent, EventFilters, ExtensionMessage, WebviewMessage } from '../../types/Events';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { ExportButton } from './components/ExportButton';
import { ThreePaneLayout } from './components/ThreePaneLayout';
import { StatusBar } from './components/StatusBar';
import { SearchBox } from './components/SearchBox';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * State interface for EventViewerApp component.
 */
interface EventViewerState {
    events: KubernetesEvent[];
    filteredEvents: KubernetesEvent[];
    filters: EventFilters;
    selectedEvent: KubernetesEvent | null;
    loading: boolean;
    error: string | null;
    autoRefreshEnabled: boolean;
    clusterContext: string;
}

/**
 * Root component for Events Viewer webview.
 * Manages all UI state, message handling, and renders child components.
 */
export const EventViewerApp: React.FC = () => {
    const [state, setState] = useState<EventViewerState>({
        events: [],
        filteredEvents: [],
        filters: {},
        selectedEvent: null,
        loading: true,
        error: null,
        autoRefreshEnabled: false,
        clusterContext: ''
    });

    // Send message to extension
    const sendMessage = useCallback((message: WebviewMessage) => {
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
            const message = event.data as ExtensionMessage;
            console.log('[EventViewerApp] Received message:', message.type);

            switch (message.type) {
                case 'initialState':
                    setState(prev => ({
                        ...prev,
                        clusterContext: message.clusterContext,
                        filters: message.filters,
                        autoRefreshEnabled: message.autoRefreshEnabled
                    }));
                    break;

                case 'events':
                    setState(prev => ({
                        ...prev,
                        events: message.events,
                        filteredEvents: message.events,
                        loading: false,
                        error: null
                    }));
                    break;

                case 'loading':
                    setState(prev => ({
                        ...prev,
                        loading: message.loading
                    }));
                    break;

                case 'error':
                    setState(prev => ({
                        ...prev,
                        error: message.error,
                        loading: false
                    }));
                    break;

                case 'autoRefreshState':
                    setState(prev => ({
                        ...prev,
                        autoRefreshEnabled: message.enabled
                    }));
                    break;

                case 'autoRefreshInterval':
                    // Interval updates are handled by extension, no state change needed
                    break;

                default:
                    console.log('Unknown message type:', (message as any).type);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[EventViewerApp] Sending ready message');
        sendMessage({ type: 'ready' });

        return () => {
            console.log('[EventViewerApp] Cleaning up message listener');
            window.removeEventListener('message', handleMessage);
        };
    }, []); // Empty deps - only run once on mount

    // Handle refresh action
    const handleRefresh = useCallback(() => {
        sendMessage({ type: 'refresh' });
    }, [sendMessage]);

    // Handle filter change
    const handleFilterChange = useCallback((filters: EventFilters) => {
        setState(prev => ({ ...prev, filters }));
        sendMessage({ type: 'filter', filters });
    }, [sendMessage]);

    // Handle export action
    const handleExport = useCallback((format: 'json' | 'csv') => {
        sendMessage({
            type: 'export',
            format,
            events: state.filteredEvents
        });
    }, [sendMessage, state.filteredEvents]);

    // Handle toggle auto-refresh
    const handleToggleAutoRefresh = useCallback(() => {
        const newState = !state.autoRefreshEnabled;
        sendMessage({
            type: 'toggleAutoRefresh',
            enabled: newState
        });
    }, [sendMessage, state.autoRefreshEnabled]);

    // Handle event selection
    const handleEventSelect = useCallback((event: KubernetesEvent) => {
        setState(prev => ({ ...prev, selectedEvent: event }));
    }, []);

    // Check if any filters are active
    const hasActiveFilters = Object.keys(state.filters).length > 0 && 
        Object.values(state.filters).some(value => value !== undefined && value !== '' && value !== 'all');

    // Build header actions
    const headerActions: WebviewHeaderAction[] = [
        {
            label: 'Refresh',
            icon: 'codicon-refresh',
            onClick: handleRefresh
        },
        {
            label: `Auto-refresh: ${state.autoRefreshEnabled ? 'On' : 'Off'}`,
            icon: state.autoRefreshEnabled ? 'codicon-debug-pause' : 'codicon-debug-start',
            onClick: handleToggleAutoRefresh
        },
        {
            label: 'Clear Filters',
            icon: 'codicon-clear-all',
            onClick: () => handleFilterChange({}),
            disabled: !hasActiveFilters
        }
    ];

    return (
        <div className="event-viewer-app">
            <WebviewHeader
                title="Events Viewer"
                actions={headerActions}
                helpContext="events-viewer"
            />
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 16px',
                borderBottom: '1px solid var(--vscode-panel-border)',
                backgroundColor: 'var(--vscode-editor-background)',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExportButton onExport={handleExport} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SearchBox 
                        value={state.filters.searchText || ''}
                        onChange={(text) => handleFilterChange({ ...state.filters, searchText: text })}
                    />
                </div>
            </div>
            <ThreePaneLayout
                events={state.filteredEvents}
                selectedEvent={state.selectedEvent}
                onEventSelect={handleEventSelect}
                filters={state.filters}
                onFilterChange={handleFilterChange}
                loading={state.loading}
                error={state.error}
                sendMessage={sendMessage}
                onRetry={handleRefresh}
            />
            <StatusBar
                eventCount={state.filteredEvents.length}
                totalCount={state.events.length}
                filters={state.filters}
                autoRefreshEnabled={state.autoRefreshEnabled}
            />
        </div>
    );
};

