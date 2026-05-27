import * as assert from 'assert';
import { migratePersistedTab } from '../../../webview/argocd-application/utils/tabMigration';

suite('argocd tab migration', () => {
    test('defaults to graph when no prior selection', () => {
        assert.strictEqual(migratePersistedTab(undefined), 'graph');
    });

    test('maps legacy overview and driftDetails to details', () => {
        assert.strictEqual(migratePersistedTab('overview'), 'details');
        assert.strictEqual(migratePersistedTab('driftDetails'), 'details');
    });

    test('preserves current tab values', () => {
        assert.strictEqual(migratePersistedTab('graph'), 'graph');
        assert.strictEqual(migratePersistedTab('details'), 'details');
    });
});
