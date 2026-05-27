# Product telemetry — allowlisted semantic events

**Canonical enumeration** for [kube9-vscode](https://github.com/alto9/kube9-vscode) product telemetry (VS Code extension / kube9-desktop aligned surfaces).

- **Governance contracts:** [.ai/operations/observability.md](../.ai/operations/observability.md), [.ai/operations/security.md](../.ai/operations/security.md)
- **Lint / forbid-list guardrails:** [telemetry-lint-guardrails.md](./telemetry-lint-guardrails.md) (runs via `npm run lint`)
- **M1.4 QA checklist:** [product-telemetry-qa.md](./product-telemetry-qa.md) (forbid-list verification + telemetry-off smoke)
- **Implementation:** [`src/telemetry/productTelemetry.ts`](../src/telemetry/productTelemetry.ts) (event names + bounded payload types), [`src/telemetry/vscodeExtensionTelemetry.ts`](../src/telemetry/vscodeExtensionTelemetry.ts) (transport when `telemetryInstrumentationConnectionString` is set and consent is on)

## Version

| Catalog revision | Repository state |
|------------------|----------------|
| `v1` | Initial maintainer-reviewed catalog document; shipped events intentionally empty pending façade work. |
| `v2` | Ships M1.3 command / webview feature-usage and coarse-outcome events ([#134](https://github.com/alto9/kube9-vscode/issues/134)) plus extension activation. |

## Shipped events

Columns:

| Stable event key | Human-readable purpose | Allowed payload fields | Notes |
|------------------|------------------------|-------------------------|-------|
| `kube9.product.extension_activated` | Extension finished the success path of `activate()` | `outcome` ∈ {`success`,`failure`}; optional `errorBucket` when `outcome=failure` (`ErrorType` enum string) | Never includes cluster/workspace identifiers. |
| `kube9.product.feature_usage.command` | User invoked a published `kube9.*` command (excluding `kube9.internal.*`) | `commandKey` — command id registered in extension `package.json` `contributes.commands` | No argv, kube paths, resource names, or cluster fields. Internal commands are intentionally excluded from `contributes` allowlist building. |
| `kube9.product.coarse_outcome.command` | Command handler finished (success vs failure classification only) | `commandKey`; `outcome` ∈ {`success`,`failure`}; `errorBucket` required when `outcome=failure` (`ErrorType` enum); **omit** `errorBucket` when `success` | Maps structured failures (`KubectlError`, `HelmError`) plus `UNKNOWN` buckets; raw exception text/stack is never forwarded. |
| `kube9.product.feature_usage.webview_open` | User opened a major webview shell (once per newly created panel) | `webviewSurface` ∈ {`tutorial`, `namespace_explorer`, `cluster_manager`, `operator_health_report`, `events_viewer`, `pod_logs`, `helm_package_manager`, `argocd_application`, `dashboard_free`, `dashboard_operated`, `resource_describe`} | Enumeration only — no URLs, namespaces, workload names, or cluster labels. Describe-family panels share `resource_describe`. |

**Rules for each row:**

- **Stable event key** — Dot-delimited identifier; treat as ABI; change only via deprecation/rename with catalog update.
- **Allowed payload fields** — Enumerated JSON keys and value shapes. Do not list unconstrained strings.
- **Notes** — Call out forbid-list alignment: no kubeconfig paths, cluster/context/namespace/name/UIDs, manifests, log lines from clusters, or free-form user/workspace strings.

Rows MUST NOT claim **shipped** status unless the emitting code is merged or the row is labeled **Proposed** (see below).

## Proposed events

Use **Proposed** for design-time names before code ships:

| Stable event key (proposed) | Purpose | Planned payload sketch | Owner / PR |
|----------------------------|---------|-------------------------|------------|
| — | Add rows here during design reviews; flip to **Shipped** when code merges. | | |

Remove or downgrade **Proposed** rows that are abandoned.

## Review workflow

1. **Author** — Opens a PR that touches telemetry emits, types, or payload shapes. Updates this file in the **same PR** whenever adding/changing/removing an event key or payload field.
2. **Maintainer review** — At least one maintainer confirms:
   - Allowlisted semantics only; payload matches enumerated fields.
   - No raw cluster identifiers or user-derived strings outside allowed shapes (see observability **Never send**).
   - New rows are **Shipped** only when emit code accompanies them, or labeled **Proposed** otherwise.
3. **Refusal criteria** — Free-form diagnostics from user workspaces, interpolated URLs containing cluster identity, YAML/manifest/kubeconfig excerpts, or unbounded strings as telemetry payloads — reject or rework before merge.

## Related contributor guidance

See [CONTRIBUTING.md](../CONTRIBUTING.md#product-telemetry-and-event-catalog-prs) for PR expectations and forbid-list mindset.
