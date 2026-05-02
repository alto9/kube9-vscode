/**
 * Product telemetry façade — single choke point for allowlisted product events from
 * extension TypeScript.
 *
 * Contract: [.forge/operations/observability.md](../../.forge/operations/observability.md),
 * [.forge/operations/security.md](../../.forge/operations/security.md).
 *
 * Use only {@link ProductTelemetryEventName} and bounded {@link ProductTelemetryProperties};
 * never pass kubeconfig or cluster identifiers, resource names, manifests, kubectl
 * output, workspace paths, or raw `Error.message`. Transport is injected via
 * {@link ProductTelemetryReporter} (mocks in unit tests; `@vscode/extension-telemetry` wiring via
 * `vscodeExtensionTelemetry.ts`). No network I/O here.
 *
 * Automated import enforcement: [#138](https://github.com/alto9/kube9-vscode/issues/138).
 * Event catalog alignment: [#137](https://github.com/alto9/kube9-vscode/issues/137).
 */

import { ErrorType } from '../errors/types';
import { isKube9TelemetryCommandAllowlisted } from './commandAllowlist';

export const SHIPPED_WEBVIEW_TELEMETRY_SURFACES_CONST = [
    'tutorial',
    'namespace_explorer',
    'cluster_manager',
    'operator_health_report',
    'well_architected_assessment_report',
    'events_viewer',
    'pod_logs',
    'helm_package_manager',
    'argocd_application',
    'dashboard_free',
    'dashboard_operated',
    'resource_describe',
] as const;

export type WebviewTelemetrySurface = (typeof SHIPPED_WEBVIEW_TELEMETRY_SURFACES_CONST)[number];

export const SHIPPED_WEBVIEW_TELEMETRY_SURFACES_SET: ReadonlySet<WebviewTelemetrySurface> = new Set(
    SHIPPED_WEBVIEW_TELEMETRY_SURFACES_CONST
);

/**
 * Semantic product events — extend only with catalog-aligned names ([#137](./../../docs/telemetry-event-catalog.md)).
 */
export enum ProductTelemetryEventName {
    /** Extension reached activation hook without attaching cluster/workspace identifiers. */
    ExtensionActivated = 'kube9.product.extension_activated',
    /** Registered command invocation (command id only; no argv). */
    FeatureUsageCommand = 'kube9.product.feature_usage.command',
    /** Terminal success/failure paired to FeatureUsage invocation (enumerated buckets on failure only). */
    CoarseOutcomeCommand = 'kube9.product.coarse_outcome.command',
    /** Browser surface opened once per new webview shell (enumeration only). */
    FeatureUsageWebviewOpen = 'kube9.product.feature_usage.webview_open',
}

/** Bounded payload — closed keys only; values are literals or {@link ErrorType}. */
export interface ProductTelemetryProperties {
    readonly outcome?: 'success' | 'failure';
    /** Included only when `outcome === 'failure'`. */
    readonly errorBucket?: ErrorType;
    /** VS Code contributes command identifier (excluding internal scaffolding commands). */
    readonly commandKey?: string;
    /** Enumerated shipped webview/dashboard surface identifiers. */
    readonly webviewSurface?: WebviewTelemetrySurface;
}

/**
 * Sink for façade output — real implementation supplied by activation wiring.
 */
export interface ProductTelemetryReporter {
    sendEvent(event: ProductTelemetryEventName, properties: ProductTelemetryProperties): void;
}

function isShippedWebviewSurface(surface: WebviewTelemetrySurface): boolean {
    return SHIPPED_WEBVIEW_TELEMETRY_SURFACES_SET.has(surface);
}

function isValidEmit(event: ProductTelemetryEventName, properties: ProductTelemetryProperties): boolean {
    switch (event) {
        case ProductTelemetryEventName.ExtensionActivated:
            return (
                properties.commandKey === undefined &&
                properties.webviewSurface === undefined &&
                properties.outcome !== undefined
            );
        case ProductTelemetryEventName.FeatureUsageCommand:
            return (
                typeof properties.commandKey === 'string' &&
                properties.webviewSurface === undefined &&
                isKube9TelemetryCommandAllowlisted(properties.commandKey)
            );
        case ProductTelemetryEventName.CoarseOutcomeCommand:
            if (
                typeof properties.commandKey !== 'string' ||
                properties.webviewSurface !== undefined ||
                !isKube9TelemetryCommandAllowlisted(properties.commandKey)
            ) {
                return false;
            }
            if (properties.outcome !== 'success' && properties.outcome !== 'failure') {
                return false;
            }
            if (properties.outcome === 'failure' && properties.errorBucket === undefined) {
                return false;
            }
            if (properties.outcome === 'success' && properties.errorBucket !== undefined) {
                return false;
            }
            return true;
        case ProductTelemetryEventName.FeatureUsageWebviewOpen:
            return (
                properties.commandKey === undefined &&
                properties.webviewSurface !== undefined &&
                isShippedWebviewSurface(properties.webviewSurface)
            );
        default:
            return false;
    }
}

/**
 * Typed façade over an injected reporter.
 */
export class ProductTelemetry {
    constructor(private readonly reporter: ProductTelemetryReporter) {}

    emit(event: ProductTelemetryEventName, properties: ProductTelemetryProperties = {}): void {
        if (!isValidEmit(event, properties)) {
            return;
        }
        this.reporter.sendEvent(event, properties);
    }

    reportWebviewSurfaceOpened(surface: WebviewTelemetrySurface): void {
        this.emit(ProductTelemetryEventName.FeatureUsageWebviewOpen, { webviewSurface: surface });
    }
}

export function createProductTelemetry(reporter: ProductTelemetryReporter): ProductTelemetry {
    return new ProductTelemetry(reporter);
}
