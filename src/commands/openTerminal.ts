import { ClusterTreeItem } from '../tree/ClusterTreeItem';

/**
 * Command handler to open a terminal for a Kubernetes Pod resource.
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The Pod tree item that was right-clicked
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void> {
    // TODO: Implementation will be added in story 003
    // This stub allows the command to be registered without errors
    // Story 003 will add: pod validation, container selection, kubectl exec, and terminal creation
    return;
}

