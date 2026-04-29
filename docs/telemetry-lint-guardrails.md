# Telemetry lint guardrails (forbid-list)

Automated checks enforce a **minimal** subset of [.forge/operations/observability.md](../.forge/operations/observability.md) **Never send** rules inside the telemetry façade tree:

- No **template literals with `${…}` interpolation** as arguments to any function call in `src/telemetry/**/*.ts` (avoids accidental cluster names, paths, or workspace text in payloads).
- No passing **`error` / `err` identifiers** or **`new Error(...)`** as call arguments in those files (raw exceptions can carry paths and stack details).

## Where it runs

- **Local / CI:** `npm run lint` runs ESLint with `--rulesdir eslint-rules`, enabling rule **`kube9-telemetry-payload-guard`** (see `eslint-rules/kube9-telemetry-payload-guard.js`).
- **Scope today:** files under `src/telemetry/` only, coordinated with the event catalog (#137) and future façade work (#133). Expand `.eslintrc.json` overrides when new emit helpers or call-site folders are added.

## False positives

If a pattern is safe but the rule rejects it:

1. Prefer refactoring to **static literals** or **enumerated props** that cannot carry cluster-identifying data.
2. If unavoidable, add a **single-line** `eslint-disable-next-line` with a **short justification** and link to maintainer review (same bar as CONTRIBUTING telemetry PRs).
3. If the rule is systematically wrong for a new API shape, open an issue to adjust the rule (do not weaken guardrails without review).

## Known limitations (follow-ups)

- Does **not** analyze string concatenation (`a + b`), member access on user objects, or data flow across functions — extend rules iteratively (see [#138](https://github.com/alto9/kube9-vscode/issues/138)).
- Does **not** yet cover call sites outside `src/telemetry/`; M1.2 PRs should tighten overrides once the façade is wired.
- The **err** / **error** identifier ban is naming-heuristic; use specific names like `failureCategory` for allowed args.

## Related docs

- [telemetry-event-catalog.md](./telemetry-event-catalog.md) — allowlisted events and review workflow.
- [CONTRIBUTING.md](../CONTRIBUTING.md#product-telemetry-and-event-catalog-prs) — PR expectations for telemetry changes.
