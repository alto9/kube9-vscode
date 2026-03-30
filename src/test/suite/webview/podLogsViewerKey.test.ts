import * as assert from 'assert';
import { makePodLogsViewerKey } from '../../../webview/podLogsViewerKey';

suite('podLogsViewerKey', () => {
    test('same inputs produce the same key', () => {
        const a = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'c1');
        const b = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'c1');
        assert.strictEqual(a, b);
    });

    test('different pod produces a different key', () => {
        const a = makePodLogsViewerKey('ctx', 'ns', 'pod-a', 'c1');
        const b = makePodLogsViewerKey('ctx', 'ns', 'pod-b', 'c1');
        assert.notStrictEqual(a, b);
    });

    test('different namespace produces a different key', () => {
        const a = makePodLogsViewerKey('ctx', 'ns-a', 'pod-1', 'c1');
        const b = makePodLogsViewerKey('ctx', 'ns-b', 'pod-1', 'c1');
        assert.notStrictEqual(a, b);
    });

    test('different container produces a different key', () => {
        const a = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'c1');
        const b = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'c2');
        assert.notStrictEqual(a, b);
    });

    test('different kubectl context produces a different key', () => {
        const a = makePodLogsViewerKey('ctx-a', 'ns', 'pod-1', 'c1');
        const b = makePodLogsViewerKey('ctx-b', 'ns', 'pod-1', 'c1');
        assert.notStrictEqual(a, b);
    });

    test('"all" containers is distinct from a named container', () => {
        const all = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'all');
        const one = makePodLogsViewerKey('ctx', 'ns', 'pod-1', 'app');
        assert.notStrictEqual(all, one);
    });
});
