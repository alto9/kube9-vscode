import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { ArgoCDService } from '../services/ArgoCDService';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import { getClusterTreeProvider, getExtensionContext } from '../extension';
import {
    ArgoCDNotFoundError,
    ArgoCDPermissionError
} from '../types/argocd';
import { ArgoCDApplicationWebviewProvider } from '../webview/ArgoCDApplicationWebviewProvider';

/**
 * Gets an ArgoCDService instance for the current kubeconfig.
 * Creates the service with the necessary dependencies.
 * 
 * @returns ArgoCDService instance, or undefined if kubeconfig is not available
 */
function getArgoCDService(): ArgoCDService | undefined {
    const treeProvider = getClusterTreeProvider();
    const kubeconfigPath = treeProvider.getKubeconfigPath();
    
    if (!kubeconfigPath) {
        return undefined;
    }
    
    const operatorStatusClient = new OperatorStatusClient();
    return new ArgoCDService(operatorStatusClient, kubeconfigPath);
}

/**
 * Extracts application information from a ClusterTreeItem.
 * Validates that the tree item has the required data.
 * 
 * @param treeItem The tree item to extract data from
 * @returns Object with name, namespace, and context, or undefined if invalid
 */
function extractApplicationInfo(treeItem: ClusterTreeItem | undefined): { name: string; namespace: string; context: string } | undefined {
    if (!treeItem || !treeItem.resourceData) {
        return undefined;
    }
    
    const name = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString());
    const namespace = treeItem.resourceData.namespace;
    const context = treeItem.resourceData.context.name;
    
    if (!name || !namespace || !context) {
        return undefined;
    }
    
    return { name, namespace, context };
}

/**
 * Command handler to sync an ArgoCD application.
 * Triggers a sync operation by patching the Application CRD.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function syncApplicationCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to sync: Invalid application item');
            return;
        }
        
        const argoCDService = getArgoCDService();
        if (!argoCDService) {
            vscode.window.showErrorMessage('Unable to sync: Kubeconfig not available');
            return;
        }
        
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Syncing application ${appInfo.name}...`,
                cancellable: false
            },
            async () => {
                await argoCDService.syncApplication(appInfo.name, appInfo.namespace, appInfo.context);
            }
        );
        
        vscode.window.showInformationMessage(`Successfully triggered sync for application ${appInfo.name}`);
        
        // Refresh tree view to show updated status
        const treeProvider = getClusterTreeProvider();
        treeProvider.refresh();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof ArgoCDNotFoundError) {
            vscode.window.showErrorMessage(`Application not found: ${errorMessage}`);
        } else if (error instanceof ArgoCDPermissionError) {
            vscode.window.showErrorMessage(`Permission denied: ${errorMessage}`);
        } else {
            console.error('Error syncing application:', errorMessage);
            vscode.window.showErrorMessage(`Failed to sync application: ${errorMessage}`);
        }
    }
}

/**
 * Command handler to refresh an ArgoCD application.
 * Triggers a refresh operation by patching the Application CRD.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function refreshApplicationCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to refresh: Invalid application item');
            return;
        }
        
        const argoCDService = getArgoCDService();
        if (!argoCDService) {
            vscode.window.showErrorMessage('Unable to refresh: Kubeconfig not available');
            return;
        }
        
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Refreshing application ${appInfo.name}...`,
                cancellable: false
            },
            async () => {
                await argoCDService.refreshApplication(appInfo.name, appInfo.namespace, appInfo.context);
            }
        );
        
        vscode.window.showInformationMessage(`Successfully triggered refresh for application ${appInfo.name}`);
        
        // Refresh tree view to show updated status
        const treeProvider = getClusterTreeProvider();
        treeProvider.refresh();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof ArgoCDNotFoundError) {
            vscode.window.showErrorMessage(`Application not found: ${errorMessage}`);
        } else if (error instanceof ArgoCDPermissionError) {
            vscode.window.showErrorMessage(`Permission denied: ${errorMessage}`);
        } else {
            console.error('Error refreshing application:', errorMessage);
            vscode.window.showErrorMessage(`Failed to refresh application: ${errorMessage}`);
        }
    }
}

/**
 * Command handler to hard refresh an ArgoCD application.
 * Triggers a hard refresh operation by patching the Application CRD with hard refresh annotation.
 * Shows a confirmation dialog before executing.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function hardRefreshApplicationCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to hard refresh: Invalid application item');
            return;
        }
        
        // Show confirmation dialog
        const confirmation = await vscode.window.showWarningMessage(
            `Hard refresh will clear the cache and force a full comparison for application "${appInfo.name}". Continue?`,
            { modal: true },
            'Yes',
            'Cancel'
        );
        
        if (confirmation !== 'Yes') {
            return;
        }
        
        const argoCDService = getArgoCDService();
        if (!argoCDService) {
            vscode.window.showErrorMessage('Unable to hard refresh: Kubeconfig not available');
            return;
        }
        
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Hard refreshing application ${appInfo.name}...`,
                cancellable: false
            },
            async () => {
                await argoCDService.hardRefreshApplication(appInfo.name, appInfo.namespace, appInfo.context);
            }
        );
        
        vscode.window.showInformationMessage(`Successfully triggered hard refresh for application ${appInfo.name}`);
        
        // Refresh tree view to show updated status
        const treeProvider = getClusterTreeProvider();
        treeProvider.refresh();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof ArgoCDNotFoundError) {
            vscode.window.showErrorMessage(`Application not found: ${errorMessage}`);
        } else if (error instanceof ArgoCDPermissionError) {
            vscode.window.showErrorMessage(`Permission denied: ${errorMessage}`);
        } else {
            console.error('Error hard refreshing application:', errorMessage);
            vscode.window.showErrorMessage(`Failed to hard refresh application: ${errorMessage}`);
        }
    }
}

/**
 * Command handler to view ArgoCD application details.
 * Opens the webview provider to display application information.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function viewDetailsCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to view details: Invalid application item');
            return;
        }
        
        const argoCDService = getArgoCDService();
        if (!argoCDService) {
            vscode.window.showErrorMessage('Unable to view details: Kubeconfig not available');
            return;
        }
        
        const treeProvider = getClusterTreeProvider();
        const extensionContext = getExtensionContext();
        
        await ArgoCDApplicationWebviewProvider.showApplication(
            extensionContext,
            argoCDService,
            treeProvider,
            appInfo.name,
            appInfo.namespace,
            appInfo.context
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof ArgoCDNotFoundError) {
            vscode.window.showErrorMessage(`Application not found: ${errorMessage}`);
        } else if (error instanceof ArgoCDPermissionError) {
            vscode.window.showErrorMessage(`Permission denied: ${errorMessage}`);
        } else {
            console.error('Error viewing application details:', errorMessage);
            vscode.window.showErrorMessage(`Failed to view application details: ${errorMessage}`);
        }
    }
}

/**
 * Command handler to copy the ArgoCD application name to clipboard.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function copyNameCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to copy name: Invalid application item');
            return;
        }
        
        await vscode.env.clipboard.writeText(appInfo.name);
        vscode.window.showInformationMessage(`Copied application name: ${appInfo.name}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error copying application name:', errorMessage);
        vscode.window.showErrorMessage(`Failed to copy application name: ${errorMessage}`);
    }
}

/**
 * Command handler to copy the ArgoCD application namespace to clipboard.
 * 
 * @param treeItem The ArgoCD application tree item
 */
export async function copyNamespaceCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        const appInfo = extractApplicationInfo(treeItem);
        if (!appInfo) {
            vscode.window.showErrorMessage('Unable to copy namespace: Invalid application item');
            return;
        }
        
        await vscode.env.clipboard.writeText(appInfo.namespace);
        vscode.window.showInformationMessage(`Copied namespace: ${appInfo.namespace}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error copying namespace:', errorMessage);
        vscode.window.showErrorMessage(`Failed to copy namespace: ${errorMessage}`);
    }
}

