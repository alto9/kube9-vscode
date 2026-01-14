import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { switchContext, getContextInfo } from '../utils/kubectlContext';
import { getClusterTreeProvider } from '../extension';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { closeWebviewsForContext } from '../utils/webviewManager';

/**
 * Command handler to switch kubectl context.
 * Shows a quick pick with all available contexts and switches to the selected one.
 * 
 * @param item Optional cluster tree item if called from context menu
 */
export async function switchContextCommand(item?: ClusterTreeItem): Promise<void> {
    try {
        let selectedContextName: string | undefined;

        // If called from context menu with a cluster item, use that context
        if (item && item.type === 'cluster' && item.resourceData?.context?.name) {
            selectedContextName = item.resourceData.context.name;
        } else {
            // Otherwise, show quick pick to select context
            const kubeconfig = await KubeconfigParser.parseKubeconfig();
            
            if (!kubeconfig.contexts || kubeconfig.contexts.length === 0) {
                vscode.window.showWarningMessage('No contexts found in kubeconfig');
                return;
            }

            // Get current context to mark it in the quick pick
            const currentContextInfo = await getContextInfo().catch(() => null);
            const currentContextName = currentContextInfo?.contextName;

            // Build quick pick items with current context marked
            const quickPickItems = kubeconfig.contexts.map(context => {
                const isCurrent = context.name === currentContextName;
                return {
                    label: isCurrent ? `$(check) ${context.name}` : context.name,
                    description: context.cluster || '',
                    detail: context.namespace ? `Namespace: ${context.namespace}` : undefined,
                    contextName: context.name,
                    isCurrent
                };
            });

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select kubectl context',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return; // User cancelled
            }

            selectedContextName = selected.contextName;
        }

        if (!selectedContextName) {
            vscode.window.showErrorMessage('No context selected');
            return;
        }

        // Get current context before switching to close webviews
        const currentContextInfo = await getContextInfo().catch(() => null);
        const oldContextName = currentContextInfo?.contextName;

        // Show progress indicator while switching context
        const success = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Switching to context '${selectedContextName}'...`,
                cancellable: false
            },
            async () => {
                // Close webviews associated with the old context
                if (oldContextName) {
                    await closeWebviewsForContext(oldContextName);
                }

                // Switch context
                return await switchContext(selectedContextName!);
            }
        );

        if (success) {
            // Immediately fetch the updated context state
            try {
                await getContextInfo(); // Updates cache with new state
                
                // Manually trigger namespace watcher to fire event for immediate status bar updates
                // This ensures namespace status bar and context status bar update immediately
                // instead of waiting for next poll (30 seconds)
                const { namespaceWatcher } = await import('../services/namespaceCache');
                await namespaceWatcher.triggerCheck();
                
                // Refresh tree view to reflect the change
                getClusterTreeProvider().refresh();
            } catch (refreshError) {
                // Log error but don't fail the operation
                console.error('Failed to refresh tree after context switch:', refreshError);
                // Fallback: trigger refresh anyway
                try {
                    getClusterTreeProvider().refresh();
                } catch (e) {
                    // Ignore refresh errors
                }
            }

            // Show success notification
            vscode.window.showInformationMessage(
                `Switched to context: ${selectedContextName}`
            );
        } else {
            // Show error notification
            vscode.window.showErrorMessage(
                `Failed to switch to context '${selectedContextName}'. The context may not exist in your kubeconfig.`
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in switchContextCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to switch context: ${errorMessage}`
        );
    }
}
