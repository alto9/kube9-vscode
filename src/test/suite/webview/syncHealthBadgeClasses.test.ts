import * as assert from 'assert';
import { SyncStatusCode, HealthStatusCode } from '../../../types/argocd';
import {
    healthStatusBadgeClass,
    healthStatusIconClass,
    healthStatusLabel,
    syncStatusBadgeClass,
    syncStatusIconClass
} from '../../../webview/argocd-application/graph/syncHealthBadgeClasses';

/**
 * Webview badge presentation cases aligned with `src/test/suite/utils/argoCDIcons.test.ts`.
 * When cases diverge, `argoCDIcons.ts` and its tests are authoritative.
 */
suite('syncHealthBadgeClasses Test Suite', () => {
    suite('syncStatusIconClass', () => {
        test('should return codicon-check for Synced + Healthy', () => {
            assert.strictEqual(syncStatusIconClass('Synced', 'Healthy'), 'codicon-check');
        });

        test('should return codicon-warning for OutOfSync + Degraded', () => {
            assert.strictEqual(syncStatusIconClass('OutOfSync', 'Degraded'), 'codicon-warning');
        });

        test('should return codicon-warning for OutOfSync + Healthy', () => {
            assert.strictEqual(syncStatusIconClass('OutOfSync', 'Healthy'), 'codicon-warning');
        });

        test('should return codicon-sync for Synced + Progressing', () => {
            assert.strictEqual(syncStatusIconClass('Synced', 'Progressing'), 'codicon-sync');
        });

        test('should return codicon-warning for Synced + Degraded', () => {
            assert.strictEqual(syncStatusIconClass('Synced', 'Degraded'), 'codicon-warning');
        });

        test('should return codicon-debug-pause for Suspended health regardless of sync status', () => {
            for (const syncStatus of ['Synced', 'OutOfSync', 'Unknown'] as SyncStatusCode[]) {
                assert.strictEqual(
                    syncStatusIconClass(syncStatus, 'Suspended'),
                    'codicon-debug-pause',
                    syncStatus
                );
            }
        });

        test('should return codicon-error for Unknown sync + Degraded health', () => {
            assert.strictEqual(syncStatusIconClass('Unknown', 'Degraded'), 'codicon-error');
        });

        test('should return codicon-question for Unknown sync + Unknown health', () => {
            assert.strictEqual(syncStatusIconClass('Unknown', 'Unknown'), 'codicon-question');
        });

        test('should return codicon-question for Unknown sync + Healthy health', () => {
            assert.strictEqual(syncStatusIconClass('Unknown', 'Healthy'), 'codicon-question');
        });
    });

    suite('syncStatusBadgeClass', () => {
        test('should return synced for Synced + Healthy', () => {
            assert.strictEqual(syncStatusBadgeClass('Synced', 'Healthy'), 'synced');
        });

        test('should return progressing for Synced + Progressing', () => {
            assert.strictEqual(syncStatusBadgeClass('Synced', 'Progressing'), 'progressing');
        });

        test('should return out-of-sync for OutOfSync + Healthy', () => {
            assert.strictEqual(syncStatusBadgeClass('OutOfSync', 'Healthy'), 'out-of-sync');
        });

        test('should return out-of-sync-warning for OutOfSync + Degraded', () => {
            assert.strictEqual(syncStatusBadgeClass('OutOfSync', 'Degraded'), 'out-of-sync-warning');
        });

        test('should return unknown for Unknown sync status', () => {
            assert.strictEqual(syncStatusBadgeClass('Unknown', 'Healthy'), 'unknown');
        });

        test('should return unknown for Suspended health', () => {
            assert.strictEqual(syncStatusBadgeClass('Synced', 'Suspended'), 'unknown');
        });

        test('defaults OutOfSync without health to out-of-sync', () => {
            assert.strictEqual(syncStatusBadgeClass('OutOfSync'), 'out-of-sync');
        });
    });

    suite('healthStatusIconClass', () => {
        test('should return codicon-check for Healthy', () => {
            assert.strictEqual(healthStatusIconClass('Healthy'), 'codicon-check');
        });

        test('should return codicon-warning for Degraded', () => {
            assert.strictEqual(healthStatusIconClass('Degraded'), 'codicon-warning');
        });

        test('should return codicon-error for Missing', () => {
            assert.strictEqual(healthStatusIconClass('Missing'), 'codicon-error');
        });

        test('should return codicon-sync for Progressing', () => {
            assert.strictEqual(healthStatusIconClass('Progressing'), 'codicon-sync');
        });

        test('should return codicon-debug-pause for Suspended', () => {
            assert.strictEqual(healthStatusIconClass('Suspended'), 'codicon-debug-pause');
        });

        test('should return codicon-question for Unknown or missing health', () => {
            assert.strictEqual(healthStatusIconClass('Unknown'), 'codicon-question');
            assert.strictEqual(healthStatusIconClass(undefined), 'codicon-question');
        });
    });

    suite('healthStatusBadgeClass', () => {
        test('maps health codes to CSS classes', () => {
            assert.strictEqual(healthStatusBadgeClass('Healthy'), 'healthy');
            assert.strictEqual(healthStatusBadgeClass('Degraded'), 'degraded');
            assert.strictEqual(healthStatusBadgeClass('Missing'), 'missing');
            assert.strictEqual(healthStatusBadgeClass('Progressing'), 'progressing');
            assert.strictEqual(healthStatusBadgeClass('Suspended'), 'suspended');
            assert.strictEqual(healthStatusBadgeClass('Unknown'), 'unknown');
            assert.strictEqual(healthStatusBadgeClass(undefined), 'unknown');
        });
    });

    suite('healthStatusLabel', () => {
        test('uses em dash for missing health and Unknown label otherwise', () => {
            assert.strictEqual(healthStatusLabel(undefined), '—');
            assert.strictEqual(healthStatusLabel('Unknown'), 'Unknown');
            assert.strictEqual(healthStatusLabel('Healthy'), 'Healthy');
        });
    });

    suite('parity matrix coverage', () => {
        test('handles all sync and health combinations', () => {
            const syncStatuses: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
            const healthStatuses: HealthStatusCode[] = [
                'Healthy',
                'Degraded',
                'Progressing',
                'Suspended',
                'Missing',
                'Unknown'
            ];

            for (const syncStatus of syncStatuses) {
                for (const healthStatus of healthStatuses) {
                    const syncIcon = syncStatusIconClass(syncStatus, healthStatus);
                    const syncClass = syncStatusBadgeClass(syncStatus, healthStatus);
                    const healthIcon = healthStatusIconClass(healthStatus);
                    const healthClass = healthStatusBadgeClass(healthStatus);

                    assert.ok(syncIcon.startsWith('codicon-'), `${syncStatus}+${healthStatus} sync icon`);
                    assert.ok(syncClass.length > 0, `${syncStatus}+${healthStatus} sync class`);
                    assert.ok(healthIcon?.startsWith('codicon-'), `${syncStatus}+${healthStatus} health icon`);
                    assert.ok(healthClass.length > 0, `${syncStatus}+${healthStatus} health class`);
                }
            }
        });
    });
});
