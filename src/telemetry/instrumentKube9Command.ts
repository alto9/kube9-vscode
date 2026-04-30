/**
 * Registers a {@code kube9.*} handler with coarse success/failure telemetry (no arguments recorded).
 */

import * as vscode from 'vscode';
import { ProductTelemetryEventName } from './productTelemetry';
import { telemetryErrorTypeFromUnknown } from './errorTelemetryClassification';
import { getProductTelemetryFacade } from './vscodeExtensionTelemetry';

/** Wraps kube9 handlers with coarse feature-usage/outcome emits; avoids logging argv. */
export function registerInstrumentedKube9Command(
    command: string,
    // Commands pass VS Code-supplied positional args typed per handler; payloads are never forwarded here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (...args: any[]) => unknown,
    thisArg?: unknown
): vscode.Disposable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executor: (...args: any[]) => unknown =
        thisArg !== undefined ? callback.bind(thisArg) : callback;

    return vscode.commands.registerCommand(command, async (...args: unknown[]) => {
        const telemetry = getProductTelemetryFacade();

        telemetry.emit(ProductTelemetryEventName.FeatureUsageCommand, { commandKey: command });

        try {
            const result = await executor(...args);
            telemetry.emit(ProductTelemetryEventName.CoarseOutcomeCommand, {
                commandKey: command,
                outcome: 'success',
            });
            return result;
        } catch (failure: unknown) {
            telemetry.emit(ProductTelemetryEventName.CoarseOutcomeCommand, {
                commandKey: command,
                outcome: 'failure',
                errorBucket: telemetryErrorTypeFromUnknown(failure),
            });
            throw failure;
        }
    });
}
