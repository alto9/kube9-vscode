import * as assert from 'assert';
import * as Module from 'module';
import type { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';

import { ErrorType } from '../../../errors/types';
import { ProductTelemetryEventName } from '../../../telemetry/productTelemetry';
import {
    registerExtensionProductTelemetry,
    telemetryPropertiesToPayload,
} from '../../../telemetry/vscodeExtensionTelemetry';

const originalRequire = Module.prototype.require;

suite('vscodeExtensionTelemetry wiring', () => {
    let telemetryModuleInterceptCount = 0;
    let stubCtorCalls = 0;
    let stubSendTelemetryEventCalls = 0;
    let stubSendTelemetryErrorEventCalls = 0;

    class StubTelemetryReporter {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_cs: string) {
            stubCtorCalls++;
        }

        sendTelemetryEvent(): void {
            stubSendTelemetryEventCalls++;
        }

        sendTelemetryErrorEvent(): void {
            stubSendTelemetryErrorEventCalls++;
        }

        dispose(): Promise<void> {
            return Promise.resolve();
        }

        telemetryLevel: 'all' | 'error' | 'crash' | 'off' = 'all';
        onDidChangeTelemetryLevel = (): { dispose(): void } => ({
            dispose(): void {
                /**/
            },
        });
    }

    setup(() => {
        stubCtorCalls = 0;
        stubSendTelemetryEventCalls = 0;
        stubSendTelemetryErrorEventCalls = 0;
        telemetryModuleInterceptCount = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Module.prototype.require = function (this: unknown, ...args: any[]): any {
            const id = args[0];
            if (id === '@vscode/extension-telemetry') {
                telemetryModuleInterceptCount++;
                return { TelemetryReporter: StubTelemetryReporter };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (originalRequire as any).apply(this, args);
        };

        interface EnvWithTelemetryMock {
            _mockSetTelemetryEnabled?: (enabled: boolean) => void;
        }
        void (vscode.env as EnvWithTelemetryMock)._mockSetTelemetryEnabled?.(true);
    });

    teardown(() => {
        Module.prototype.require = originalRequire;
        interface EnvWithTelemetryMock {
            _mockSetTelemetryEnabled?: (enabled: boolean) => void;
        }
        void (vscode.env as EnvWithTelemetryMock)._mockSetTelemetryEnabled?.(true);
    });

    function minimalContext(packageJson: Record<string, unknown>): ExtensionContext {
        return {
            subscriptions: [],
            extension: {
                packageJSON: packageJson,
            },
        } as unknown as ExtensionContext;
    }

    test('telemetryPropertiesToPayload carries outcome and coarse error bucket strings', () => {
        const mapped = telemetryPropertiesToPayload({
            outcome: 'failure',
            errorBucket: ErrorType.CONNECTION,
        });

        assert.strictEqual(mapped.outcome, 'failure');
        assert.strictEqual(mapped.errorBucket, ErrorType.CONNECTION);
    });

    test('when vscode.env.isTelemetryEnabled is false, never lazy-load extension-telemetry', () => {
        interface EnvWithTelemetryMock {
            _mockSetTelemetryEnabled?: (enabled: boolean) => void;
        }
        void (vscode.env as EnvWithTelemetryMock)._mockSetTelemetryEnabled?.(false);

        const telemetry = registerExtensionProductTelemetry(
            minimalContext({
                telemetryInstrumentationConnectionString: 'InstrumentationKey=any',
            })
        );

        telemetry.emit(ProductTelemetryEventName.ExtensionActivated);

        assert.strictEqual(telemetryModuleInterceptCount, 0);
        assert.strictEqual(stubCtorCalls, 0);
        assert.strictEqual(stubSendTelemetryEventCalls, 0);
        assert.strictEqual(stubSendTelemetryErrorEventCalls, 0);
    });

    test('missing connection string uses noop façade', () => {
        const telemetry = registerExtensionProductTelemetry(minimalContext({}));
        telemetry.emit(ProductTelemetryEventName.ExtensionActivated);

        assert.strictEqual(telemetryModuleInterceptCount, 0);
        assert.strictEqual(stubCtorCalls, 0);
    });

    test('when enabled with connection string, forwards activation event via sendTelemetryEvent', () => {
        const telemetry = registerExtensionProductTelemetry(
            minimalContext({
                telemetryInstrumentationConnectionString:
                    'InstrumentationKey=01234567-8901-2345-6789-012345678901;IngestionEndpoint=https://example.invalid/v2/track',
            })
        );

        telemetry.emit(ProductTelemetryEventName.ExtensionActivated, { outcome: 'success' });

        assert.strictEqual(stubCtorCalls, 1);
        assert.strictEqual(stubSendTelemetryEventCalls, 1);
        assert.strictEqual(stubSendTelemetryErrorEventCalls, 0);
    });

    test('failure outcome uses sendTelemetryErrorEvent', () => {
        const telemetry = registerExtensionProductTelemetry(
            minimalContext({
                telemetryInstrumentationConnectionString:
                    'InstrumentationKey=01234567-8901-2345-6789-012345678901;IngestionEndpoint=https://example.invalid/track',
            })
        );

        telemetry.emit(ProductTelemetryEventName.ExtensionActivated, {
            outcome: 'failure',
            errorBucket: ErrorType.API,
        });

        assert.strictEqual(stubSendTelemetryErrorEventCalls, 1);
        assert.strictEqual(stubSendTelemetryEventCalls, 0);
    });
});
