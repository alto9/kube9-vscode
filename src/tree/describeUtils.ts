import { ClusterTreeItem } from './ClusterTreeItem';
import { TreeItemType } from './TreeItemTypes';

/**
 * Types of tree items that can be described.
 * These are individual resource items (not categories or subcategories).
 */
const describableTypes: TreeItemType[] = [
    'deployment',
    'statefulset',
    'daemonset',
    'cronjob',
    'pod',
    'service',
    'configmap',
    'secret',
    'persistentVolume',
    'persistentVolumeClaim',
    'storageClass',
    'crd',
    'namespace',
    'nodes'
];

/**
 * Check if a tree item type is describable.
 * 
 * @param type The tree item type to check
 * @returns True if the type can be described
 */
function isDescribableType(type: TreeItemType): boolean {
    return describableTypes.includes(type);
}

/**
 * Add Describe command to tree items that can be described.
 * Sets up both left-click activation and right-click context menu command.
 * 
 * @param items Array of tree items to process
 * @returns Array of tree items with Describe commands added
 */
export function addDescribeCommandToItems(items: ClusterTreeItem[]): ClusterTreeItem[] {
    return items.map(item => {
        // Only add Describe command to describable resource types
        if (isDescribableType(item.type)) {
            // Set command for left-click activation
            item.command = {
                command: 'kube9.describeResource',
                title: 'Describe',
                arguments: [item]
            };
        }
        return item;
    });
}

