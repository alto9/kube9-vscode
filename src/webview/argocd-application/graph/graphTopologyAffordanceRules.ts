import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import { isKindGroupingActive } from './applyKindGrouping';

export const LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Limited topology: this graph may not show every parent/child relationship. Enable full resource-tree data when available for native Argo CD-style topology.';

export const OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Inferred topology: parent/child links come from Kubernetes owner references, not Argo CD resource-tree. Some relationships may be missing when reads fail or owners are outside this application.';

export const LARGE_APP_GROUPING_AFFORDANCE_MESSAGE =
    'Large application: resources are grouped by kind. Expand a group or open the Details tab to reach every managed resource.';

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

export function shouldShowLargeAppGroupingAffordance(graph: ApplicationResourceGraph): boolean {
    return isKindGroupingActive(countManagedResourceNodes(graph));
}

export function getLimitedTopologyAffordanceMessage(graph: ApplicationResourceGraph): string {
    if (graph.topologySource === 'kubernetes_owner_ref') {
        return OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE;
    }
    return LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE;
}
