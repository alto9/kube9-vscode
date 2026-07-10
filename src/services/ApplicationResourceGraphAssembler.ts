/**
 * Pure host-side assembler for ApplicationResourceGraph snapshots (Tier A / crd_flat).
 */

import type { ArgoCDApplication, ArgoCDResource, HealthStatusCode, SyncStatusCode } from '../types/argocd';
import type { ArgoCDResourceTreeNode, ArgoCDResourceTreeResponse } from '../types/argocdResourceTree';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    managedResourceKeysEqual,
    topologyModeFromSource,
    type ApplicationKey,
    type ApplicationResourceGraph,
    type GraphNodeId,
    type ManagedResourceKey,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../types/applicationResourceGraph';
import type { ResourceOwnerRefsResult, KubernetesOwnerReference } from './ManagedResourceOwnerRefReader';

const CRD_FLAT_TOPOLOGY_SOURCE = 'crd_flat' as const;
const OWNER_REF_TOPOLOGY_SOURCE = 'kubernetes_owner_ref' as const;

function finalizeApplicationResourceGraph(
    applicationKey: ApplicationKey,
    nodes: ResourceGraphNode[],
    edges: ResourceGraphEdge[],
    topologySource: ApplicationResourceGraph['topologySource'],
    observedAt: string
): ApplicationResourceGraph {
    return {
        applicationKey,
        nodes,
        edges,
        topologySource,
        topologyMode: topologyModeFromSource(topologySource),
        structureVersion: computeStructureVersion({ nodes, edges }),
        observedAt
    };
}

export const INVALID_RESOURCE_ROW_WARNING = 'Skipped resource row: missing kind or name';

export interface CrdFlatGraphAssemblyResult {
    graph: ApplicationResourceGraph;
    assemblyWarnings: string[];
}

export interface BuildCrdFlatApplicationResourceGraphInput {
    application: ArgoCDApplication;
    applicationKey: ApplicationKey;
    observedAt?: string;
}

export interface BuildResourceTreeApplicationResourceGraphInput {
    application: ArgoCDApplication;
    applicationKey: ApplicationKey;
    resourceTree: ArgoCDResourceTreeResponse;
    observedAt?: string;
}

export interface BuildOwnerRefApplicationResourceGraphInput extends BuildCrdFlatApplicationResourceGraphInput {
    ownerRefsByResource: ResourceOwnerRefsResult[];
}

const RESOURCE_TREE_TOPOLOGY_SOURCE = 'argocd_resource_tree' as const;

function trimOrUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? undefined : trimmed;
}

function isApplicationTreeNode(
    node: ArgoCDResourceTreeNode,
    application: ArgoCDApplication
): boolean {
    const kind = trimOrUndefined(node.kind) ?? '';
    const name = trimOrUndefined(node.name) ?? '';
    const group = trimOrUndefined(node.group) ?? '';
    return (
        kind === 'Application' &&
        name === application.name &&
        (group === '' || group === 'argoproj.io')
    );
}

function treeNodeToManagedResourceKey(node: ArgoCDResourceTreeNode): ManagedResourceKey | null {
    const kind = trimOrUndefined(node.kind);
    const name = trimOrUndefined(node.name);
    if (!kind || !name) {
        return null;
    }
    const apiGroup = trimOrUndefined(node.group);
    return {
        namespace: node.namespace?.trim() ?? '',
        kind,
        name,
        ...(apiGroup ? { apiGroup } : {})
    };
}

function parentRefToManagedResourceKey(
    parentRef: NonNullable<ArgoCDResourceTreeNode['parentRefs']>[number]
): ManagedResourceKey | null {
    const kind = trimOrUndefined(parentRef.kind);
    const name = trimOrUndefined(parentRef.name);
    if (!kind || !name) {
        return null;
    }
    const apiGroup = trimOrUndefined(parentRef.group);
    return {
        namespace: parentRef.namespace?.trim() ?? '',
        kind,
        name,
        ...(apiGroup ? { apiGroup } : {})
    };
}

function findCrdResourceStatus(
    application: ArgoCDApplication,
    resourceKey: ManagedResourceKey
): ArgoCDResource | undefined {
    return application.resources.find((row) => managedResourceKeysEqual(toManagedResourceKey(row), resourceKey));
}

function healthFromTreeNode(node: ArgoCDResourceTreeNode): HealthStatusCode | undefined {
    const status = trimOrUndefined(node.health?.status);
    if (!status) {
        return undefined;
    }
    return toHealthStatusCode(status as HealthStatusCode);
}

function buildManagedResourceNodeFromTree(
    node: ArgoCDResourceTreeNode,
    application: ArgoCDApplication
): ResourceGraphNode | null {
    const resourceKey = treeNodeToManagedResourceKey(node);
    if (!resourceKey) {
        return null;
    }

    const crdRow = findCrdResourceStatus(application, resourceKey);
    const status: ResourceGraphNode['status'] = {
        syncStatus: crdRow ? toSyncStatusCode(crdRow.syncStatus) : 'Unknown',
        healthStatus: crdRow
            ? toHealthStatusCode(crdRow.healthStatus)
            : healthFromTreeNode(node) ?? 'Unknown'
    };
    const message = crdRow?.message ?? trimOrUndefined(node.health?.message);
    if (message) {
        status.message = message;
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

function resolveParentNodeId(
    parentRef: NonNullable<ArgoCDResourceTreeNode['parentRefs']>[number],
    application: ArgoCDApplication,
    nodeIdsByKey: Map<string, GraphNodeId>
): GraphNodeId | null {
    if (
        trimOrUndefined(parentRef.kind) === 'Application' &&
        trimOrUndefined(parentRef.name) === application.name
    ) {
        return buildApplicationRootNodeId(application.namespace, application.name);
    }

    const parentKey = parentRefToManagedResourceKey(parentRef);
    if (!parentKey) {
        return null;
    }

    return nodeIdsByKey.get(formatManagedResourceKey(parentKey)) ?? null;
}

export function buildResourceTreeApplicationResourceGraph(
    input: BuildResourceTreeApplicationResourceGraphInput
): CrdFlatGraphAssemblyResult {
    const { application, applicationKey, resourceTree } = input;
    const observedAt = input.observedAt ?? new Date().toISOString();
    const assemblyWarnings: string[] = [];

    const rootNode = buildApplicationRootNode(application);
    const managedNodes: ResourceGraphNode[] = [];
    const nodeIdsByKey = new Map<string, GraphNodeId>();
    const seenNodeIds = new Set<GraphNodeId>();

    for (const treeNode of resourceTree.nodes ?? []) {
        if (isApplicationTreeNode(treeNode, application)) {
            continue;
        }

        const managedNode = buildManagedResourceNodeFromTree(treeNode, application);
        if (!managedNode || seenNodeIds.has(managedNode.id)) {
            if (managedNode && seenNodeIds.has(managedNode.id)) {
                assemblyWarnings.push(`Skipped duplicate resource-tree node: ${managedNode.id}`);
            } else if (!managedNode) {
                assemblyWarnings.push('Skipped resource-tree node: missing kind or name');
            }
            continue;
        }

        seenNodeIds.add(managedNode.id);
        managedNodes.push(managedNode);
        if (managedNode.resourceKey) {
            nodeIdsByKey.set(formatManagedResourceKey(managedNode.resourceKey), managedNode.id);
        }
    }

    const edges: ResourceGraphEdge[] = [];
    const edgeIds = new Set<string>();

    for (const treeNode of resourceTree.nodes ?? []) {
        if (isApplicationTreeNode(treeNode, application)) {
            continue;
        }

        const childKey = treeNodeToManagedResourceKey(treeNode);
        if (!childKey) {
            continue;
        }
        const childId = nodeIdsByKey.get(formatManagedResourceKey(childKey));
        if (!childId) {
            continue;
        }

        const parentRefs = treeNode.parentRefs ?? [];
        if (parentRefs.length === 0) {
            const edgeId = buildGraphEdgeId(rootNode.id, childId, 'manages');
            if (!edgeIds.has(edgeId)) {
                edgeIds.add(edgeId);
                edges.push({
                    id: edgeId,
                    source: rootNode.id,
                    target: childId,
                    relationship: 'manages'
                });
            }
            continue;
        }

        for (const parentRef of parentRefs) {
            const parentId = resolveParentNodeId(parentRef, application, nodeIdsByKey);
            if (!parentId) {
                assemblyWarnings.push(
                    `Skipped parent edge for ${childKey.kind}/${childKey.name}: parent not found in graph`
                );
                continue;
            }

            const relationship = parentId === rootNode.id ? 'manages' : 'owns';
            const edgeId = buildGraphEdgeId(parentId, childId, relationship);
            if (edgeIds.has(edgeId)) {
                continue;
            }
            edgeIds.add(edgeId);
            edges.push({
                id: edgeId,
                source: parentId,
                target: childId,
                relationship
            });
        }
    }

    const nodes = [rootNode, ...managedNodes];
    const graph = finalizeApplicationResourceGraph(
        applicationKey,
        nodes,
        edges,
        RESOURCE_TREE_TOPOLOGY_SOURCE,
        observedAt
    );

    return { graph, assemblyWarnings };
}


function trimOrEmpty(value: string | undefined): string {
    return value?.trim() ?? '';
}

function isValidResourceRow(row: ArgoCDResource): boolean {
    return trimOrEmpty(row.kind) !== '' && trimOrEmpty(row.name) !== '';
}

export function hasSkippedInvalidResourceRows(warnings: string[]): boolean {
    return warnings.some((warning) => warning === INVALID_RESOURCE_ROW_WARNING);
}

export function countValidCrdFlatResourceRows(resources: ArgoCDResource[]): number {
    const seenKeys: ManagedResourceKey[] = [];
    let count = 0;

    for (const row of resources) {
        if (!isValidResourceRow(row)) {
            continue;
        }

        const resourceKey = toManagedResourceKey(row);
        const isDuplicate = seenKeys.some((seen) => managedResourceKeysEqual(seen, resourceKey));
        if (isDuplicate) {
            continue;
        }

        seenKeys.push(resourceKey);
        count += 1;
    }

    return count;
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
            assemblyWarnings.push(INVALID_RESOURCE_ROW_WARNING);
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

    const graph = finalizeApplicationResourceGraph(
        applicationKey,
        nodes,
        edges,
        CRD_FLAT_TOPOLOGY_SOURCE,
        observedAt
    );

    return { graph, assemblyWarnings };
}

function parseApiGroupFromApiVersion(apiVersion: string): string | undefined {
    const slash = apiVersion.indexOf('/');
    if (slash === -1) {
        return undefined;
    }
    return apiVersion.slice(0, slash);
}

function ownerRefToManagedResourceKey(
    ownerRef: { apiVersion?: string; kind?: string; name?: string },
    resourceNamespace: string
): ManagedResourceKey | null {
    const kind = trimOrEmpty(ownerRef.kind);
    const name = trimOrEmpty(ownerRef.name);
    if (!kind || !name) {
        return null;
    }

    const apiGroup = parseApiGroupFromApiVersion(ownerRef.apiVersion ?? '');
    return {
        namespace: resourceNamespace,
        kind,
        name,
        ...(apiGroup ? { apiGroup } : {})
    };
}

function resolveOwnerRefToNodeId(
    ownerRef: KubernetesOwnerReference,
    resourceNamespace: string,
    nodeIdsByKey: Map<string, GraphNodeId>
): GraphNodeId | null {
    const ownerKey = ownerRefToManagedResourceKey(ownerRef, resourceNamespace);
    if (!ownerKey) {
        return null;
    }
    return nodeIdsByKey.get(formatManagedResourceKey(ownerKey)) ?? null;
}

function selectResolvableOwnerNodeId(
    ownerRefs: KubernetesOwnerReference[],
    resourceNamespace: string,
    nodeIdsByKey: Map<string, GraphNodeId>
): GraphNodeId | null {
    const controllerOwners = ownerRefs.filter((ownerRef) => ownerRef.controller === true);
    const candidates = controllerOwners.length > 0 ? controllerOwners : ownerRefs;

    for (const ownerRef of candidates) {
        const nodeId = resolveOwnerRefToNodeId(ownerRef, resourceNamespace, nodeIdsByKey);
        if (nodeId) {
            return nodeId;
        }
    }

    return null;
}

/**
 * Enriches a CRD-flat graph with owns edges inferred from Kubernetes ownerReferences.
 * Returns null when no owns edges can be inferred (caller should keep crd_flat).
 */
export function buildOwnerRefApplicationResourceGraph(
    input: BuildOwnerRefApplicationResourceGraphInput
): CrdFlatGraphAssemblyResult | null {
    const baseline = buildCrdFlatApplicationResourceGraph(input);
    const { applicationKey } = input;
    const observedAt = input.observedAt ?? baseline.graph.observedAt;
    const assemblyWarnings = [...baseline.assemblyWarnings];

    const rootNode = baseline.graph.nodes.find((node) => node.role === 'application');
    const managedNodes = baseline.graph.nodes.filter((node) => node.role === 'managed_resource');
    if (!rootNode || managedNodes.length === 0) {
        return null;
    }

    const nodeIdsByKey = new Map<string, GraphNodeId>();
    for (const node of managedNodes) {
        if (node.resourceKey) {
            nodeIdsByKey.set(formatManagedResourceKey(node.resourceKey), node.id);
        }
    }

    const ownerRefsByKey = new Map<string, KubernetesOwnerReference[]>();
    for (const entry of input.ownerRefsByResource) {
        ownerRefsByKey.set(formatManagedResourceKey(entry.resourceKey), entry.ownerReferences);
    }

    const edges: ResourceGraphEdge[] = [];
    const edgeIds = new Set<string>();
    let ownsEdgeCount = 0;

    for (const childNode of managedNodes) {
        if (!childNode.resourceKey) {
            continue;
        }

        const childKey = formatManagedResourceKey(childNode.resourceKey);
        const ownerRefs = ownerRefsByKey.get(childKey) ?? [];
        const parentId = selectResolvableOwnerNodeId(
            ownerRefs,
            childNode.resourceKey.namespace,
            nodeIdsByKey
        );

        if (parentId) {
            const edgeId = buildGraphEdgeId(parentId, childNode.id, 'owns');
            if (!edgeIds.has(edgeId)) {
                edgeIds.add(edgeId);
                edges.push({
                    id: edgeId,
                    source: parentId,
                    target: childNode.id,
                    relationship: 'owns'
                });
                ownsEdgeCount += 1;
            }
            continue;
        }

        const managesEdgeId = buildGraphEdgeId(rootNode.id, childNode.id, 'manages');
        if (!edgeIds.has(managesEdgeId)) {
            edgeIds.add(managesEdgeId);
            edges.push({
                id: managesEdgeId,
                source: rootNode.id,
                target: childNode.id,
                relationship: 'manages'
            });
        }
    }

    if (ownsEdgeCount === 0) {
        return null;
    }

    const nodes = baseline.graph.nodes;
    const graph = finalizeApplicationResourceGraph(
        applicationKey,
        nodes,
        edges,
        OWNER_REF_TOPOLOGY_SOURCE,
        observedAt
    );

    return { graph, assemblyWarnings };
}
