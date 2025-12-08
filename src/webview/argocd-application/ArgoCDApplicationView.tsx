import React from 'react';
import { TabBar, TabType } from './components/TabBar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { ArgoCDApplication } from '../../types/argocd';

interface ArgoCDApplicationViewProps {
    application: ArgoCDApplication | null;
    error: string | null;
    loading: boolean;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

/**
 * Main component for the ArgoCD Application webview.
 * Manages application data display, tab navigation, and state.
 */
export function ArgoCDApplicationView({
    application,
    error,
    loading,
    activeTab,
    onTabChange
}: ArgoCDApplicationViewProps): React.JSX.Element {
    // Show loading state
    if (loading) {
        return <LoadingState />;
    }

    // Show error state
    if (error) {
        return <ErrorState message={error} />;
    }

    // Show content when application data is loaded
    if (application) {
        return (
            <div style={{
                fontFamily: 'var(--vscode-font-family)',
                color: 'var(--vscode-foreground)',
                backgroundColor: 'var(--vscode-editor-background)',
                padding: '20px',
                margin: 0,
                minHeight: '100vh'
            }}>
                <h1 style={{
                    marginTop: 0,
                    fontSize: '1.5em',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                    borderBottom: '2px solid var(--vscode-panel-border)',
                    paddingBottom: '10px',
                    marginBottom: '20px'
                }}>
                    ArgoCD: {application.name}
                </h1>

                <TabBar activeTab={activeTab} onTabChange={onTabChange} />

                {activeTab === 'overview' && (
                    <div>
                        <p>Overview tab content will be implemented in story 012.</p>
                    </div>
                )}

                {activeTab === 'driftDetails' && (
                    <div>
                        <p>Drift Details tab content will be implemented in story 013.</p>
                    </div>
                )}
            </div>
        );
    }

    // Fallback (should not reach here)
    return <LoadingState />;
}

