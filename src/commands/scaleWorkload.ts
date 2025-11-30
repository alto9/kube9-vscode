import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
import { getClusterTreeProvider } from '../extension';

/**
 * Validates replica count input for VSCode input dialog.
 * Returns undefined for valid input, or an error message string for invalid input.
 * 
 * @param input - The input string to validate
 * @returns undefined if input is valid, error message string if invalid
 */
export function validateReplicaCount(input: string): string | undefined {
    // Check if empty
    if (!input || input.trim() === '') {
        return 'Replica count is required';
    }
    
    // Trim input for validation
    const trimmedInput = input.trim();
    
    // Check if input is a valid integer (allows leading zeros, but must be all digits)
    // Use regex to ensure entire string is numeric (no letters, no decimals)
    if (!/^-?\d+$/.test(trimmedInput)) {
        return 'Replica count must be a number';
    }
    
    // Parse as integer
    const count = parseInt(trimmedInput, 10);
    
    // Check minimum (allow 0)
    if (count < 0) {
        return 'Replica count must be a positive number (0 or greater)';
    }
    
    // Check maximum
    if (count > 1000) {
        return 'Replica count must not exceed 1000';
    }
    
    // Valid input
    return undefined;
}

/**
 * Command handler to scale a Kubernetes workload (Deployment, StatefulSet, or ReplicaSet).
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The workload tree item that was right-clicked
 */
export async function scaleWorkloadCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // 1. Validate tree item
        if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
            vscode.window.showErrorMessage('Failed to scale: Invalid resource');
            return;
        }
        
        // 2. Validate resourceData exists
        if (!treeItem.resourceData) {
            vscode.window.showErrorMessage('Failed to scale: Missing resource data');
            return;
        }
        
        // 3. Extract resource information
        const kind = treeItem.contextValue.replace('resource:', '') as 'Deployment' | 'StatefulSet' | 'ReplicaSet';
        const name = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        const namespace = treeItem.resourceData.namespace || 'default';
        
        // Get kubeconfig path from tree provider
        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to scale: Kubeconfig path not available');
            return;
        }
        
        // Get context name from resourceData
        const contextName = treeItem.resourceData.context.name;
        
        if (!name || !contextName) {
            vscode.window.showErrorMessage('Failed to scale: Missing resource information');
            return;
        }
        
        // 4. Get current replica count
        const currentReplicas = await WorkloadCommands.getCurrentReplicaCount(
            kubeconfigPath,
            contextName,
            kind,
            name,
            namespace
        );
        
        const currentReplicasText = currentReplicas !== null ? currentReplicas.toString() : 'unknown';
        const replicaWord = currentReplicas === 1 ? 'replica' : 'replicas';
        
        // 5. Show input dialog with validation
        const input = await vscode.window.showInputBox({
            title: `Scale ${name}`,
            prompt: 'Enter the desired number of replicas',
            placeHolder: `Current: ${currentReplicasText} ${replicaWord}`,
            validateInput: validateReplicaCount
        });
        
        // 6. Check if user cancelled
        if (input === undefined) {
            return; // User pressed Escape or clicked Cancel
        }
        
        const newReplicaCount = parseInt(input, 10);
        
        // 7. Perform scaling with progress notification
        const success = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Scaling ${name}...`,
                cancellable: false
            },
            async () => {
                const result = await WorkloadCommands.scaleWorkload(
                    kubeconfigPath,
                    contextName,
                    kind,
                    name,
                    namespace,
                    newReplicaCount
                );
                return result.success;
            }
        );
        
        // 8. Show success notification
        if (success) {
            const newReplicaWord = newReplicaCount === 1 ? 'replica' : 'replicas';
            vscode.window.showInformationMessage(
                `Scaled ${name} to ${newReplicaCount} ${newReplicaWord}`
            );
            
            // Refresh tree view will be handled in next story
        }
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in scaleWorkloadCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to scale workload: ${errorMessage}`
        );
    }
}

