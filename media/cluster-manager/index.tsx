import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import type {
    ClusterInfo,
    ClusterCustomizationConfig,
    ExtensionToWebviewMessage,
    WebviewToExtensionMessage
} from './types';
import { ClusterList } from './components/ClusterList';
import { Toolbar } from './components/Toolbar';
import { useDebouncedValue } from './hooks/useDebouncedValue';

/**
 * VS Code API interface
 */
interface VSCodeAPI {
    postMessage(message: WebviewToExtensionMessage): void;
    getState(): unknown;
    setState(state: unknown): void;
}

/**
 * Acquire VS Code API (available in webview context)
 */
declare function acquireVsCodeApi(): VSCodeAPI;

/**
 * Main Cluster Manager App Component
 */
function ClusterManagerApp(): JSX.Element {
    const [loading, setLoading] = useState<boolean>(true);
    const [clusters, setClusters] = useState<ClusterInfo[]>([]);
    const [customizations, setCustomizations] = useState<ClusterCustomizationConfig | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        // Acquire VS Code API
        const vscode = acquireVsCodeApi();

        // Set up message listener
        const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>): void => {
            const message = event.data;
            if (message.type === 'initialize') {
                setClusters(message.data.clusters);
                setCustomizations(message.data.customizations);
                setTheme(message.data.theme);
                setLoading(false);
            } else if (message.type === 'customizationsUpdated') {
                setCustomizations(message.data);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request clusters on mount
        vscode.postMessage({ type: 'getClusters' });

        // Cleanup
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Handle setting alias
    const handleSetAlias = (contextName: string, alias: string | null): void => {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            type: 'setAlias',
            data: {
                contextName,
                alias
            }
        });
    };

    // Handle toggling visibility
    const handleToggleVisibility = (contextName: string, hidden: boolean): void => {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            type: 'toggleVisibility',
            data: {
                contextName,
                hidden
            }
        });
    };

    // Debounce search term for performance
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

    // Filter clusters based on search term
    const filteredClusters = useMemo(() => {
        if (!debouncedSearchTerm.trim()) {
            return clusters;
        }

        const searchLower = debouncedSearchTerm.toLowerCase();
        return clusters.filter(cluster => {
            const customization = customizations?.clusters[cluster.contextName];
            const displayName = customization?.alias || cluster.contextName;
            return displayName.toLowerCase().includes(searchLower) ||
                   cluster.contextName.toLowerCase().includes(searchLower);
        });
    }, [clusters, customizations, debouncedSearchTerm]);

    // Handle search change
    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
    };

    // Handle search clear
    const handleSearchClear = (): void => {
        setSearchTerm('');
    };

    return (
        <div className="cluster-manager-app">
            <header className="cluster-manager-header">
                <h1>Cluster Manager</h1>
            </header>
            <Toolbar
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                onSearchClear={handleSearchClear}
            />
            <main className="cluster-manager-content">
                {loading ? (
                    <div className="cluster-manager-loading">Loading...</div>
                ) : (
                    <ClusterList
                        clusters={filteredClusters}
                        customizations={customizations ?? {
                            version: '1.0',
                            folders: [],
                            clusters: {}
                        }}
                        onSetAlias={handleSetAlias}
                        onToggleVisibility={handleToggleVisibility}
                        searchTerm={debouncedSearchTerm}
                    />
                )}
            </main>
            <footer className="cluster-manager-footer">
                {!loading && (
                    <span>
                        {searchTerm.trim() ? (
                            <>
                                {filteredClusters.length} of {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
                            </>
                        ) : (
                            <>
                                {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </span>
                )}
            </footer>
        </div>
    );
}

// Render the app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ClusterManagerApp />);
} else {
    console.error('Root element not found');
}

