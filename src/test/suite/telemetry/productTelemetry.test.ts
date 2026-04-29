import * as assert from 'assert';
import { ErrorType } from '../../../errors/types';
import {
    createProductTelemetry,
    ProductTelemetryEventName,
    ProductTelemetryProperties,
    ProductTelemetryReporter,
} from '../../../telemetry/productTelemetry';

suite('ProductTelemetry façade', () => {
    test('forwards allowlisted activation event with success outcome', () => {
        const calls: Array<{ event: ProductTelemetryEventName; props: ProductTelemetryProperties }> = [];
        const reporter: ProductTelemetryReporter = {
            sendEvent(event, props) {
                calls.push({ event, props });
            },
        };
        const telemetry = createProductTelemetry(reporter);

        telemetry.emit(ProductTelemetryEventName.ExtensionActivated, { outcome: 'success' });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].event, ProductTelemetryEventName.ExtensionActivated);
        assert.strictEqual(calls[0].props.outcome, 'success');
        assert.strictEqual(calls[0].props.errorBucket, undefined);
    });

    test('forwards failure using ErrorType bucket only (no message passthrough API)', () => {
        const calls: Array<{ event: ProductTelemetryEventName; props: ProductTelemetryProperties }> = [];
        const reporter: ProductTelemetryReporter = {
            sendEvent(event, props) {
                calls.push({ event, props: { ...props } });
            },
        };

        createProductTelemetry(reporter).emit(ProductTelemetryEventName.ExtensionActivated, {
            outcome: 'failure',
            errorBucket: ErrorType.CONNECTION,
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].props.outcome, 'failure');
        assert.strictEqual(calls[0].props.errorBucket, ErrorType.CONNECTION);
    });

    test('stub event catalog is a closed enum surface for call sites', () => {
        const values = Object.values(ProductTelemetryEventName) as string[];
        assert.ok(values.includes(ProductTelemetryEventName.ExtensionActivated));
        assert.strictEqual(
            new Set(values).size,
            values.length,
            'enum values must be unique; extend only for catalog entries'
        );
    });
});
