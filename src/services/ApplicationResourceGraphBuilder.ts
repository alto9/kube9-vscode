import * as vscode from 'vscode';
import type { ArgoCDApplication } from '../types/argocd';
import type {
    ApplicationKey,
    ApplicationResourceGraph,
    LimitedTopologyReason,
    TopologySource
} from '../types/applicationResourceGraph';
import {
    buildCrdFlatApplicationResourceGraph,
    buildOwnerRefApplicationResourceGraph,
    buildResourceTreeApplicationResourceGraph,
    hasSkippedInvalidResourceRows
} from './ApplicationResourceGraphAssembler';
import { fetchApplicationResourceTree } from './ArgoCDRestClient';
import { ArgoCDRestAuthResolver } from './ArgoCDRestAuthResolver';
import type { ArgoCDService } from './ArgoCDService';
import { fetchManagedResourceOwnerReferences } from './ManagedResourceOwnerRefReader';
import { OperatorStatusClient } from './OperatorStatusClient';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';
import type { ArgoCDResourceTreeResponse } from '../types/argocdResourceTree';
import {
    OperatorResourceTreeClient,
    RESOURCE_TREE_ENRICHMENT_LOG_PREFIX
} from './OperatorResourceTreeClient';

export interface BuildApplicationResourceGraphInput {
    application: ArgoCDApplication;
    applicationKey: ApplicationKey;
    argoCDService: ArgoCDService;
    extensionContext: vscode.ExtensionContext;
    options?: BuildApplicationResourceGraphOptions;
}

export interface OperatorResourceTreeMemo {
    applicationKey: ApplicationKey;
    fetchedAt: string;
    resourceTree: ArgoCDResourceTreeResponse;
}

export interface BuildApplicationResourceGraphOptions {
    cancellationToken?: vscode.CancellationToken;
    bypassOperatorCache?: boolean;
    operatorTreeMemo?: OperatorResourceTreeMemo | null;
    onOperatorTreeMemoUpdate?: (memo: OperatorResourceTreeMemo) => void;
}

export interface BuildApplicationResourceGraphResult {
    graph: ApplicationResourceGraph;
    topologySource: TopologySource;
    assemblyWarnings: string[];
    skippedInvalidResourceRows: boolean;
}

export interface ApplicationResourceGraphBuilderDeps {
    operatorStatusClient?: OperatorStatusClient;
    operatorResourceTreeClient?: OperatorResourceTreeClient;
}

function getOutputChannel(): vscode.OutputChannel {
    return vscode.window.createOutputChannel('kube9 ArgoCD Service');
}

function applicationKeysEqual(a: ApplicationKey, b: ApplicationKey): boolean {
    return a.context === b.context && a.namespace === b.namespace && a.name === b.name;
}

function withLimitedTopologyReason(
    graph: ApplicationResourceGraph,
    reason: LimitedTopologyReason
): ApplicationResourceGraph {
    if (graph.topologyMode === 'full') {
        return graph;
    }
    return { ...graph, limitedTopologyReason: reason };
}

function logResourceTreeUnavailable(code: string | undefined, detail: string): void {
    const channel = getOutputChannel();
    if (code) {
        channel.appendLine(`${RESOURCE_TREE_ENRICHMENT_LOG_PREFIX}: ${code} (${detail})`);
        return;
    }
    channel.appendLine(`${RESOURCE_TREE_ENRICHMENT_LOG_PREFIX}: ${detail}`);
}

export function logAssemblyWarnings(prefix: string, warnings: string[]): void {
    if (warnings.length === 0) {
        return;
    }

    const channel = getOutputChannel();
    for (const warning of warnings) {
        channel.appendLine(`[WARNING] ${prefix}: ${warning}`);
    }
}

async function resolveOperatorTopologyContext(
    input: BuildApplicationResourceGraphInput,
    operatorStatusClient: OperatorStatusClient
): Promise<{
    isOperatedMode: boolean;
    argocdDetected: boolean;
    resourceTreeCapable: boolean;
}> {
    const unavailable = {
        isOperatedMode: false,
        argocdDetected: false,
        resourceTreeCapable: false
    };

    try {
        const kubeconfigPath =
            typeof input.argoCDService.getKubeconfigPath === 'function'
                ? input.argoCDService.getKubeconfigPath()
                : '';
        if (kubeconfigPath.trim() === '') {
            return unavailable;
        }

        const operatorStatus = await operatorStatusClient.getStatus(
            kubeconfigPath,
            input.applicationKey.context
        );
        const isOperatedMode =
            operatorStatus.mode === OperatorStatusMode.Operated ||
            operatorStatus.mode === OperatorStatusMode.Enabled;
        const argocdStatus = operatorStatus.status?.argocd;
        const argocdDetected = argocdStatus?.detected === true;
        const resourceTreeCapable = argocdStatus?.resourceTreeCapable === true;

        return { isOperatedMode, argocdDetected, resourceTreeCapable };
    } catch {
        return unavailable;
    }
}

export async function buildApplicationResourceGraph(
    input: BuildApplicationResourceGraphInput,
    deps: ApplicationResourceGraphBuilderDeps = {}
): Promise<BuildApplicationResourceGraphResult> {
    const observedAt = new Date().toISOString();
    const authResolver = new ArgoCDRestAuthResolver(input.extensionContext, input.argoCDService);
    const auth = await authResolver.resolve(input.applicationKey.context);
    const operatorStatusClient = deps.operatorStatusClient ?? new OperatorStatusClient();
    const operatorResourceTreeClient =
        deps.operatorResourceTreeClient ?? new OperatorResourceTreeClient();
    const operatorTopology = await resolveOperatorTopologyContext(
        input,
        operatorStatusClient
    );
    const { isOperatedMode, argocdDetected, resourceTreeCapable } = operatorTopology;

    if (auth.available) {
        try {
            const resourceTree = await fetchApplicationResourceTree(
                auth,
                input.application.name,
                input.application.namespace
            );
            const { graph, assemblyWarnings } = buildResourceTreeApplicationResourceGraph({
                application: input.application,
                applicationKey: input.applicationKey,
                resourceTree,
                observedAt
            });

            for (const warning of assemblyWarnings) {
                getOutputChannel().appendLine(`[WARNING] resource-tree graph assembly: ${warning}`);
            }

            return {
                graph,
                topologySource: 'argocd_resource_tree',
                assemblyWarnings,
                skippedInvalidResourceRows: hasSkippedInvalidResourceRows(assemblyWarnings)
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logResourceTreeUnavailable(undefined, message);
        }
    } else if (auth.reason) {
        getOutputChannel().appendLine(
            `[INFO] Argo CD resource-tree enrichment skipped: ${auth.reason}`
        );
    }

    if (isOperatedMode && argocdDetected && resourceTreeCapable) {
        const operatorAttempt = await tryBuildOperatorResourceTreeApplicationResourceGraph(
            input,
            operatorResourceTreeClient,
            observedAt
        );
        if (operatorAttempt) {
            for (const warning of operatorAttempt.assemblyWarnings) {
                getOutputChannel().appendLine(`[WARNING] resource-tree graph assembly: ${warning}`);
            }

            return {
                graph: operatorAttempt.graph,
                topologySource: 'argocd_resource_tree',
                assemblyWarnings: operatorAttempt.assemblyWarnings,
                skippedInvalidResourceRows: hasSkippedInvalidResourceRows(operatorAttempt.assemblyWarnings)
            };
        }
    }

    const limitedReasonBeforeFallback = resolveLimitedTopologyReasonBeforeFallback({
        isOperatedMode,
        argocdDetected,
        resourceTreeCapable,
        restAvailable: auth.available
    });

    const ownerRefAttempt = await tryBuildOwnerRefApplicationResourceGraph(input, observedAt);
    if (ownerRefAttempt) {
        for (const warning of ownerRefAttempt.assemblyWarnings) {
            getOutputChannel().appendLine(`[WARNING] owner-reference graph assembly: ${warning}`);
        }

        return {
            graph: withLimitedTopologyReason(ownerRefAttempt.graph, 'owner_ref'),
            topologySource: 'kubernetes_owner_ref',
            assemblyWarnings: ownerRefAttempt.assemblyWarnings,
            skippedInvalidResourceRows: hasSkippedInvalidResourceRows(ownerRefAttempt.assemblyWarnings)
        };
    }

    const { graph, assemblyWarnings } = buildCrdFlatApplicationResourceGraph({
        application: input.application,
        applicationKey: input.applicationKey,
        observedAt
    });

    logAssemblyWarnings('crd_flat graph assembly', assemblyWarnings);

    return {
        graph: withLimitedTopologyReason(graph, limitedReasonBeforeFallback),
        topologySource: 'crd_flat',
        assemblyWarnings,
        skippedInvalidResourceRows: hasSkippedInvalidResourceRows(assemblyWarnings)
    };
}

function resolveLimitedTopologyReasonBeforeFallback(input: {
    isOperatedMode: boolean;
    argocdDetected: boolean;
    resourceTreeCapable: boolean;
    restAvailable: boolean;
}): LimitedTopologyReason {
    if (input.isOperatedMode && input.argocdDetected && !input.resourceTreeCapable) {
        return 'operator_not_capable';
    }
    if (!input.isOperatedMode || !input.argocdDetected) {
        return 'rest_unavailable';
    }
    return 'enrichment_failed';
}

async function tryBuildOperatorResourceTreeApplicationResourceGraph(
    input: BuildApplicationResourceGraphInput,
    operatorResourceTreeClient: OperatorResourceTreeClient,
    observedAt: string
): Promise<ReturnType<typeof buildResourceTreeApplicationResourceGraph> | null> {
    const options = input.options;
    const memo = options?.operatorTreeMemo;
    if (
        memo &&
        !options?.bypassOperatorCache &&
        applicationKeysEqual(memo.applicationKey, input.applicationKey)
    ) {
        return buildResourceTreeApplicationResourceGraph({
            application: input.application,
            applicationKey: input.applicationKey,
            resourceTree: memo.resourceTree,
            observedAt
        });
    }

    try {
        const result = await operatorResourceTreeClient.fetchResourceTree({
            clusterContext: input.applicationKey.context,
            applicationName: input.application.name,
            applicationNamespace: input.application.namespace,
            cancellationToken: options?.cancellationToken
        });

        if (!result.ok) {
            logResourceTreeUnavailable(result.code, result.message);
            return null;
        }

        options?.onOperatorTreeMemoUpdate?.({
            applicationKey: input.applicationKey,
            fetchedAt: new Date().toISOString(),
            resourceTree: result.resourceTree
        });

        return buildResourceTreeApplicationResourceGraph({
            application: input.application,
            applicationKey: input.applicationKey,
            resourceTree: result.resourceTree,
            observedAt
        });
    } catch (error) {
        if (error instanceof vscode.CancellationError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        logResourceTreeUnavailable(undefined, message);
        return null;
    }
}

async function tryBuildOwnerRefApplicationResourceGraph(
    input: BuildApplicationResourceGraphInput,
    observedAt: string
): Promise<ReturnType<typeof buildOwnerRefApplicationResourceGraph>> {
    try {
        const { results, warnings } = await fetchManagedResourceOwnerReferences(
            input.applicationKey.context,
            input.application.resources
        );

        for (const warning of warnings) {
            getOutputChannel().appendLine(`[WARNING] owner-reference fetch: ${warning}`);
        }

        const ownerRefGraph = buildOwnerRefApplicationResourceGraph({
            application: input.application,
            applicationKey: input.applicationKey,
            ownerRefsByResource: results,
            observedAt
        });

        if (!ownerRefGraph) {
            getOutputChannel().appendLine(
                '[INFO] Kubernetes owner-reference enrichment unavailable; falling back to CRD-flat graph'
            );
            return null;
        }

        return {
            graph: ownerRefGraph.graph,
            assemblyWarnings: [...ownerRefGraph.assemblyWarnings, ...warnings]
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        getOutputChannel().appendLine(
            `[INFO] Kubernetes owner-reference enrichment failed; falling back to CRD-flat graph: ${message}`
        );
        return null;
    }
}
