import * as vscode from 'vscode';
import { EventsProvider } from '../services/EventsProvider';
import { KubernetesEvent, EventFilters, ExtensionMessage, WebviewMessage } from '../types/Events';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getHelpController } from '../extension';

/**
 * EventViewerPanel manages webview panels for Events Viewer.
 * Supports multiple simultaneous panels (one per cluster context).
 * Follows singleton-per-cluster pattern like Dashboard panels.
 */
export class EventViewerPanel {
    /**
     * Registry of active panels per cluster context.
     */
    private static panels: Map<string, EventViewerPanel> = new Map();

    /**
     * The webview panel instance.
     */
    private readonly panel: vscode.WebviewPanel;

    /**
     * Disposables for cleanup.
     */
    private disposables: vscode.Disposable[] = [];

    /**
     * Cluster context this panel is viewing.
     */
    private readonly clusterContext: string;

    /**
     * Events provider service.
     */
    private readonly eventsProvider: EventsProvider;

    /**
     * Extension context for accessing resources.
     */
    private readonly extensionContext: vscode.ExtensionContext;

    /**
     * Flag to prevent concurrent loads.
     */
    private isLoading: boolean = false;

    /**
     * Flag to track if initial load has been done.
     */
    private hasLoadedInitialEvents: boolean = false;

    /**
     * Counter for 'ready' messages received (debugging).
     */
    private readyMessageCount: number = 0;

    /**
     * Show or create Events Viewer panel for a cluster.
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
     * Private constructor - use EventViewerPanel.show() to create instances.
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

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(this.panel.webview);

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // NOTE: Do NOT load events here - wait for webview 'ready' message
        // to avoid double-loading and flickering. Events will be loaded via sendInitialState().
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     */
    private setupMessageHandling(): void {
        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                const timestamp = new Date().toISOString();
                console.log(`[EventViewerPanel ${timestamp}] ⬅️ Received message: ${message.type}`);
                
                switch (message.type) {
                    case 'ready':
                        this.readyMessageCount++;
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'ready' message #${this.readyMessageCount}`);
                        await this.sendInitialState();
                        break;
                    case 'load':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'load' message`);
                        await this.handleLoadEvents(message.filters);
                        break;
                    case 'refresh':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'refresh' message`);
                        await this.handleRefresh();
                        break;
                    case 'filter':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'filter' message`);
                        await this.handleFilterChange(message.filters);
                        break;
                    case 'export':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'export' message`);
                        await this.handleExport(message.format, message.events);
                        break;
                    case 'copy':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'copy' message`);
                        await this.handleCopy(message.content);
                        break;
                    case 'navigate':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'navigate' message`);
                        await this.handleNavigate(message.resource);
                        break;
                    case 'viewYaml':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'viewYaml' message`);
                        await this.handleViewYaml(message.resource);
                        break;
                    case 'toggleAutoRefresh':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'toggleAutoRefresh' message, enabled=${message.enabled}`);
                        await this.handleToggleAutoRefresh(message.enabled);
                        break;
                    case 'setAutoRefreshInterval':
                        console.log(`[EventViewerPanel ${timestamp}] Processing 'setAutoRefreshInterval' message`);
                        await this.handleSetAutoRefreshInterval(message.interval);
                        break;
                    default:
                        console.log(`[EventViewerPanel ${timestamp}] ❌ Unknown message type:`, message);
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * Load events and send to webview.
     * NO AUTOMATIC REFRESH - only loads when explicitly called.
     */
    private async loadEvents(filters?: EventFilters): Promise<void> {
        const timestamp = new Date().toISOString();
        const stack = new Error().stack;
        console.log(`[EventViewerPanel ${timestamp}] loadEvents called, filters:`, filters);
        console.log(`[EventViewerPanel ${timestamp}] Call stack:\n${stack}`);
        console.log(`[EventViewerPanel ${timestamp}] isLoading=${this.isLoading}`);
        
        // Prevent concurrent loads
        if (this.isLoading) {
            console.log(`[EventViewerPanel ${timestamp}] ⛔ BLOCKED: Skipping load - already loading`);
            return;
        }

        this.isLoading = true;
        console.log(`[EventViewerPanel ${timestamp}] ✅ PROCEEDING with load...`);

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
            console.log(`[EventViewerPanel ${timestamp}] ✅ Load complete, sent ${events.length} events`);
        } catch (error) {
            console.log(`[EventViewerPanel ${timestamp}] ❌ Load failed:`, error);
            this.sendMessage({
                type: 'error',
                error: (error as Error).message,
                loading: false
            });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handle load events message from webview.
     */
    private async handleLoadEvents(filters?: EventFilters): Promise<void> {
        await this.loadEvents(filters);
    }

    /**
     * Handle refresh message from webview.
     */
    private async handleRefresh(): Promise<void> {
        this.eventsProvider.clearCache(this.clusterContext);
        await this.loadEvents();
    }

    /**
     * Handle filter change message from webview.
     */
    private async handleFilterChange(filters: EventFilters): Promise<void> {
        this.eventsProvider.setFilter(this.clusterContext, filters);
        await this.loadEvents(filters);
    }

    /**
     * Handle export message from webview.
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
     * Convert events to CSV format.
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
     * Handle copy message from webview.
     */
    private async handleCopy(content: string): Promise<void> {
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('Copied to clipboard');
    }

    /**
     * Handle navigate to resource message from webview.
     */
    private async handleNavigate(resource: {
        namespace: string;
        kind: string;
        name: string;
    }): Promise<void> {
        // Execute command to navigate to resource in tree
        await vscode.commands.executeCommand('kube9.navigateToResource', {
            clusterContext: this.clusterContext,
            ...resource
        });
    }

    /**
     * Handle view YAML message from webview.
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
     * Handle toggle auto-refresh message from webview.
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
     * Handle set auto-refresh interval message from webview.
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
     * Send initial state to webview when ready.
     * ONLY sends initial state ONCE - prevents duplicate loads.
     */
    private async sendInitialState(): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[EventViewerPanel ${timestamp}] sendInitialState called, hasLoadedInitialEvents=${this.hasLoadedInitialEvents}`);
        
        // Prevent multiple initial state sends
        if (this.hasLoadedInitialEvents) {
            console.log(`[EventViewerPanel ${timestamp}] ⛔ BLOCKED: Skipping - initial state already sent`);
            return;
        }

        this.hasLoadedInitialEvents = true;
        console.log(`[EventViewerPanel ${timestamp}] ✅ PROCEEDING with sendInitialState`);

        const filters = this.eventsProvider.getFilters(this.clusterContext);
        const autoRefreshEnabled = this.eventsProvider.isAutoRefreshEnabled(this.clusterContext);
        console.log(`[EventViewerPanel ${timestamp}] autoRefreshEnabled=${autoRefreshEnabled}`);

        this.sendMessage({
            type: 'initialState',
            clusterContext: this.clusterContext,
            filters: filters,
            autoRefreshEnabled: autoRefreshEnabled
        });

        // Load initial events ONCE
        console.log(`[EventViewerPanel ${timestamp}] Calling loadEvents from sendInitialState`);
        await this.loadEvents(filters);
    }

    /**
     * Send message to webview.
     */
    private sendMessage(message: ExtensionMessage): void {
        const timestamp = new Date().toISOString();
        const messageType = message.type;
        const eventsCount = message.type === 'events' && 'events' in message ? message.events.length : 'N/A';
        console.log(`[EventViewerPanel ${timestamp}] ➡️ Sending message: ${messageType} ${message.type === 'events' ? `(${eventsCount} events)` : ''}`);
        this.panel.webview.postMessage(message);
    }

    /**
     * Generate HTML content for webview.
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
     * Dispose of panel resources.
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

/**
 * Generate a random nonce for Content Security Policy.
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

