import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';

export const LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Limited topology: this graph may not show every parent/child relationship. Enable full resource-tree data when available for native Argo CD-style topology.';

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
