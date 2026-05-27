/**
 * Product telemetry façade — instrumentation for allowlisted semantic events MUST route through this module.
 *
 * Governance: [.ai/operations/observability.md](../../.ai/operations/observability.md) (Never send list),
 * enumeration: [docs/telemetry-event-catalog.md](../../docs/telemetry-event-catalog.md).
 *
 * ESLint --rulesdir rule kube9-telemetry-payload-guard applies to TypeScript files under src/telemetry; extend overrides in
 * .eslintrc.json when call sites outside this folder invoke emit helpers (see docs/telemetry-lint-guardrails.md).
 */

/** Values safe to include in enumerated telemetry fields (no paths, resource names, YAML, or free-form workspace text). */
export type SafeTelemetryPrimitive = string | number | boolean;

/** Payload keys must match the event catalog; values must be safe primitives only. */
export type SafeTelemetryProps = Record<string, SafeTelemetryPrimitive>;

/**
 * Records an allowlisted semantic event. Implementation is deferred to M1.2 (#133); callers keep imports stable for lint scope.
 */
export function emitSemanticEvent(eventKey: string, props: SafeTelemetryProps): void {
  void eventKey;
  void props;
  // Wired to VS Code / aggregate backends in M1.2; placeholder references keep API stable for callers and lint scope.
}
