import * as vscode from 'vscode';
import type { ArgoCDApplication } from '../types/argocd';
import type { ApplicationKey, ApplicationResourceGraph, TopologySource } from '../types/applicationResourceGraph';
import {
    buildCrdFlatApplicationResourceGraph,
    buildOwnerRefApplicationResourceGraph,
    buildResourceTreeApplicationResourceGraph
} from './ApplicationResourceGraphAssembler';
import { fetchApplicationResourceTree } from './ArgoCDRestClient';
import { ArgoCDRestAuthResolver } from './ArgoCDRestAuthResolver';
import { fetchManagedResourceOwnerReferences } from './ManagedResourceOwnerRefReader';
import type { ArgoCDService } from './ArgoCDService';

export interface BuildApplicationResourceGraphInput {
    application: ArgoCDApplication;
    applicationKey: ApplicationKey;
    argoCDService: ArgoCDService;
    extensionContext: vscode.ExtensionContext;
}

export interface BuildApplicationResourceGraphResult {
    graph: ApplicationResourceGraph;
    topologySource: TopologySource;
    assemblyWarnings: string[];
}

function getOutputChannel(): vscode.OutputChannel {
    return vscode.window.createOutputChannel('kube9 ArgoCD Service');
}

export async function buildApplicationResourceGraph(
    input: BuildApplicationResourceGraphInput
): Promise<BuildApplicationResourceGraphResult> {
    const observedAt = new Date().toISOString();
    const authResolver = new ArgoCDRestAuthResolver(input.extensionContext, input.argoCDService);
    const auth = await authResolver.resolve(input.applicationKey.context);

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
                assemblyWarnings
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            getOutputChannel().appendLine(
                `[INFO] Argo CD resource-tree enrichment unavailable; falling back to CRD-flat graph: ${message}`
            );
        }
    } else if (auth.reason) {
        getOutputChannel().appendLine(
            `[INFO] Argo CD resource-tree enrichment skipped: ${auth.reason}`
        );
    }

    const ownerRefAttempt = await tryBuildOwnerRefApplicationResourceGraph(input, observedAt);
    if (ownerRefAttempt) {
        for (const warning of ownerRefAttempt.assemblyWarnings) {
            getOutputChannel().appendLine(`[WARNING] owner-reference graph assembly: ${warning}`);
        }

        return {
            graph: ownerRefAttempt.graph,
            topologySource: 'kubernetes_owner_ref',
            assemblyWarnings: ownerRefAttempt.assemblyWarnings
        };
    }

    const { graph, assemblyWarnings } = buildCrdFlatApplicationResourceGraph({
        application: input.application,
        applicationKey: input.applicationKey,
        observedAt
    });

    return {
        graph,
        topologySource: 'crd_flat',
        assemblyWarnings
    };
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
