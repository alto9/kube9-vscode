import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';

export const LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Limited topology: this graph may not show every parent/child relationship. Enable full resource-tree data when available for native Argo CD-style topology.';

export const OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Inferred topology: parent/child links come from Kubernetes owner references, not Argo CD resource-tree. Some relationships may be missing when reads fail or owners are outside this application.';

export const GRAPH_TRUNCATION_AFFORDANCE_MESSAGE =
    'Graph truncated: some resources were omitted because the node limit was reached.';

export function countManagedResourceNodes(graph: ApplicationResourceGraph): number {
    return graph.nodes.filter((node) => node.role === 'managed_resource').length;
}

/** True when the graph has managed resources visible on the canvas (not root-only). */
export function hasVisibleManagedTopology(graph: ApplicationResourceGraph): boolean {
    return countManagedResourceNodes(graph) > 0;
}

export function shouldShowLimitedTopologyAffordance(graph: ApplicationResourceGraph): boolean {
    return graph.topologyMode === 'limited' && hasVisibleManagedTopology(graph);
}

export function shouldShowTruncationAffordance(graph: ApplicationResourceGraph): boolean {
    return graph.truncated === true && hasVisibleManagedTopology(graph);
}

export function getLimitedTopologyAffordanceMessage(graph: ApplicationResourceGraph): string {
    if (graph.topologySource === 'kubernetes_owner_ref') {
        return OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE;
    }
    return LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE;
}
