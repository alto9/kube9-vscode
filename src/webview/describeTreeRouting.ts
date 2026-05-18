import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { NamespaceTreeItem } from '../tree/items/NamespaceTreeItem';
import { PodTreeItem, PodStatus } from '../tree/items/PodTreeItem';

function kindFromTreeContext(contextValue: string | undefined): string {
    if (!contextValue) {
        return 'Unknown';
    }
    const parts = contextValue.split(':');
    return parts.length > 1 ? parts[1] : contextValue;
}

export type SpecializedDescribeResolution =
    | {
          kind: 'pod';
          podConfig: {
              name: string;
              namespace: string;
              status?: PodStatus;
              metadata: Record<string, unknown>;
              context: string;
          };
      }
    | {
          kind: 'namespace';
          namespaceConfig: {
              name: string;
              status: k8s.V1NamespaceStatus;
              metadata: k8s.V1ObjectMeta;
              context: string;
          };
      }
    | { kind: 'cronjob'; name: string; namespace: string; context: string }
    | { kind: 'node'; name: string; context: string }
    | { kind: 'skip'; reason: 'missing-namespace' };

/**
 * Maps a cluster tree item to a specialized describe target (Pod / Namespace / CronJob / Node).
 * Context-menu **Describe** uses `kube9.describeResource` → `DescribeWebview.showFromTreeItem`; this
 * must align with the default commands on those items (e.g. `kube9.describePod`) so both paths
 * open the same structured webviews.
 *
 * Returns `undefined` when the generic Describe stub should handle the kind.
 */
export function resolveSpecializedDescribeFromTreeItem(
    treeItem: ClusterTreeItem
): SpecializedDescribeResolution | undefined {
    if (!treeItem.resourceData) {
        return undefined;
    }

    const contextName = treeItem.resourceData.context.name;
    const name = treeItem.resourceData.resourceName || (treeItem.label as string);
    const namespace = treeItem.resourceData.namespace;
    const kind = kindFromTreeContext(treeItem.contextValue);

    const isNamespaceItem = treeItem.type === 'namespace' || kind === 'Namespace';

    if (isNamespaceItem) {
        if (treeItem instanceof NamespaceTreeItem) {
            const ni = treeItem.namespaceInfo;
            return {
                kind: 'namespace',
                namespaceConfig: {
                    name: ni.name,
                    status: ni.status,
                    metadata: ni.metadata,
                    context: contextName
                }
            };
        }
        return {
            kind: 'namespace',
            namespaceConfig: {
                name,
                status: { phase: 'Active' } as k8s.V1NamespaceStatus,
                metadata: { name } as k8s.V1ObjectMeta,
                context: contextName
            }
        };
    }

    if (kind === 'Pod') {
        if (!namespace) {
            return { kind: 'skip', reason: 'missing-namespace' };
        }
        if (treeItem instanceof PodTreeItem) {
            return {
                kind: 'pod',
                podConfig: {
                    name,
                    namespace,
                    status: treeItem.podInfo.status,
                    metadata: {},
                    context: contextName
                }
            };
        }
        return {
            kind: 'pod',
            podConfig: {
                name,
                namespace,
                status: 'Unknown',
                metadata: {},
                context: contextName
            }
        };
    }

    if (kind === 'CronJob') {
        if (!namespace) {
            return { kind: 'skip', reason: 'missing-namespace' };
        }
        return { kind: 'cronjob', name, namespace, context: contextName };
    }

    if (kind === 'Node') {
        return { kind: 'node', name, context: contextName };
    }

    return undefined;
}
