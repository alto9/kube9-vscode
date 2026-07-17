import type {
    ApplicationResourceGraph,
    LimitedTopologyReason
} from '../../../types/applicationResourceGraph';
import { isKindGroupingActive } from './applyKindGrouping';

export const OPERATOR_NOT_CAPABLE_AFFORDANCE_MESSAGE =
    'Limited topology: kube9-operator cannot fetch Argo CD resource-tree yet. Ask a platform admin to configure the operator Argo CD API token. Optionally enable kube9.argocd.restEnabled and set an extension API token for full topology.';

export const REST_UNAVAILABLE_AFFORDANCE_MESSAGE =
    'Limited topology: Argo CD resource-tree enrichment is not configured. Enable kube9.argocd.restEnabled and set an Argo CD API token, or use an operated cluster with resource-tree capability.';

export const ENRICHMENT_FAILED_AFFORDANCE_MESSAGE =
    'Limited topology: this graph may not show every parent/child relationship. Full resource-tree enrichment was unavailable for this application.';

export const OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE =
    'Inferred topology: parent/child links come from Kubernetes owner references, not Argo CD resource-tree. Some relationships may be missing when reads fail or owners are outside this application.';

/** @deprecated Use reason-specific affordance messages from limitedTopologyReason. */
export const LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE = ENRICHMENT_FAILED_AFFORDANCE_MESSAGE;

export const LARGE_APP_GROUPING_AFFORDANCE_MESSAGE =
    'Large application: resources are grouped by kind. Expand a group or open the Details tab to reach every managed resource.';

const LIMITED_TOPOLOGY_MESSAGES: Record<LimitedTopologyReason, string> = {
    operator_not_capable: OPERATOR_NOT_CAPABLE_AFFORDANCE_MESSAGE,
    rest_unavailable: REST_UNAVAILABLE_AFFORDANCE_MESSAGE,
    enrichment_failed: ENRICHMENT_FAILED_AFFORDANCE_MESSAGE,
    owner_ref: OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE
};

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
    if (graph.limitedTopologyReason) {
        return LIMITED_TOPOLOGY_MESSAGES[graph.limitedTopologyReason];
    }
    if (graph.topologySource === 'kubernetes_owner_ref') {
        return OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE;
    }
    return ENRICHMENT_FAILED_AFFORDANCE_MESSAGE;
}
