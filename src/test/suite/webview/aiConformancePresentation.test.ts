import * as assert from 'assert';
import {
    detailCopyForRequirement,
    formatOverallReadiness,
    groupRequirementsByCategory,
    shouldShowRequirementDetail,
    statusBadgeClass,
    statusDisplayLabel,
    type AIConformanceCategoryRollup,
    type AIConformanceRequirementRow,
} from '../../../webview/aiConformancePresentation';

function row(
    overrides: Partial<AIConformanceRequirementRow> = {}
): AIConformanceRequirementRow {
    return {
        id: 'REQ-1',
        category: 'networking',
        level: 'MUST',
        title: 'Sample requirement',
        status: 'passed',
        rationale: '',
        ...overrides,
    };
}

function rollup(overrides: Partial<AIConformanceCategoryRollup> = {}): AIConformanceCategoryRollup {
    return {
        total: 1,
        passed: 1,
        failed: 0,
        warning: 0,
        notApplicable: 0,
        notEvaluated: 0,
        needsEvidence: 0,
        ...overrides,
    };
}

suite('aiConformancePresentation @unit', () => {
    test('statusBadgeClass uses neutral styling for evidence states', () => {
        assert.ok(statusBadgeClass('needs-evidence').includes('status-needs-evidence'));
        assert.ok(statusBadgeClass('not-evaluated').includes('status-not-evaluated'));
        assert.ok(!statusBadgeClass('needs-evidence').includes('status-passed'));
        assert.ok(!statusBadgeClass('not-evaluated').includes('status-failed'));
    });

    test('statusDisplayLabel returns readable text for every status', () => {
        assert.strictEqual(statusDisplayLabel('passed'), 'Passed');
        assert.strictEqual(statusDisplayLabel('needs-evidence'), 'Needs evidence');
        assert.strictEqual(statusDisplayLabel('not-evaluated'), 'Not evaluated');
    });

    test('groupRequirementsByCategory preserves category order and filters rows', () => {
        const categories = {
            accelerators: rollup({ total: 2 }),
            networking: rollup({ total: 1 }),
        };
        const requirements = [
            row({ id: 'A-1', category: 'accelerators' }),
            row({ id: 'N-1', category: 'networking' }),
            row({ id: 'A-2', category: 'accelerators', status: 'failed', rationale: 'Missing device plugin' }),
        ];

        const groups = groupRequirementsByCategory(categories, requirements);
        assert.strictEqual(groups.length, 2);
        assert.strictEqual(groups[0].categoryId, 'accelerators');
        assert.strictEqual(groups[0].rows.length, 2);
        assert.strictEqual(groups[1].categoryId, 'networking');
        assert.strictEqual(groups[1].rows.length, 1);
    });

    test('shouldShowRequirementDetail covers failed rows and neutral evidence states', () => {
        assert.strictEqual(
            shouldShowRequirementDetail(row({ status: 'failed', rationale: 'Driver missing' })),
            true
        );
        assert.strictEqual(shouldShowRequirementDetail(row({ status: 'needs-evidence' })), true);
        assert.strictEqual(shouldShowRequirementDetail(row({ status: 'passed' })), false);
    });

    test('detailCopyForRequirement provides readiness-safe fallback copy', () => {
        assert.ok(
            detailCopyForRequirement(row({ status: 'needs-evidence' })).includes('external evidence')
        );
        assert.ok(
            detailCopyForRequirement(row({ status: 'not-evaluated' })).includes('not evaluated')
        );
        assert.strictEqual(
            detailCopyForRequirement(row({ status: 'failed', rationale: 'Check logs' })),
            'Check logs'
        );
    });

    test('formatOverallReadiness maps operator outcome fields', () => {
        assert.strictEqual(formatOverallReadiness('none', null), 'No completed run');
        assert.strictEqual(formatOverallReadiness('success', 'completed'), 'Latest run completed');
        assert.strictEqual(formatOverallReadiness('failed', 'failed'), 'Latest run failed');
        assert.strictEqual(formatOverallReadiness('success', 'partial'), 'Latest run partial');
    });
});
