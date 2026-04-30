# Product telemetry QA (M1.4)

Maintainer QA sign-off for **forbid-list verification** and **telemetry-disabled smoke**, per milestone intent. **Authoritative contracts** remain in [.forge/operations/observability.md](../.forge/operations/observability.md) and [.forge/operations/security.md](../.forge/operations/security.md); this document is the **executable checklist** only.

| Reference | Purpose |
|-----------|---------|
| [telemetry-event-catalog.md](./telemetry-event-catalog.md) | Shipped event keys and payload fields |
| [telemetry-lint-guardrails.md](./telemetry-lint-guardrails.md) | ESLint rule scope and limitations |
| [CONTRIBUTING.md](../CONTRIBUTING.md#product-telemetry-and-event-catalog-prs) | PR and review expectations |

## 1. Never-send themes → verification

Map each **Never send** theme from the observability contract to how we verify it in repo CI or manually.

| Theme (from contract) | Automated / CI | Manual or follow-up |
|----------------------|----------------|---------------------|
| Kubeconfig-like paths | `kube9-telemetry-payload-guard` blocks interpolated templates in `src/telemetry/**/*.ts` (see [telemetry-lint-guardrails.md](./telemetry-lint-guardrails.md)). Unit tests in `src/test/suite/telemetry/payloadForbidListVerification.test.ts` scan serialized allowlisted payloads for path/manifest heuristics. | On a throwaway branch, add a template literal with a fake home path into a telemetry call under `src/telemetry/`; confirm `npm run lint` fails; discard branch. |
| Cluster / context / namespace / resource identifiers | Façade types (`ProductTelemetryProperties`) are closed keys; no cluster fields in catalog rows. Same lint + payload scan tests. | With instrumentation enabled, exercise catalog commands/webviews; confirm mock sink / debug output has no context name, namespace, workload name, or UID values in payload values. |
| Manifest / YAML / spec content | Payload scan tests reject `apiVersion`-style manifest markers and multiline blob values in JSON payloads. | Spot-check outbound or mock events during YAML-heavy workflows; values must remain enumerations only. |
| Cluster log lines / API bodies | No API on façade for log lines or response bodies; lint blocks raw `Error` objects as call arguments in `src/telemetry/`. | N/A beyond code review + negative lint experiment. |
| Forbidden free-form strings where enumeration is required | `telemetryPropertiesToPayload` only emits enumerated keys; `errorBucket` is `ErrorType`; `webviewSurface` is a closed union; `commandKey` is allowlisted from `package.json`. Tests cover golden combinations. | Review any new catalog row before merge. |

## 2. Guardrail proof (#138)

1. **CI:** `npm run lint` must pass on `main` (rule `kube9-telemetry-payload-guard` on `src/telemetry/**/*.ts`).
2. **Regression test:** `src/test/suite/telemetry/eslintTelemetryGuardProof.test.ts` runs ESLint on synthetic snippets and expects violations for representative forbidden patterns.
3. **Optional maintainer spot-check:** Introduce a deliberate violation on a throwaway branch (template interpolation or `error` identifier in a telemetry call); confirm ESLint reports `kube9-telemetry-payload-guard`.

## 3. Payload inspection (#134 / #137)

- **Structured evidence:** `npm run test:unit` includes `payloadForbidListVerification.test.ts`, which serializes golden `ProductTelemetryProperties` objects (all shipped `commandKey` values from `package.json`, all `ErrorType` buckets, all webview surfaces) and asserts the JSON matches forbid-list heuristics.
- **Manual:** When using a real or mock sink, compare captured events to [telemetry-event-catalog.md](./telemetry-event-catalog.md); each property value must match the allowed shape for that row.

## 4. Telemetry disabled (smoke)

Baseline (extension must remain usable):

1. Disable VS Code telemetry (`telemetry.telemetryLevel` → **off** or equivalent for your build). Optionally disable any extension-specific telemetry toggles if present.
2. Ensure `telemetryInstrumentationConnectionString` is unset or empty in packaged `package.json` for local dev if you are not testing real egress.
3. Smoke core flows aligned with catalog coverage, for example: activate extension, refresh cluster tree, open one shipped webview from the catalog, run one allowlisted command.
4. **Pass:** No crashes or missing commands attributable to telemetry being off; no telemetry constructor side effects when disabled (see `registerExtensionProductTelemetry` in `src/telemetry/vscodeExtensionTelemetry.ts`).

## 5. CI parity

Sign-off revision MUST pass the same checks as [.github/workflows/ci.yml](../.github/workflows/ci.yml):

```bash
npm ci
npm run lint
npm run build
npm run test:unit
```

Node **≥ 22**. Use `NODE_OPTIONS=--experimental-require-module` when running mocha manually if your environment mirrors CI.

## 6. Maintainer sign-off (issue closure)

Post a short comment on [#135](https://github.com/alto9/kube9-vscode/issues/135) with: date, git revision (or PR), who ran QA, checklist sections completed, and any accepted gaps or follow-up issues.
