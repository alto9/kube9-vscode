import type { ManagedResourceKey, ResourceGraphNode, ResourceGraphNodeRole } from '../../../types/applicationResourceGraph';
import type { ResourceActionWebviewMessage } from '../../../types/argocdWebviewProtocol';

export const ACTION_DEPLOYMENT_RESTART_ROLLOUT = 'deployment.restartRollout';
export const ACTION_RESOURCE_NAVIGATE_TREE = 'resource.navigateTree';

export type GraphOverflowMessageType = 'resourceAction' | 'viewInTree';

export interface GraphOverflowAction {
    actionId: string;
    label: string;
    messageType: GraphOverflowMessageType;
}

/**
 * Kinds that expose navigate-to-tree in the graph overflow menu (webview registry).
 * Must match `NAVIGATE_TREE_SUPPORTED_KINDS` in `KindCapabilityRegistry.ts` and
 * `ClusterTreeProvider.revealTreeResource` mappings.
 */
export const GRAPH_NAVIGATE_TREE_KINDS = new Set([
    'Deployment',
    'StatefulSet',
    'DaemonSet',
    'CronJob',
    'Pod',
    'Service',
    'ConfigMap',
    'Secret'
]);

export function getOverflowActions(role: ResourceGraphNodeRole, kind: string): GraphOverflowAction[] {
    if (role === 'application') {
        return [
            {
                actionId: 'viewInTree',
                label: 'View in tree',
                messageType: 'viewInTree'
            }
        ];
    }

    const actions: GraphOverflowAction[] = [];
    if (kind === 'Deployment') {
        actions.push({
            actionId: ACTION_DEPLOYMENT_RESTART_ROLLOUT,
            label: 'Restart rollout',
            messageType: 'resourceAction'
        });
    }

    if (GRAPH_NAVIGATE_TREE_KINDS.has(kind)) {
        actions.push({
            actionId: ACTION_RESOURCE_NAVIGATE_TREE,
            label: 'Navigate to resource in tree',
            messageType: 'resourceAction'
        });
    }

    return actions;
}

export function buildResourceActionPayload(
    actionId: string,
    resourceKey: ManagedResourceKey
): ResourceActionWebviewMessage {
    return {
        type: 'resourceAction',
        actionId,
        kind: resourceKey.kind,
        name: resourceKey.name,
        namespace: resourceKey.namespace,
        ...(resourceKey.apiGroup ? { group: resourceKey.apiGroup } : {})
    };
}

export function nodeBusyKeyFromResourceKey(resourceKey: ManagedResourceKey): string {
    return `${resourceKey.namespace}/${resourceKey.kind}/${resourceKey.name}`;
}

export function nodeBusyKeyFromNode(dto: ResourceGraphNode): string | null {
    if (dto.resourceKey) {
        return nodeBusyKeyFromResourceKey(dto.resourceKey);
    }
    return null;
}

interface VsCodePostMessage {
    postMessage(message: unknown): void;
}

export function postGraphOverflowAction(
    vscode: VsCodePostMessage,
    action: GraphOverflowAction,
    node: ResourceGraphNode
): void {
    if (action.messageType === 'viewInTree') {
        vscode.postMessage({ type: 'viewInTree' });
        return;
    }

    if (!node.resourceKey) {
        return;
    }

    vscode.postMessage(buildResourceActionPayload(action.actionId, node.resourceKey));
}
