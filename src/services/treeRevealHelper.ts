import * as vscode from 'vscode';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';

export type ManagedResourceRevealFailureReason =
    | 'tree_unavailable'
    | 'context_mismatch'
    | 'not_found'
    | 'unexpected_error';

export interface ManagedResourceRevealResult {
    success: boolean;
    reason?: ManagedResourceRevealFailureReason;
    message?: string;
    detail?: string;
}

export interface TreeRevealContext {
    treeProvider: ClusterTreeProvider;
    panelContext: string;
}

export interface ManagedResourceRevealOptions {
    /** Application spec.destination.namespace for empty resource-namespace fallback. */
    destinationNamespace?: string;
}

/**
 * Resolve the namespace used for cluster-tree reveal from a managed resource key.
 * Never substitutes Application CR namespace; non-empty resource namespace wins.
 */
export function resolveManagedResourceRevealNamespace(
    resourceNamespace: string,
    destinationNamespace?: string
): string {
    const trimmedResource = resourceNamespace.trim();
    if (trimmedResource.length > 0) {
        return trimmedResource;
    }

    return (destinationNamespace ?? '').trim();
}

export async function focusAndRefreshClusterTree(treeProvider: ClusterTreeProvider): Promise<void> {
    await vscode.commands.executeCommand('kube9ClusterView.focus');
    treeProvider.invalidateCachesBeforeTreeReveal();
}

export async function revealManagedResourceInTree(
    ctx: TreeRevealContext,
    kind: string,
    name: string,
    resourceNamespace: string,
    options: ManagedResourceRevealOptions = {}
): Promise<ManagedResourceRevealResult> {
    const resolvedNamespace = resolveManagedResourceRevealNamespace(
        resourceNamespace,
        options.destinationNamespace
    );

    if (!ctx.treeProvider.getKubeconfigPath()) {
        return {
            success: false,
            reason: 'tree_unavailable',
            message: `resource.navigateTree failed for ${kind} ${name}: tree view is unavailable`
        };
    }

    const contextMatches = await ctx.treeProvider.isCurrentContext(ctx.panelContext);
    if (!contextMatches) {
        return {
            success: false,
            reason: 'context_mismatch',
            message: `resource.navigateTree failed for ${kind} ${name}: active cluster context does not match this application`
        };
    }

    try {
        await focusAndRefreshClusterTree(ctx.treeProvider);
        const revealed = await ctx.treeProvider.revealTreeResource(kind, name, resolvedNamespace);
        if (revealed) {
            return {
                success: true,
                message: `Focused ${kind} ${name} in cluster tree`
            };
        }

        return {
            success: false,
            reason: 'not_found',
            message: `resource.navigateTree failed for ${kind} ${name}: resource not found in cluster tree`
        };
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            reason: 'unexpected_error',
            message: `resource.navigateTree failed for ${kind} ${name}: ${detail}`,
            detail
        };
    }
}

export async function revealApplicationInTree(
    treeProvider: ClusterTreeProvider,
    applicationName: string,
    applicationNamespace: string
): Promise<{ success: boolean; notFound?: boolean; treeUnavailable?: boolean; error?: string }> {
    if (!treeProvider.getKubeconfigPath()) {
        return { success: false, treeUnavailable: true };
    }

    try {
        await focusAndRefreshClusterTree(treeProvider);
        const revealed = await treeProvider.revealTreeApplication(applicationName, applicationNamespace);
        if (revealed) {
            return { success: true };
        }

        return { success: false, notFound: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}
