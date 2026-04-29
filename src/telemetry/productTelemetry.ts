/**
 * Product telemetry façade — single choke point for allowlisted product events from
 * extension TypeScript.
 *
 * Contract: [.forge/operations/observability.md](../../.forge/operations/observability.md),
 * [.forge/operations/security.md](../../.forge/operations/security.md).
 *
 * Use only {@link ProductTelemetryEventName} and {@link ProductTelemetryProperties};
 * never pass kubeconfig or cluster identifiers, resource names, manifests, kubectl
 * output, workspace paths, or raw `Error.message`. Transport is injected via
 * {@link ProductTelemetryReporter} (mocks in unit tests; `@vscode/extension-telemetry` wiring via
 * `vscodeExtensionTelemetry.ts`). No network I/O here.
 *
 * Automated import enforcement: [#138](https://github.com/alto9/kube9-vscode/issues/138).
 * Event catalog alignment: [#137](https://github.com/alto9/kube9-vscode/issues/137).
 */

import { ErrorType } from '../errors/types';

/**
 * Semantic product events — minimal stub; extend only with catalog-aligned names (#137).
 */
export enum ProductTelemetryEventName {
    /** Extension reached activation hook without attaching cluster/workspace identifiers. */
    ExtensionActivated = 'kube9.product.extension_activated',
}

/**
 * Bounded payload — closed keys only; values are literals or {@link ErrorType}.
 */
export interface ProductTelemetryProperties {
    readonly outcome?: 'success' | 'failure';
    /** Coarse failure bucket when `outcome` is `failure` — not free-form error text. */
    readonly errorBucket?: ErrorType;
}

/**
 * Sink for façade output — real implementation supplied by activation wiring.
 */
export interface ProductTelemetryReporter {
    sendEvent(event: ProductTelemetryEventName, properties: ProductTelemetryProperties): void;
}

/**
 * Typed façade over an injected reporter.
 */
export class ProductTelemetry {
    constructor(private readonly reporter: ProductTelemetryReporter) {}

    emit(event: ProductTelemetryEventName, properties: ProductTelemetryProperties = {}): void {
        this.reporter.sendEvent(event, properties);
    }
}

export function createProductTelemetry(reporter: ProductTelemetryReporter): ProductTelemetry {
    return new ProductTelemetry(reporter);
}
