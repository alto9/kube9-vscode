import * as vscode from 'vscode';
import { getContextInfo } from '../utils/kubectlContext';
import { namespaceWatcher } from '../services/namespaceCache';

/**
 * Manages the status bar item that displays the current kubectl context.
 * 
 * This status bar provides at-a-glance visibility of the active context without
 * requiring the tree view to be open. It automatically updates when the context
 * changes, either through extension commands or external kubectl modifications.
 * Clicking the status bar opens the context switcher.
 */
export class ContextStatusBar {
    /**
     * VS Code status bar item instance.
     */
    private statusBarItem: vscode.StatusBarItem | undefined;

    /**
     * Subscription to namespace context change events.
     */
    private contextSubscription: vscode.Disposable | undefined;

    /**
     * Extension context for managing disposables.
     */
    private extensionContext: vscode.ExtensionContext;

    /**
     * Creates a new ContextStatusBar instance.
     * 
     * @param context - The extension context for resource management
     */
    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    /**
     * Initializes the status bar item and subscribes to context changes.
     * 
     * This method:
     * 1. Creates the status bar item on the left side
     * 2. Sets the initial context display
     * 3. Subscribes to context change events
     * 4. Shows the status bar if kubectl is available
     */
    async initialize(): Promise<void> {
        try {
            // Create status bar item on the left side with priority 101 (right after namespace status bar)
            this.statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Left,
                101
            );

            // Set command to open context switcher when clicked
            this.statusBarItem.command = 'kube9.switchContext';

            // Add to extension subscriptions for automatic cleanup
            this.extensionContext.subscriptions.push(this.statusBarItem);

            // Set initial context display
            await this.updateContextDisplay();

            // Subscribe to namespace context change events (which also fire on context switch)
            this.contextSubscription = namespaceWatcher.onDidChangeContext(async () => {
                console.log('Context changed, updating context status bar...');
                await this.updateContextDisplay();
            });

            // Add subscription to extension context for cleanup
            this.extensionContext.subscriptions.push(this.contextSubscription);

            console.log('Context status bar initialized successfully.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to initialize context status bar:', errorMessage);
            
            // Hide status bar if initialization fails
            if (this.statusBarItem) {
                this.statusBarItem.hide();
            }
        }
    }

    /**
     * Updates the status bar display with the current context information.
     * 
     * Queries kubectl for the current context state and updates the status bar
     * to show the active context name.
     * 
     * If kubectl is unavailable or an error occurs, the status bar is hidden.
     */
    private async updateContextDisplay(): Promise<void> {
        if (!this.statusBarItem) {
            return;
        }

        try {
            // Get current kubectl context information
            const contextInfo = await getContextInfo();

            // Update status bar text
            this.statusBarItem.text = `kube9: ${contextInfo.contextName}`;

            // Build detailed tooltip with context information
            const tooltipLines = [
                `Current Context: ${contextInfo.contextName}`,
                `Cluster: ${contextInfo.clusterName}`
            ];

            if (contextInfo.currentNamespace) {
                tooltipLines.push(`Namespace: ${contextInfo.currentNamespace}`);
            } else {
                tooltipLines.push('Namespace: None (cluster-wide view)');
            }

            tooltipLines.push('', 'Click to switch context');

            this.statusBarItem.tooltip = tooltipLines.join('\n');

            // Show the status bar
            this.statusBarItem.show();

            console.log(`Context status bar updated: Context = ${contextInfo.contextName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to update context status bar:', errorMessage);
            
            // Hide status bar if kubectl is unavailable or errors occur
            this.statusBarItem.hide();
        }
    }

    /**
     * Disposes of the status bar and cleans up resources.
     * 
     * This method is called during extension deactivation to ensure
     * proper cleanup of event subscriptions and UI elements.
     */
    dispose(): void {
        // Dispose of context subscription
        if (this.contextSubscription) {
            this.contextSubscription.dispose();
            this.contextSubscription = undefined;
        }

        // Dispose of status bar item
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
            this.statusBarItem = undefined;
        }

        console.log('Context status bar disposed.');
    }
}
