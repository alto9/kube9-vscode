# Product telemetry — allowlisted semantic events

**Canonical enumeration** for [kube9-vscode](https://github.com/alto9/kube9-vscode) product telemetry (VS Code extension / kube9-desktop aligned surfaces).

- **Governance contracts:** [.forge/operations/observability.md](../.forge/operations/observability.md), [.forge/operations/security.md](../.forge/operations/security.md)
- **Lint / forbid-list guardrails:** [telemetry-lint-guardrails.md](./telemetry-lint-guardrails.md) (runs via `npm run lint`)
- **Upstream work:** Planned instrumentation façade and emitted events are tracked under [M1.2 (#133)](https://github.com/alto9/kube9-vscode/issues/133). Implementations MUST only emit events that appear in the **Shipped** table below (or merge an update to this document in the same change).

## Version

| Catalog revision | Repository state |
|------------------|------------------|
| `v1` | Initial maintainer-reviewed catalog document; shipped events intentionally empty pending façade work. |

## Shipped events

Events that exist in **`main`** at this revision (`v1`): **none** — catalog rows remain reserved until the first **Shipped** emit lands alongside this file. A governance **`src/telemetry/`** façade (lint scope + typed stub) may exist without changing that fact.

Columns:

| Stable event key | Human-readable purpose | Allowed payload fields | Notes |
|------------------|------------------------|-------------------------|-------|
| — | — | — | *Reserved until the first shipped event lands.* |

**Rules for each row:**

- **Stable event key** — Dot- or slash-separated identifier; treat as ABI; change only via deprecation/rename with catalog update.
- **Allowed payload fields** — Enumerated JSON keys and value shapes (boolean, coarse enum, bounded numeric). Do not list unconstrained strings.
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
