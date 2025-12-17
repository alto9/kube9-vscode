---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 30
---

# Create EventViewerPanel Class

## Objective

Create the `EventViewerPanel` class that manages Event Viewer webview panels. This class handles panel creation, reuse, and basic lifecycle management (similar to OperatedDashboardPanel).

## Acceptance Criteria

- [ ] EventViewerPanel class created with panel management
- [ ] One webview per cluster context (panel reuse strategy)
- [ ] Panel disposal handled correctly
- [ ] Panel title format: "Events - {cluster-name}"
- [ ] Basic message handler structure in place
- [ ] Panel retains context when hidden

## Implementation Steps

### 1. Create EventViewerPanel class

**File**: `src/webview/EventViewerPanel.ts` (new file)

```typescript
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { EventQueryClient } from '../services/EventQueryClient';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';

/**
 * Interface for storing panel information.
 * Each panel is associated with a specific cluster context.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    kubeconfigPath: string;
    contextName: string;
    clusterName: string;
    operatorStatus: OperatorStatusMode;
    queryClient: EventQueryClient;
}

/**
 * EventViewerPanel manages webview panels for Event Viewer.
 * Supports multiple simultaneous panels (one per cluster).
 * Displays events from kube9-operator or call-to-action for non-operated clusters.
 */
export class EventViewerPanel {
    /**
     * Map of open webview panels keyed by contextName.
     * Allows reusing existing panels when the same Event Viewer is opened again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();
    
    /**
     * Extension context for managing subscriptions.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show an Event Viewer webview panel.
     * Creates a new panel or reveals an existing one for the given cluster.
     * 
     * @param context - The VS Code extension context
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param operatorStatus - The operator status for this cluster
     */
    public static show(
        context: vscode.ExtensionContext,
        kubeconfigPath: string,
        contextName: string,
        clusterName: string,
        operatorStatus: OperatorStatusMode
    ): void {
        // Store the extension context for later use
        EventViewerPanel.extensionContext = context;

        // Create a unique key for this panel
        const panelKey = contextName;

        // If we already have a panel for this cluster, reveal it
        const existingPanelInfo = EventViewerPanel.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9EventViewer',
            `Events - ${clusterName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
                ]
            }
        );

        // Create query client for this panel
        const queryClient = new EventQueryClient();

        // Store the panel and its context in our map
        EventViewerPanel.openPanels.set(panelKey, {
            panel,
            kubeconfigPath,
            contextName,
            clusterName,
            operatorStatus,
            queryClient
        });

        // Set the webview's HTML content (placeholder for now)
        panel.webview.html = EventViewerPanel.getPlaceholderHtml(clusterName, operatorStatus);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                await EventViewerPanel.handleWebviewMessage(
                    message,
                    panel,
                    contextName
                );
            },
            undefined,
            context.subscriptions
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                EventViewerPanel.openPanels.delete(panelKey);
            },
            null,
            context.subscriptions
        );

        // Send initial data
        EventViewerPanel.sendInitialData(panel, kubeconfigPath, contextName, operatorStatus);
    }

    /**
     * Send initial data to webview
     * 
     * @param panel - The webview panel
     * @param kubeconfigPath - Path to kubeconfig
     * @param contextName - Context name
     * @param operatorStatus - Operator status
     */
    private static sendInitialData(
        panel: vscode.WebviewPanel,
        kubeconfigPath: string,
        contextName: string,
        operatorStatus: OperatorStatusMode
    ): void {
        panel.webview.postMessage({
            type: 'init',
            data: {
                kubeconfigPath,
                contextName,
                operatorStatus
            }
        });
    }

    /**
     * Handle messages received from the webview.
     * 
     * @param message - The message from the webview
     * @param panel - The webview panel
     * @param contextName - The kubectl context name
     */
    private static async handleWebviewMessage(
        message: { type: string; [key: string]: unknown },
        panel: vscode.WebviewPanel,
        contextName: string
    ): Promise<void> {
        const panelInfo = EventViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            return;
        }

        try {
            switch (message.type) {
                case 'loadEvents':
                    // TODO: Implement in subsequent story
                    break;
                    
                case 'refresh':
                    // TODO: Implement in subsequent story
                    break;
                    
                case 'installOperator':
                    vscode.env.openExternal(
                        vscode.Uri.parse('https://docs.kube9.io/operator/installation')
                    );
                    break;
                    
                case 'viewObject':
                    // TODO: Implement in subsequent story
                    break;
                    
                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error: any) {
            console.error(`Error handling webview message:`, error);
            panel.webview.postMessage({
                type: 'error',
                data: { error: error.message }
            });
        }
    }

    /**
     * Get placeholder HTML for the webview.
     * This is temporary until the full HTML is implemented.
     * 
     * @param clusterName - Display name of cluster
     * @param operatorStatus - Operator status mode
     * @returns HTML string
     */
    private static getPlaceholderHtml(clusterName: string, operatorStatus: OperatorStatusMode): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Events - ${clusterName}</title>
            </head>
            <body>
                <h1>📅 Event Viewer - ${clusterName}</h1>
                <p>Operator Status: ${operatorStatus}</p>
                <p>Full UI coming soon...</p>
            </body>
            </html>
        `;
    }
}
```

### 2. Export EventViewerPanel from webview index

**File**: `src/webview/index.ts`

Add export:

```typescript
export { EventViewerPanel } from './EventViewerPanel';
```

## Files to Create

- `src/webview/EventViewerPanel.ts` - EventViewerPanel class

## Files to Modify

- `src/webview/index.ts` - Add export

## Testing

Manual test:
1. Call `EventViewerPanel.show()` from test code
2. Verify webview panel opens with correct title
3. Open Event Viewer for same cluster again, verify panel is revealed (not duplicated)
4. Open Event Viewer for different cluster, verify new panel is created
5. Close panel and verify it's removed from openPanels map

## Dependencies

- Depends on Story 002 (EventQueryClient)
- Depends on existing OperatorStatusMode type

## Notes

- This story creates the basic panel structure with placeholder HTML
- The actual HTML content will be implemented in subsequent stories
- Message handlers are stubbed out and will be implemented later
- Pattern follows OperatedDashboardPanel for consistency

