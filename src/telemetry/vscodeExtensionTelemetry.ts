/**
 * Binds {@link ProductTelemetry} to Microsoft's {@link TelemetryReporter} from `@vscode/extension-telemetry`.
 * Honors `vscode.env.isTelemetryEnabled`; skips Reporter construction when disabled or no connection string is configured.
 */

import type { TelemetryReporter } from '@vscode/extension-telemetry';
import * as vscode from 'vscode';
import {
    createProductTelemetry,
    ProductTelemetry,
    ProductTelemetryEventName,
    ProductTelemetryProperties,
    ProductTelemetryReporter,
} from './productTelemetry';

const noopReporter: ProductTelemetryReporter = {
    sendEvent(): void {
        /* consent off, missing AI resource, or tests */
    },
};

/** Application Insights connection string (see Azure Monitor). Omit until a backend resource exists. */
const PACKAGE_JSON_TELEMETRY_KEY = 'telemetryInstrumentationConnectionString';

function createVsCodeReporterBridge(reporter: TelemetryReporter): ProductTelemetryReporter {
    return {
        sendEvent(event: ProductTelemetryEventName, properties: ProductTelemetryProperties): void {
            const payload = telemetryPropertiesToPayload(properties);
            if (properties.outcome === 'failure') {
                reporter.sendTelemetryErrorEvent(String(event), payload);
            } else {
                reporter.sendTelemetryEvent(String(event), payload);
            }
        },
    };
}

export function telemetryPropertiesToPayload(
    properties: ProductTelemetryProperties
): Record<string, string> {
    const payload: Record<string, string> = {};
    if (properties.outcome !== undefined) {
        payload.outcome = properties.outcome;
    }
    if (properties.errorBucket !== undefined) {
        payload.errorBucket = String(properties.errorBucket);
    }
    return payload;
}

/**
 * Register product telemetry backed by `@vscode/extension-telemetry`, or a no-op when consent is off
 * or {@link PACKAGE_JSON_TELEMETRY_KEY} is absent/empty (no egress until configured).
 */
export function registerExtensionProductTelemetry(context: vscode.ExtensionContext): ProductTelemetry {
    if (!vscode.env.isTelemetryEnabled) {
        return createProductTelemetry(noopReporter);
    }

    const pj = context.extension.packageJSON as Record<string, unknown>;
    const connectionString = pj[PACKAGE_JSON_TELEMETRY_KEY];
    const cs = typeof connectionString === 'string' ? connectionString.trim() : '';

    if (!cs) {
        return createProductTelemetry(noopReporter);
    }

    // Runtime dependency (lazy): avoids pulling Application Insights subgraph when consent is off
    // or the package.json connection string is not set yet — keeps unit-test imports of extension.ts lightweight.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { TelemetryReporter: TelemetryReporterCtor } = require('@vscode/extension-telemetry') as {
        TelemetryReporter: new (connectionString: string) => TelemetryReporter;
    };

    const reporter = new TelemetryReporterCtor(cs);

    context.subscriptions.push({
        dispose: (): void => {
            void reporter.dispose();
        },
    });

    return createProductTelemetry(createVsCodeReporterBridge(reporter));
}
