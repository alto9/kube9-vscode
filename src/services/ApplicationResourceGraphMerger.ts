/**
 * Pure merge helper for successive ApplicationResourceGraph snapshots.
 *
 * Host-side DTO merge only; layout cache is webview-owned (see `.forge/data/consistency.md`).
 */

import {
    computeStructureVersion,
    type ApplicationKey,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../types/applicationResourceGraph';

export interface ApplicationResourceGraphMergeResult {
    graph: ApplicationResourceGraph;
    structureChanged: boolean;
}

function applicationKeysEqual(a: ApplicationKey, b: ApplicationKey): boolean {
    return a.context === b.context && a.namespace === b.namespace && a.name === b.name;
}

function nodeIdSet(graph: ApplicationResourceGraph): Set<string> {
    return new Set(graph.nodes.map((node) => node.id));
}

function nodeIdSetsEqual(previous: Set<string>, incoming: Set<string>): boolean {
    if (previous.size !== incoming.size) {
        return false;
    }
    for (const id of previous) {
        if (!incoming.has(id)) {
            return false;
        }
    }
    return true;
}

function mergeNodeAttributes(previous: ResourceGraphNode, incoming: ResourceGraphNode): ResourceGraphNode {
    return {
        id: incoming.id,
        role: incoming.role,
        resourceKey: incoming.resourceKey,
        status: incoming.status,
        label: incoming.label,
        kindLabel: incoming.kindLabel
    };
}

function mergeAttributeOnlySnapshot(
    previous: ApplicationResourceGraph,
    incoming: ApplicationResourceGraph
): ApplicationResourceGraph {
    const previousById = new Map(previous.nodes.map((node) => [node.id, node]));
    const nodes = incoming.nodes.map((incomingNode) => {
        const priorNode = previousById.get(incomingNode.id);
        if (!priorNode) {
            return incomingNode;
        }
        return mergeNodeAttributes(priorNode, incomingNode);
    });

    return {
        applicationKey: incoming.applicationKey,
        nodes,
        edges: incoming.edges,
        topologySource: incoming.topologySource,
        topologyMode: incoming.topologyMode,
        structureVersion: incoming.structureVersion,
        observedAt: incoming.observedAt,
        layoutHint: incoming.layoutHint,
        truncated: incoming.truncated
    };
}

export function mergeApplicationResourceGraphSnapshots(
    previous: ApplicationResourceGraph | undefined,
    incoming: ApplicationResourceGraph
): ApplicationResourceGraphMergeResult {
    if (previous === undefined || !applicationKeysEqual(previous.applicationKey, incoming.applicationKey)) {
        return { graph: incoming, structureChanged: true };
    }

    const structureVersionChanged = previous.structureVersion !== incoming.structureVersion;
    const nodeIdsChanged = !nodeIdSetsEqual(nodeIdSet(previous), nodeIdSet(incoming));
    const recomputedVersion = computeStructureVersion({
        nodes: incoming.nodes,
        edges: incoming.edges
    });
    const structureVersionMismatch =
        previous.structureVersion === incoming.structureVersion &&
        incoming.structureVersion !== recomputedVersion;

    if (structureVersionChanged || nodeIdsChanged || structureVersionMismatch) {
        return { graph: incoming, structureChanged: true };
    }

    return {
        graph: mergeAttributeOnlySnapshot(previous, incoming),
        structureChanged: false
    };
}
