import React, { useState, useEffect, useCallback } from 'react';
import { KubernetesEvent, EventFilters } from '../../types/Events';
import { Toolbar } from './components/Toolbar';
import { ThreePaneLayout } from './components/ThreePaneLayout';
import { StatusBar } from './components/StatusBar';

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
 * Message types sent from extension to webview.
 */
type ExtensionMessage =
    | { type: 'initialState'; clusterContext: string; filters: EventFilters; autoRefreshEnabled: boolean }
    | { type: 'events'; events: KubernetesEvent[]; loading: false }
    | { type: 'loading'; loading: boolean }
    | { type: 'error'; error: string; loading: false }
    | { type: 'autoRefreshState'; enabled: boolean }
    | { type: 'autoRefreshInterval'; interval: number };

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
    const sendMessage = useCallback((message: any) => {
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

                default:
                    console.log('Unknown message type:', (message as any).type);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        sendMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

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

    return (
        <div className="event-viewer-app">
            <Toolbar
                onRefresh={handleRefresh}
                onExport={handleExport}
                onToggleAutoRefresh={handleToggleAutoRefresh}
                autoRefreshEnabled={state.autoRefreshEnabled}
                onFilterChange={handleFilterChange}
                filters={state.filters}
            />
            <ThreePaneLayout
                events={state.filteredEvents}
                selectedEvent={state.selectedEvent}
                onEventSelect={handleEventSelect}
                filters={state.filters}
                onFilterChange={handleFilterChange}
                loading={state.loading}
                error={state.error}
                sendMessage={sendMessage}
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

