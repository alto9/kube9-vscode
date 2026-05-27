import * as vscode from 'vscode';
import {
    applyRestartAnnotation,
    RolloutTimeoutError,
    showRestartConfirmationDialog,
    watchRolloutStatus
} from '../commands/restartWorkload';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import type {
    ExtensionToWebviewMessage,
    OperationPhase,
    ResourceActionWebviewMessage,
    ResourceNodeRef
} from '../types/argocdWebviewProtocol';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';

export const ACTION_DEPLOYMENT_RESTART_ROLLOUT = 'deployment.restartRollout';
export const ACTION_RESOURCE_NAVIGATE_TREE = 'resource.navigateTree';

/** Kinds that can be revealed in the cluster tree via resource.navigateTree. */
export const NAVIGATE_TREE_SUPPORTED_KINDS = new Set([
    'Deployment',
    'StatefulSet',
    'DaemonSet',
    'CronJob',
    'Pod',
    'Service',
    'ConfigMap',
    'Secret'
]);

export interface ResourceActionContext {
    context: string;
    treeProvider: ClusterTreeProvider;
    panel: vscode.WebviewPanel;
    kubeconfigPath: string;
}

export type ResourceActionHandler = (
    ctx: ResourceActionContext,
    message: ResourceActionWebviewMessage
) => Promise<void>;

const ACTION_REGISTRY: Record<
    string,
    { supportedKinds: Set<string>; handler: ResourceActionHandler }
> = {
    [ACTION_DEPLOYMENT_RESTART_ROLLOUT]: {
        supportedKinds: new Set(['Deployment']),
        handler: handleDeploymentRestartRollout
    },
    [ACTION_RESOURCE_NAVIGATE_TREE]: {
        supportedKinds: NAVIGATE_TREE_SUPPORTED_KINDS,
        handler: handleResourceNavigateTree
    }
};

export function buildResourceNodeRef(message: ResourceActionWebviewMessage): ResourceNodeRef {
    return {
        kind: message.kind,
        name: message.name,
        namespace: message.namespace,
        ...(message.group !== undefined ? { group: message.group } : {}),
        ...(message.version !== undefined ? { version: message.version } : {})
    };
}

export function postResourceActionProgress(
    panel: vscode.WebviewPanel,
    message: ResourceActionWebviewMessage,
    phase: OperationPhase,
    progressMessage?: string
): void {
    panel.webview.postMessage({
        type: 'resourceActionProgress',
        actionId: message.actionId,
        phase,
        ...(progressMessage !== undefined ? { message: progressMessage } : {}),
        nodeRef: buildResourceNodeRef(message)
    } satisfies ExtensionToWebviewMessage);
}

export function postResourceActionResult(
    panel: vscode.WebviewPanel,
    message: ResourceActionWebviewMessage,
    success: boolean,
    resultMessage: string
): void {
    panel.webview.postMessage({
        type: 'resourceActionResult',
        actionId: message.actionId,
        success,
        message: resultMessage,
        nodeRef: buildResourceNodeRef(message)
    } satisfies ExtensionToWebviewMessage);
}

export function resolveResourceActionHandler(
    actionId: string,
    kind: string
): ResourceActionHandler | 'unsupported_kind' | undefined {
    const entry = ACTION_REGISTRY[actionId];
    if (!entry) {
        return undefined;
    }
    if (!entry.supportedKinds.has(kind)) {
        return 'unsupported_kind';
    }
    return entry.handler;
}

export async function dispatchResourceAction(
    ctx: ResourceActionContext,
    message: ResourceActionWebviewMessage
): Promise<void> {
    const resolved = resolveResourceActionHandler(message.actionId, message.kind);
    if (resolved === undefined) {
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `Unknown action: ${message.actionId}`
        );
        return;
    }
    if (resolved === 'unsupported_kind') {
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `Action ${message.actionId} is not supported for kind ${message.kind}`
        );
        return;
    }

    try {
        await resolved(ctx, message);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        postResourceActionResult(ctx.panel, message, false, errorMessage);
    }
}

function isKubectlLikeError(error: unknown): error is KubectlError {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const candidate = error as Partial<KubectlError>;
    return (
        typeof candidate.type === 'string' &&
        typeof candidate.message === 'string' &&
        typeof candidate.getDetails === 'function'
    );
}

function isRolloutTimeoutLikeError(error: unknown): error is RolloutTimeoutError {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as RolloutTimeoutError).name === 'RolloutTimeoutError'
    );
}

function formatRestartFailureMessage(
    actionId: string,
    kind: string,
    name: string,
    error: unknown
): string {
    if (isRolloutTimeoutLikeError(error)) {
        return `${actionId} timed out for ${kind} ${name}: rollout did not complete within 5 minutes`;
    }

    if (isKubectlLikeError(error)) {
        let reason: string;
        switch (error.type) {
            case KubectlErrorType.PermissionDenied:
                reason = 'insufficient permissions';
                break;
            case KubectlErrorType.ConnectionFailed:
                reason = 'cannot connect to cluster';
                break;
            case KubectlErrorType.Timeout:
                reason = 'request timed out';
                break;
            case KubectlErrorType.BinaryNotFound:
                reason = 'kubectl not found';
                break;
            case KubectlErrorType.Unknown: {
                const lowerDetails = error.getDetails().toLowerCase();
                if (
                    lowerDetails.includes('notfound') ||
                    lowerDetails.includes('not found') ||
                    lowerDetails.includes('404') ||
                    lowerDetails.includes('does not exist')
                ) {
                    reason = 'resource may have been deleted';
                } else {
                    reason = 'kubernetes API request failed';
                }
                break;
            }
            default:
                reason = 'kubernetes API request failed';
        }
        return `${actionId} failed for ${kind} ${name}: ${reason}`;
    }

    const detail = error instanceof Error ? error.message : String(error);
    return `${actionId} failed for ${kind} ${name}: ${detail}`;
}

async function handleDeploymentRestartRollout(
    ctx: ResourceActionContext,
    message: ResourceActionWebviewMessage
): Promise<void> {
    const { kind, name, namespace, actionId } = message;

    if (!ctx.kubeconfigPath) {
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `${actionId} failed for ${kind} ${name}: kubeconfig path not available`
        );
        return;
    }

    const confirmation = await showRestartConfirmationDialog(name);
    if (!confirmation) {
        postResourceActionResult(ctx.panel, message, false, 'Cancelled');
        return;
    }

    postResourceActionProgress(
        ctx.panel,
        message,
        'Running',
        `Restarting ${kind} ${name}...`
    );

    try {
        await applyRestartAnnotation(
            name,
            namespace,
            kind,
            ctx.context,
            ctx.kubeconfigPath
        );

        if (confirmation.waitForRollout) {
            await watchRolloutStatus(
                name,
                namespace,
                kind,
                ctx.context,
                ctx.kubeconfigPath,
                {
                    report: ({ message: rolloutMessage }) => {
                        if (rolloutMessage) {
                            postResourceActionProgress(
                                ctx.panel,
                                message,
                                'Running',
                                rolloutMessage
                            );
                        }
                    }
                }
            );
        }

        postResourceActionProgress(ctx.panel, message, 'Succeeded', `Restarted ${kind} ${name}`);
        postResourceActionResult(
            ctx.panel,
            message,
            true,
            `Restarted ${kind} ${name} successfully`
        );
        ctx.treeProvider.refresh();
    } catch (error) {
        const failureMessage = formatRestartFailureMessage(actionId, kind, name, error);
        postResourceActionProgress(ctx.panel, message, 'Failed', failureMessage);
        postResourceActionResult(ctx.panel, message, false, failureMessage);
        ctx.treeProvider.refresh();
    }
}

async function handleResourceNavigateTree(
    ctx: ResourceActionContext,
    message: ResourceActionWebviewMessage
): Promise<void> {
    const { kind, name, namespace, actionId } = message;

    postResourceActionProgress(
        ctx.panel,
        message,
        'Running',
        `Navigating to ${kind} ${name}...`
    );

    if (!ctx.treeProvider.getKubeconfigPath()) {
        postResourceActionProgress(ctx.panel, message, 'Failed', 'Tree view is unavailable');
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `${actionId} failed for ${kind} ${name}: tree view is unavailable`
        );
        return;
    }

    const contextMatches = await ctx.treeProvider.isCurrentContext(ctx.context);
    if (!contextMatches) {
        postResourceActionProgress(ctx.panel, message, 'Failed', 'Cluster context mismatch');
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `${actionId} failed for ${kind} ${name}: active cluster context does not match this application`
        );
        return;
    }

    try {
        await vscode.commands.executeCommand('kube9.treeView.focus');
        ctx.treeProvider.refresh();

        const revealed = await ctx.treeProvider.revealTreeResource(kind, name, namespace);
        if (revealed) {
            postResourceActionProgress(
                ctx.panel,
                message,
                'Succeeded',
                `Focused ${kind} ${name} in cluster tree`
            );
            postResourceActionResult(
                ctx.panel,
                message,
                true,
                `Focused ${kind} ${name} in cluster tree`
            );
            return;
        }

        postResourceActionProgress(ctx.panel, message, 'Failed', 'Resource not found in tree');
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `${actionId} failed for ${kind} ${name}: resource not found in cluster tree`
        );
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        postResourceActionProgress(ctx.panel, message, 'Failed', detail);
        postResourceActionResult(
            ctx.panel,
            message,
            false,
            `${actionId} failed for ${kind} ${name}: ${detail}`
        );
    }
}
