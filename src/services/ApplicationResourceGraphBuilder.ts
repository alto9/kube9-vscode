import * as vscode from 'vscode';
import type { ArgoCDApplication } from '../types/argocd';
import type { ApplicationKey, ApplicationResourceGraph, TopologySource } from '../types/applicationResourceGraph';
import {
    buildCrdFlatApplicationResourceGraph,
    buildResourceTreeApplicationResourceGraph
} from './ApplicationResourceGraphAssembler';
import { fetchApplicationResourceTree } from './ArgoCDRestClient';
import { ArgoCDRestAuthResolver } from './ArgoCDRestAuthResolver';
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
