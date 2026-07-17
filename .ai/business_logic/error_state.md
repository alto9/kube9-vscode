# Error state

User-visible states when Application detail or its resource graph is shown.

## Graph and topology

- **Full topology available**: dependency edges reflect Argo CD **resource-tree** parent and child relationships supplied by REST or operator CLI transport; `topologyMode: full`; limited-topology banner suppressed.
- **Limited topology**: nodes are derived from the Application custom resource (for example **`status.resources`**) with best-effort edges (grouping under the Application root, optional owner-reference enrichment when cluster API access allows). The product surfaces **limited topology** when resource-tree data is unreachable, unauthorized, or unavailable so the user is not misled about edge accuracy. Banner copy depends on `limitedTopologyReason` (`operator_not_capable`, `rest_unavailable`, `enrichment_failed`, or owner-ref).
- **Graph data loading or merging**: an intermediate state during refresh; the prior graph may remain visible until replaced. There is no separate enrichment-pending banner while operator/REST fetch is in flight.
- **Graph unavailable**: no graph can be assembled (for example Application missing, Application read denied, or unrecoverable detail host failure). The user sees an explicit empty or error surface with recovery guidance consistent with other extension surfaces (retry, connection, RBAC).

## Tile status scope

- Graph tiles show **Argo CD sync** and **Argo CD health** only in the initial capability set. **Kubernetes Ready** replica detail on the tile is out of scope; its absence is not an error state.
