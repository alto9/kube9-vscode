/**
 * Pure host-side assembler for ApplicationResourceGraph snapshots (Tier A / crd_flat).
 */

import type { ArgoCDApplication, ArgoCDResource, HealthStatusCode, SyncStatusCode } from '../types/argocd';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    managedResourceKeysEqual,
    topologyModeFromSource,
    type ApplicationKey,
    type ApplicationResourceGraph,
    type ManagedResourceKey,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../types/applicationResourceGraph';
import { truncateApplicationResourceGraph } from './ApplicationResourceGraphTruncation';

export interface CrdFlatGraphAssemblyResult {
    graph: ApplicationResourceGraph;
    assemblyWarnings: string[];
}

export interface BuildCrdFlatApplicationResourceGraphInput {
    application: ArgoCDApplication;
    applicationKey: ApplicationKey;
    observedAt?: string;
}

const TOPOLOGY_SOURCE = 'crd_flat' as const;

function trimOrEmpty(value: string | undefined): string {
    return value?.trim() ?? '';
}

function isValidResourceRow(row: ArgoCDResource): boolean {
    return trimOrEmpty(row.kind) !== '' && trimOrEmpty(row.name) !== '';
}

function toSyncStatusCode(status: string): SyncStatusCode {
    if (status === 'Synced' || status === 'OutOfSync' || status === 'Unknown') {
        return status;
    }
    return 'Unknown';
}

function toHealthStatusCode(status: HealthStatusCode | undefined): HealthStatusCode {
    return status ?? 'Unknown';
}

function toManagedResourceKey(row: ArgoCDResource): ManagedResourceKey {
    return {
        namespace: row.namespace,
        kind: trimOrEmpty(row.kind),
        name: trimOrEmpty(row.name)
    };
}

function formatManagedResourceKey(key: ManagedResourceKey): string {
    return `${key.namespace}/${key.kind}/${key.name}`;
}

function buildApplicationRootNode(application: ArgoCDApplication): ResourceGraphNode {
    const rootId = buildApplicationRootNodeId(application.namespace, application.name);
    const status: ResourceGraphNode['status'] = {
        syncStatus: application.syncStatus.status,
        healthStatus: application.healthStatus.status
    };
    if (application.healthStatus.message) {
        status.message = application.healthStatus.message;
    }
    return {
        id: rootId,
        role: 'application',
        resourceKey: null,
        status,
        label: application.name,
        kindLabel: 'Application'
    };
}

function buildManagedResourceNode(row: ArgoCDResource): ResourceGraphNode {
    const resourceKey = toManagedResourceKey(row);
    const status: ResourceGraphNode['status'] = {
        syncStatus: toSyncStatusCode(row.syncStatus),
        healthStatus: toHealthStatusCode(row.healthStatus)
    };
    if (row.message) {
        status.message = row.message;
    }
    return {
        id: buildManagedResourceNodeId(resourceKey),
        role: 'managed_resource',
        resourceKey,
        status,
        label: resourceKey.name,
        kindLabel: resourceKey.kind
    };
}

export function buildCrdFlatApplicationResourceGraph(
    input: BuildCrdFlatApplicationResourceGraphInput
): CrdFlatGraphAssemblyResult {
    const { application, applicationKey } = input;
    const observedAt = input.observedAt ?? new Date().toISOString();
    const assemblyWarnings: string[] = [];

    const rootNode = buildApplicationRootNode(application);
    const managedNodes: ResourceGraphNode[] = [];
    const seenKeys: ManagedResourceKey[] = [];

    for (const row of application.resources) {
        if (!isValidResourceRow(row)) {
            assemblyWarnings.push('Skipped resource row: missing kind or name');
            continue;
        }

        const resourceKey = toManagedResourceKey(row);
        const isDuplicate = seenKeys.some((seen) => managedResourceKeysEqual(seen, resourceKey));
        if (isDuplicate) {
            assemblyWarnings.push(
                `Skipped duplicate managed resource: ${formatManagedResourceKey(resourceKey)}`
            );
            continue;
        }

        seenKeys.push(resourceKey);
        managedNodes.push(buildManagedResourceNode(row));
    }

    const nodes = [rootNode, ...managedNodes];
    const edges: ResourceGraphEdge[] = managedNodes.map((node) => ({
        id: buildGraphEdgeId(rootNode.id, node.id, 'manages'),
        source: rootNode.id,
        target: node.id,
        relationship: 'manages' as const
    }));

    const graph: ApplicationResourceGraph = truncateApplicationResourceGraph({
        applicationKey,
        nodes,
        edges,
        topologySource: TOPOLOGY_SOURCE,
        topologyMode: topologyModeFromSource(TOPOLOGY_SOURCE),
        structureVersion: computeStructureVersion({ nodes, edges }),
        observedAt
    });

    return { graph, assemblyWarnings };
}
