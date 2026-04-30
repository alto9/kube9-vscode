import * as assert from 'assert';
import { ErrorType } from '../../../errors/types';
import { HelmError, HelmErrorType } from '../../../services/HelmError';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import {
    buildKube9TelemetryCommandAllowlistFromPackageJson,
    resetKube9CommandTelemetryAllowlistForTests,
    setKube9CommandTelemetryAllowlist,
} from '../../../telemetry/commandAllowlist';
import {
    ProductTelemetryEventName,
    ProductTelemetryProperties,
    createProductTelemetry,
} from '../../../telemetry/productTelemetry';
import { telemetryErrorTypeFromUnknown } from '../../../telemetry/errorTelemetryClassification';
import { telemetryPropertiesToPayload } from '../../../telemetry/vscodeExtensionTelemetry';

suite('telemetry product signals (#134)', () => {
    teardown(() => {
        resetKube9CommandTelemetryAllowlistForTests();
    });

    test('allowlist derived from contributes.commands skips internal kube9 IDs', () => {
        const allow = buildKube9TelemetryCommandAllowlistFromPackageJson({
            contributes: {
                commands: [
                    { command: 'kube9.refreshClusters' },
                    { command: 'kube9.internal.completeStep3' },
                    { command: 'other.foo' },
                ],
            },
        });
        assert.strictEqual(allow.has('kube9.refreshClusters'), true);
        assert.strictEqual(allow.has('kube9.internal.completeStep3'), false);
    });

    test('telemetryPropertiesToPayload serializes enumerated fields only', () => {
        const payload = telemetryPropertiesToPayload({
            outcome: 'failure',
            errorBucket: ErrorType.CONNECTION,
            commandKey: 'kube9.refreshClusters',
            webviewSurface: 'tutorial',
        });
        assert.deepStrictEqual(payload, {
            outcome: 'failure',
            errorBucket: ErrorType.CONNECTION,
            commandKey: 'kube9.refreshClusters',
            webviewSurface: 'tutorial',
        });
    });

    test('kubectl and helm errors map to ErrorType buckets', () => {
        assert.strictEqual(
            telemetryErrorTypeFromUnknown(
                new KubectlError(
                    KubectlErrorType.ConnectionFailed,
                    'user message',
                    'stderr',
                    'ctx'
                )
            ),
            ErrorType.CONNECTION
        );
        assert.strictEqual(
            telemetryErrorTypeFromUnknown(new HelmError(HelmErrorType.RESOURCE_NOT_FOUND, 'nf')),
            ErrorType.NOT_FOUND
        );
        assert.strictEqual(telemetryErrorTypeFromUnknown('opaque'), ErrorType.UNEXPECTED);
    });

    test('façade drops command emits when ID is not allowlisted', () => {
        const sent: string[] = [];
        const pt = createProductTelemetry({
            sendEvent(event: ProductTelemetryEventName, properties: ProductTelemetryProperties): void {
                void properties;
                sent.push(String(event));
            },
        });
        setKube9CommandTelemetryAllowlist(new Set(['kube9.refreshClusters']));
        pt.emit(ProductTelemetryEventName.FeatureUsageCommand, { commandKey: 'kube9.applyYAML' });
        assert.deepStrictEqual(sent, []);
        pt.emit(ProductTelemetryEventName.FeatureUsageCommand, { commandKey: 'kube9.refreshClusters' });
        assert.deepStrictEqual(sent, [ProductTelemetryEventName.FeatureUsageCommand]);
    });
});
