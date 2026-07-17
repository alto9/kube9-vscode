# Error handling

Failures resolve into stable user-visible outcomes. Raw transport or API errors are contextualized, not dumped without action labels.

## Topology source (tiered)

- Prefer **resource-tree** when the Argo CD API path is usable per integration contracts: extension REST when `kube9.argocd.restEnabled` and authorized, otherwise operator CLI when `resourceTreeCapable` is true.
- On **resource-tree** failure, hard-skip, or inaccessibility, fall back to **limited topology** from the Application CR when that CR can still be read. Fallback is expected behavior, not a silent downgrade of accuracy: the user is informed via the limited-topology affordance tier (`limitedTopologyReason`; see [error state](./error_state.md) and presentation copy).
- Operator structured stderr codes and REST transport details stay in the Output Channel (`[INFO] Argo CD resource-tree enrichment unavailable`); they must not appear in the webview banner.
- If the Application CR cannot be read, the detail session resolves to **graph unavailable** with the same recovery patterns as other permission or connectivity failures.

## Graph refresh

- After Application-level sync, refresh, or hard refresh, the graph is expected to update without closing the panel. Refresh errors follow the same notification and inline patterns as the existing Application detail flows; partial updates must not corrupt node identity in ways that break menu actions or navigation.

## Kind actions

- Actions exposed from the **Kind Capability Registry** (for example Deployment rollout restart; Application sync, refresh, hard refresh on the root) use the same permission, timeout, cancellation, and progress semantics as equivalent actions launched from the tree or other webviews. Errors name the action and resource identity.

## Large applications

- When node counts exceed supported presentation limits, the product may group, collapse, or progressively disclose nodes. That is **performance-limited graph** (see [error state](./error_state.md)), not a hard failure; Overview and navigation to tree or describe remain available.
