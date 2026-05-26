/**
 * Caps ApplicationResourceGraph managed node count for host/webview responsiveness.
 *
 * Progressive disclosure (M12): when `truncated === true`, the webview SHOULD show a
 * non-blocking banner: "Showing 200 of N managed resources. Topology may be incomplete."
 * where N is full `application.resources.length` from latest applicationData.
 */

import {
    buildGraphEdgeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ManagedResourceKey,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../types/applicationResourceGraph';
import { MAX_MANAGED_GRAPH_NODES } from './applicationResourceGraphLimits';

function compareManagedResourceKeys(a: ManagedResourceKey, b: ManagedResourceKey): number {
    const namespaceOrder = a.namespace.localeCompare(b.namespace);
    if (namespaceOrder !== 0) {
        return namespaceOrder;
    }
    const kindOrder = a.kind.localeCompare(b.kind);
    if (kindOrder !== 0) {
        return kindOrder;
    }
    return a.name.localeCompare(b.name);
}

function sortManagedNodes(nodes: ResourceGraphNode[]): ResourceGraphNode[] {
    return [...nodes].sort((left, right) => {
        const leftKey = left.resourceKey;
        const rightKey = right.resourceKey;
        if (!leftKey || !rightKey) {
            return 0;
        }
        return compareManagedResourceKeys(leftKey, rightKey);
    });
}

export function truncateApplicationResourceGraph(
    graph: ApplicationResourceGraph,
    maxManaged: number = MAX_MANAGED_GRAPH_NODES
): ApplicationResourceGraph {
    const rootNode = graph.nodes.find((node) => node.role === 'application');
    const managedNodes = graph.nodes.filter((node) => node.role === 'managed_resource');

    if (managedNodes.length <= maxManaged) {
        if (graph.truncated === true) {
            return {
                applicationKey: graph.applicationKey,
                nodes: graph.nodes,
                edges: graph.edges,
                topologySource: graph.topologySource,
                topologyMode: graph.topologyMode,
                structureVersion: graph.structureVersion,
                observedAt: graph.observedAt,
                layoutHint: graph.layoutHint
            };
        }
        return graph;
    }

    if (!rootNode) {
        return graph;
    }

    const keptManaged = sortManagedNodes(managedNodes).slice(0, maxManaged);
    const nodes = [rootNode, ...keptManaged];
    const edges: ResourceGraphEdge[] = keptManaged.map((node) => ({
        id: buildGraphEdgeId(rootNode.id, node.id, 'manages'),
        source: rootNode.id,
        target: node.id,
        relationship: 'manages' as const
    }));

    return {
        ...graph,
        nodes,
        edges,
        structureVersion: computeStructureVersion({ nodes, edges }),
        truncated: true
    };
}
