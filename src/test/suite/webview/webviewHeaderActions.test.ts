import * as assert from 'assert';
import { nextOverflowMenuIndex } from '../../../webview/components/overflowMenuKeyboard';
import {
    WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS,
    partitionWebviewHeaderActions
} from '../../../webview/components/partitionWebviewHeaderActions';
import type { WebviewHeaderAction } from '../../../webview/components/webviewHeaderTypes';

function action(label: string): WebviewHeaderAction {
    return { label, onClick: () => undefined };
}

suite('webviewHeaderActions', () => {
    test('partitionWebviewHeaderActions auto-splits actions after three primaries', () => {
        const actions = ['a', 'b', 'c', 'd', 'e'].map((label) => action(label));
        const slots = partitionWebviewHeaderActions({ actions });
        assert.strictEqual(slots.primary.length, WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS);
        assert.strictEqual(slots.overflow.length, 2);
        assert.deepStrictEqual(
            slots.primary.map((item) => item.label),
            ['a', 'b', 'c']
        );
        assert.deepStrictEqual(
            slots.overflow.map((item) => item.label),
            ['d', 'e']
        );
    });

    test('partitionWebviewHeaderActions honors explicit primary and overflow', () => {
        const slots = partitionWebviewHeaderActions({
            primaryActions: [action('sync')],
            overflowActions: [action('hard refresh')]
        });
        assert.strictEqual(slots.primary.length, 1);
        assert.strictEqual(slots.overflow.length, 1);
        assert.strictEqual(slots.overflow[0].label, 'hard refresh');
    });

    test('partitionWebviewHeaderActions moves excess explicit primaries into overflow', () => {
        const slots = partitionWebviewHeaderActions({
            primaryActions: ['one', 'two', 'three', 'four'].map((label) => action(label)),
            overflowActions: [action('overflow-only')]
        });
        assert.strictEqual(slots.primary.length, WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS);
        assert.strictEqual(slots.overflow.length, 2);
        assert.strictEqual(slots.overflow[0].label, 'four');
        assert.strictEqual(slots.overflow[1].label, 'overflow-only');
    });

    test('nextOverflowMenuIndex wraps roving focus for header overflow', () => {
        assert.strictEqual(nextOverflowMenuIndex(0, 'down', 3), 1);
        assert.strictEqual(nextOverflowMenuIndex(2, 'down', 3), 0);
        assert.strictEqual(nextOverflowMenuIndex(0, 'up', 3), 2);
    });
});
