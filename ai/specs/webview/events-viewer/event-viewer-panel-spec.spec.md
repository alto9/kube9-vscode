---
spec_id: event-viewer-panel-spec
name: Event Viewer Panel Specification
description: Technical specification for the EventViewerPanel class that manages the webview lifecycle and message protocol
feature_id:
  - event-viewer-panel
  - event-viewer-actions
diagram_id:
  - event-viewer-architecture
  - event-viewer-message-protocol
---

# Event Viewer Panel Specification

## Overview

The `EventViewerPanel` class manages the lifecycle of Events Viewer webview panels, following the singleton-per-cluster pattern. It handles panel creation, message communication between extension and webview, integration with EventsProvider, and resource cleanup.

## Class Structure

### EventViewerPanel

**File**: `src/webview/EventViewerPanel.ts`

```typescript
import * as vscode from 'vscode';
import { EventsProvider } from '../services/EventsProvider';
import { KubernetesEvent, EventFilters } from '../types/Events';
import { getNonce } from '../utils/getNonce';

export class EventViewerPanel {
    /**
     * Registry of active panels per cluster context
     */
    private static panels: Map<string, EventViewerPanel> = new Map();

    /**
     * The webview panel instance
     */
    private readonly panel: vscode.WebviewPanel;

    /**
     * Disposables for cleanup
     */
    private disposables: vscode.Disposable[] = [];

    /**
     * Cluster context this panel is viewing
     */
    private readonly clusterContext: string;

    /**
     * Events provider service
     */
    private readonly eventsProvider: EventsProvider;

    /**
     * Extension context for accessing resources
     */
    private readonly extensionContext: vscode.ExtensionContext;

    /**
     * Show or create Events Viewer panel for a cluster
     * 
     * @param context Extension context
     * @param clusterContext Cluster context name
     * @param eventsProvider Events provider service instance
     * @returns The EventViewerPanel instance
     */
    public static show(
        context: vscode.ExtensionContext,
        clusterContext: string,
        eventsProvider: EventsProvider
    ): EventViewerPanel {
        // Check if panel already exists for this cluster
        const existingPanel = EventViewerPanel.panels.get(clusterContext);
        if (existingPanel) {
            existingPanel.panel.reveal(vscode.ViewColumn.One);
            return existingPanel;
        }

        // Create new panel
        const panel = new EventViewerPanel(context, clusterContext, eventsProvider);
        EventViewerPanel.panels.set(clusterContext, panel);
        return panel;
    }

    /**
     * Private constructor - use EventViewerPanel.show() to create instances
     */
    private constructor(
        extensionContext: vscode.ExtensionContext,
        clusterContext: string,
        eventsProvider: EventsProvider
    ) {
        this.extensionContext = extensionContext;
        this.clusterContext = clusterContext;
        this.eventsProvider = eventsProvider;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'kube9EventViewer',
            `Events: ${clusterContext}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'event-viewer')
                ]
            }
        );

        // Set webview HTML content
        this.panel.webview.html = this.getWebviewContent();

        // Set up message handling
        this.setupMessageHandling();

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Load initial events
        this.loadEvents();
    }

    /**
     * Set up bidirectional message handling between extension and webview
     */
    private setupMessageHandling(): void {
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'load':
                        await this.handleLoadEvents(message.filters);
                        break;
                    case 'refresh':
                        await this.handleRefresh();
                        break;
                    case 'filter':
                        await this.handleFilterChange(message.filters);
                        break;
                    case 'export':
                        await this.handleExport(message.format, message.events);
                        break;
                    case 'copy':
                        await this.handleCopy(message.content);
                        break;
                    case 'navigate':
                        await this.handleNavigate(message.resource);
                        break;
                    case 'viewYaml':
                        await this.handleViewYaml(message.resource);
                        break;
                    case 'toggleAutoRefresh':
                        await this.handleToggleAutoRefresh(message.enabled);
                        break;
                    case 'setAutoRefreshInterval':
                        await this.handleSetAutoRefreshInterval(message.interval);
                        break;
                    case 'ready':
                        // Webview is ready, send initial state
                        await this.sendInitialState();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * Load events and send to webview
     */
    private async loadEvents(filters?: EventFilters): Promise<void> {
        try {
            this.sendMessage({
                type: 'loading',
                loading: true
            });

            const events = await this.eventsProvider.getEvents(
                this.clusterContext,
                filters
            );

            this.sendMessage({
                type: 'events',
                events: events,
                loading: false
            });
        } catch (error) {
            this.sendMessage({
                type: 'error',
                error: (error as Error).message,
                loading: false
            });
        }
    }

    /**
     * Handle load events message from webview
     */
    private async handleLoadEvents(filters?: EventFilters): Promise<void> {
        await this.loadEvents(filters);
    }

    /**
     * Handle refresh message from webview
     */
    private async handleRefresh(): Promise<void> {
        this.eventsProvider.clearCache(this.clusterContext);
        await this.loadEvents();
    }

    /**
     * Handle filter change message from webview
     */
    private async handleFilterChange(filters: EventFilters): Promise<void> {
        this.eventsProvider.setFilter(this.clusterContext, filters);
        await this.loadEvents(filters);
    }

    /**
     * Handle export message from webview
     */
    private async handleExport(format: 'json' | 'csv', events: KubernetesEvent[]): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `events-${this.clusterContext}-${timestamp}.${format}`;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFilename),
            filters: {
                'JSON': ['json'],
                'CSV': ['csv']
            }
        });

        if (uri) {
            try {
                let content: string;
                if (format === 'json') {
                    content = JSON.stringify(events, null, 2);
                } else {
                    content = this.convertToCSV(events);
                }

                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`Exported ${events.length} events to ${uri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Export failed: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Convert events to CSV format
     */
    private convertToCSV(events: KubernetesEvent[]): string {
        const headers = ['Level', 'Date/Time', 'Source', 'Event ID', 'Category', 'Message'];
        const rows = events.map(event => [
            event.type,
            event.lastTimestamp,
            `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`,
            event.reason,
            event.count > 1 ? event.count.toString() : '1',
            `"${event.message.replace(/"/g, '""')}"` // Escape quotes
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    /**
     * Handle copy message from webview
     */
    private async handleCopy(content: string): Promise<void> {
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('Copied to clipboard');
    }

    /**
     * Handle navigate to resource message from webview
     */
    private async handleNavigate(resource: {
        namespace: string;
        kind: string;
        name: string;
    }): Promise<void> {
        // This would integrate with tree view navigation
        // Execute command to navigate to resource in tree
        await vscode.commands.executeCommand('kube9.navigateToResource', {
            clusterContext: this.clusterContext,
            ...resource
        });
    }

    /**
     * Handle view YAML message from webview
     */
    private async handleViewYaml(resource: {
        namespace: string;
        kind: string;
        name: string;
    }): Promise<void> {
        // Execute command to open YAML editor for resource
        await vscode.commands.executeCommand('kube9.viewResourceYaml', {
            clusterContext: this.clusterContext,
            ...resource
        });
    }

    /**
     * Handle toggle auto-refresh message from webview
     */
    private async handleToggleAutoRefresh(enabled: boolean): Promise<void> {
        if (enabled) {
            this.eventsProvider.startAutoRefresh(this.clusterContext, () => {
                this.loadEvents();
            });
        } else {
            this.eventsProvider.stopAutoRefresh(this.clusterContext);
        }

        this.sendMessage({
            type: 'autoRefreshState',
            enabled: enabled
        });
    }

    /**
     * Handle set auto-refresh interval message from webview
     */
    private async handleSetAutoRefreshInterval(interval: number): Promise<void> {
        // For now, interval is fixed at 30s in EventsProvider
        // This is a placeholder for future enhancement
        this.sendMessage({
            type: 'autoRefreshInterval',
            interval: interval
        });
    }

    /**
     * Send initial state to webview when ready
     */
    private async sendInitialState(): Promise<void> {
        const filters = this.eventsProvider.getFilters(this.clusterContext);
        const autoRefreshEnabled = this.eventsProvider.isAutoRefreshEnabled(this.clusterContext);

        this.sendMessage({
            type: 'initialState',
            clusterContext: this.clusterContext,
            filters: filters,
            autoRefreshEnabled: autoRefreshEnabled
        });

        // Load initial events
        await this.loadEvents(filters);
    }

    /**
     * Send message to webview
     */
    private sendMessage(message: any): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * Generate HTML content for webview
     */
    private getWebviewContent(): string {
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'media', 'event-viewer', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'media', 'event-viewer', 'index.css')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Events Viewer</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Dispose of panel resources
     */
    public dispose(): void {
        EventViewerPanel.panels.delete(this.clusterContext);

        // Stop auto-refresh if enabled
        this.eventsProvider.stopAutoRefresh(this.clusterContext);

        // Clean up panel
        this.panel.dispose();

        // Dispose all disposables
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
```

## Command Registration

**File**: `src/extension.ts`

```typescript
// Register Events Viewer command
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.openEventsViewer', async (clusterContext?: string) => {
        // If no cluster context provided, show QuickPick
        if (!clusterContext) {
            const clusters = await getConnectedClusters();
            const selected = await vscode.window.showQuickPick(
                clusters.map(c => ({ label: c.name, context: c.context })),
                { placeHolder: 'Select cluster to view events' }
            );
            if (!selected) {
                return;
            }
            clusterContext = selected.context;
        }

        // Show Events Viewer panel
        EventViewerPanel.show(context, clusterContext, eventsProvider);
    })
);

// Register command from Events category click
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.events.openViewer', (eventsCategory: EventsCategory) => {
        const clusterContext = eventsCategory.clusterElement.resourceData.context;
        EventViewerPanel.show(context, clusterContext, eventsProvider);
    })
);
```

## Integration with Events Category

**File**: `src/tree/categories/EventsCategory.ts`

```typescript
export class EventsCategory extends ClusterTreeItem {
    constructor(public readonly clusterElement: ClusterTreeItem) {
        super('Events', 'events', vscode.TreeItemCollapsibleState.None, clusterElement.resourceData);
        
        this.contextValue = 'kube9.events.category';
        this.iconPath = new vscode.ThemeIcon('output');
        this.description = 'Cluster Events';
        this.tooltip = 'Kubernetes events for troubleshooting';
        
        // Set command to open Events Viewer instead of expanding tree
        this.command = {
            command: 'kube9.events.openViewer',
            title: 'Open Events Viewer',
            arguments: [this]
        };
    }
}
```

## Message Protocol

### Extension → Webview Messages

```typescript
type ExtensionMessage =
    | { type: 'loading'; loading: boolean }
    | { type: 'events'; events: KubernetesEvent[]; loading: false }
    | { type: 'error'; error: string; loading: false }
    | { type: 'initialState'; clusterContext: string; filters: EventFilters; autoRefreshEnabled: boolean }
    | { type: 'autoRefreshState'; enabled: boolean }
    | { type: 'autoRefreshInterval'; interval: number };
```

### Webview → Extension Messages

```typescript
type WebviewMessage =
    | { type: 'ready' }
    | { type: 'load'; filters?: EventFilters }
    | { type: 'refresh' }
    | { type: 'filter'; filters: EventFilters }
    | { type: 'export'; format: 'json' | 'csv'; events: KubernetesEvent[] }
    | { type: 'copy'; content: string }
    | { type: 'navigate'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'viewYaml'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'toggleAutoRefresh'; enabled: boolean }
    | { type: 'setAutoRefreshInterval'; interval: number };
```

## Panel Lifecycle

1. **Creation**: User clicks Events category or runs command
2. **Initialization**: Panel created, HTML loaded, React app starts
3. **Ready**: Webview sends 'ready' message
4. **Initial State**: Extension sends initial state and loads events
5. **Active**: User interacts, messages exchanged
6. **Disposal**: User closes panel, resources cleaned up

## Singleton Pattern

- One panel per cluster context maximum
- `EventViewerPanel.show()` checks registry before creating
- If panel exists, reveals it instead of creating new one
- Registry: `Map<clusterContext, EventViewerPanel>`

## Resource Management

- `disposables` array tracks all subscriptions
- `panel.onDidDispose()` triggers cleanup
- Auto-refresh stopped on disposal
- Panel removed from registry
- All disposables disposed

## Error Handling

- API errors caught and sent to webview as 'error' message
- Export errors shown as VS Code error notifications
- Navigation errors handled gracefully
- Loading states managed properly

## Performance Considerations

- `retainContextWhenHidden: true` preserves webview state when not visible
- Events cached in EventsProvider to avoid repeated API calls
- Virtual scrolling handled in React components (not in panel)
- Message passing optimized (send events once, not repeatedly)

## Security

- Content Security Policy enforced
- Nonce used for inline scripts
- Local resource roots restricted to event-viewer media folder
- User confirmation for file operations (export)

