/**
 * Application resource graph DTOs and identity helpers.
 *
 * Aligned with `.forge/data/data_model.md` and `.forge/data/consistency.md`.
 */

import { createHash } from 'crypto';
import type { HealthStatusCode, SyncStatusCode } from './argocd';

export type GraphNodeId = string;

export interface ApplicationKey {
    context: string;
    namespace: string;
    name: string;
}

export interface ManagedResourceKey {
    namespace: string;
    kind: string;
    name: string;
    apiGroup?: string;
}

export type TopologySource =
    | 'crd_flat'
    | 'argocd_resource_tree'
    | 'kubernetes_owner_ref'
    | 'operator_snapshot';

export type TopologyMode = 'full' | 'limited';

export type LimitedTopologyReason =
    | 'operator_not_capable'
    | 'rest_unavailable'
    | 'enrichment_failed'
    | 'owner_ref';

export type EdgeRelationship = 'manages' | 'owns' | 'depends_on';

export type ResourceGraphNodeRole = 'application' | 'managed_resource';

export interface ResourceGraphNodeStatus {
    syncStatus: SyncStatusCode;
    healthStatus: HealthStatusCode;
    message?: string;
}

export interface ResourceGraphNode {
    id: GraphNodeId;
    role: ResourceGraphNodeRole;
    resourceKey: ManagedResourceKey | null;
    status: ResourceGraphNodeStatus;
    label: string;
    kindLabel: string;
}

export interface ResourceGraphEdge {
    id: string;
    source: GraphNodeId;
    target: GraphNodeId;
    relationship: EdgeRelationship;
}

export interface ApplicationResourceGraph {
    applicationKey: ApplicationKey;
    nodes: ResourceGraphNode[];
    edges: ResourceGraphEdge[];
    topologySource: TopologySource;
    topologyMode: TopologyMode;
    limitedTopologyReason?: LimitedTopologyReason;
    structureVersion: string;
    observedAt: string;
    layoutHint?: {
        algorithm?: string;
        version?: string;
        [key: string]: unknown;
    };
    truncated?: boolean;
}

export function buildApplicationRootNodeId(namespace: string, name: string): GraphNodeId {
    return `app:${namespace}/${name}`;
}

export function buildManagedResourceNodeId(key: ManagedResourceKey): GraphNodeId {
    const base = `res:${key.namespace}/${key.kind}/${key.name}`;
    if (key.apiGroup) {
        return `${base}/${key.apiGroup}`;
    }
    return base;
}

export function buildGraphEdgeId(
    source: GraphNodeId,
    target: GraphNodeId,
    relationship: EdgeRelationship
): string {
    return `${source}->${target}:${relationship}`;
}

export function managedResourceKeysEqual(a: ManagedResourceKey, b: ManagedResourceKey): boolean {
    if (a.namespace !== b.namespace || a.kind !== b.kind || a.name !== b.name) {
        return false;
    }
    const aHasApiGroup = a.apiGroup !== undefined && a.apiGroup !== '';
    const bHasApiGroup = b.apiGroup !== undefined && b.apiGroup !== '';
    if (aHasApiGroup && bHasApiGroup) {
        return a.apiGroup === b.apiGroup;
    }
    return true;
}

export function topologyModeFromSource(source: TopologySource): TopologyMode {
    if (source === 'argocd_resource_tree') {
        return 'full';
    }
    return 'limited';
}

export function computeStructureVersion(input: {
    nodes: Array<Pick<ResourceGraphNode, 'id'>>;
    edges: Array<Pick<ResourceGraphEdge, 'source' | 'target'>>;
}): string {
    const nodeIds = input.nodes.map((node) => node.id).sort();
    const edgePairs = input.edges
        .map((edge) => `${edge.source}\t${edge.target}`)
        .sort();
    const payload = `nodes:${nodeIds.join('\n')}\nedges:${edgePairs.join('\n')}`;
    return createHash('sha256').update(payload).digest('hex');
}
