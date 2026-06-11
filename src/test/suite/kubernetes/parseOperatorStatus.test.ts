import * as assert from 'assert';
import {
    normalizeAIConformanceStatus,
    normalizeOperatorStatusPayload,
    parseAIConformanceSummary,
} from '../../../kubernetes/parseOperatorStatus';
import { OperatorStatus } from '../../../kubernetes/OperatorStatusTypes';

function baseOperatorStatus(overrides: Partial<OperatorStatus> = {}): OperatorStatus {
    return {
        mode: 'operated',
        version: '1.0.0',
        health: 'healthy',
        lastUpdate: new Date().toISOString(),
        error: null,
        namespace: 'kube9-system',
        collectionStats: {
            totalSuccessCount: 0,
            totalFailureCount: 0,
            collectionsStoredCount: 0,
            lastSuccessTime: null,
        },
        ...overrides,
    };
}

suite('parseOperatorStatus Test Suite', () => {
    suite('parseAIConformanceSummary', () => {
        test('returns undefined when aiConformance is absent', () => {
            const result = parseAIConformanceSummary(undefined);
            assert.strictEqual(result, undefined);
        });

        test('parses a bounded conformance summary from operator payload', () => {
            const result = parseAIConformanceSummary({
                checklistVersion: 'KubernetesAIConformance-1.31',
                kubernetesMinor: '1.31',
                sourceRevision: 'bundle-test',
                lastCompletedAt: '2026-06-11T12:00:00.000Z',
                lastOutcome: 'success',
                runState: 'completed',
                runId: 'run-1',
                totals: {
                    totalRequirements: 2,
                    mustRequirements: 1,
                    shouldRequirements: 1,
                    passed: 1,
                    failed: 0,
                    warning: 0,
                    notApplicable: 0,
                    notEvaluated: 1,
                    needsEvidence: 0,
                },
                categories: {
                    security: {
                        total: 1,
                        passed: 1,
                        failed: 0,
                        warning: 0,
                        notApplicable: 0,
                        notEvaluated: 0,
                        needsEvidence: 0,
                    },
                },
                requirements: [
                    {
                        id: 'SEC-001',
                        category: 'security',
                        level: 'MUST',
                        title: 'Secure API server',
                        status: 'passed',
                        rationale: 'API server uses TLS',
                        evidenceRef: 'secret-evidence-blob',
                    },
                    {
                        id: 'GOV-001',
                        category: 'governance',
                        level: 'SHOULD',
                        title: 'Document model usage',
                        status: 'not-evaluated',
                        rationale: 'No objective signal',
                    },
                ],
                error: null,
                schedulingEnabled: true,
                scheduleIntervalSeconds: 86400,
                checklistSource: 'bundled',
            });

            assert.notStrictEqual(result, undefined);
            assert.strictEqual(result?.checklistVersion, 'KubernetesAIConformance-1.31');
            assert.strictEqual(result?.requirements.length, 2);
            assert.strictEqual(result?.requirements[0].status, 'passed');
            assert.strictEqual(result?.requirements[1].status, 'not-evaluated');
            assert.ok(!('evidenceRef' in (result?.requirements[0] ?? {})));
            assert.strictEqual(result?.categories.security.passed, 1);
        });

        test('omits malformed aiConformance blocks', () => {
            const logs: string[] = [];
            const result = parseAIConformanceSummary('not-an-object', (message) => logs.push(message));

            assert.strictEqual(result, undefined);
            assert.ok(logs.some((line) => line.includes('aiConformance was not an object')));
        });

        test('normalizes unknown requirement statuses to not-evaluated', () => {
            const logs: string[] = [];
            const result = parseAIConformanceSummary(
                {
                    checklistVersion: 'v1',
                    kubernetesMinor: '1.31',
                    requirements: [
                        {
                            id: 'REQ-1',
                            category: 'security',
                            level: 'MUST',
                            title: 'Example',
                            status: 'bogus-status',
                            rationale: 'test',
                        },
                    ],
                },
                (message) => logs.push(message)
            );

            assert.strictEqual(result?.requirements[0].status, 'not-evaluated');
            assert.ok(logs.some((line) => line.includes('bogus-status')));
        });

        test('uses empty requirements when requirements is malformed', () => {
            const logs: string[] = [];
            const result = parseAIConformanceSummary(
                {
                    checklistVersion: 'v1',
                    requirements: 'bad',
                },
                (message) => logs.push(message)
            );

            assert.deepStrictEqual(result?.requirements, []);
            assert.ok(logs.some((line) => line.includes('requirements was not an array')));
        });
    });

    suite('normalizeOperatorStatusPayload', () => {
        test('keeps operator status backward compatible when aiConformance is missing', () => {
            const status = baseOperatorStatus();
            const normalized = normalizeOperatorStatusPayload(status);

            assert.strictEqual(normalized.aiConformance, undefined);
            assert.strictEqual(normalized.mode, 'operated');
        });

        test('attaches normalized aiConformance when present', () => {
            const status = baseOperatorStatus({
                aiConformance: {
                    checklistVersion: 'v1',
                    kubernetesMinor: '1.31',
                    sourceRevision: null,
                    lastCompletedAt: null,
                    lastOutcome: 'none',
                    runState: null,
                    runId: null,
                    totals: {
                        totalRequirements: 0,
                        mustRequirements: 0,
                        shouldRequirements: 0,
                        passed: 0,
                        failed: 0,
                        warning: 0,
                        notApplicable: 0,
                        notEvaluated: 0,
                        needsEvidence: 0,
                    },
                    categories: {},
                    requirements: [],
                    error: null,
                    schedulingEnabled: false,
                    scheduleIntervalSeconds: null,
                    checklistSource: null,
                },
            });

            const normalized = normalizeOperatorStatusPayload(status);
            assert.strictEqual(normalized.aiConformance?.checklistVersion, 'v1');
        });

        test('preserves degraded operator health while parsing conformance summary', () => {
            const status = baseOperatorStatus({
                health: 'degraded',
                error: 'status writer lagging',
                aiConformance: {
                    checklistVersion: 'v1',
                    kubernetesMinor: '1.31',
                    sourceRevision: null,
                    lastCompletedAt: '2026-06-10T10:00:00.000Z',
                    lastOutcome: 'success',
                    runState: 'completed',
                    runId: 'run-stale',
                    totals: {
                        totalRequirements: 1,
                        mustRequirements: 1,
                        shouldRequirements: 0,
                        passed: 0,
                        failed: 1,
                        warning: 0,
                        notApplicable: 0,
                        notEvaluated: 0,
                        needsEvidence: 0,
                    },
                    categories: {},
                    requirements: [
                        {
                            id: 'REQ-1',
                            category: 'security',
                            level: 'MUST',
                            title: 'Example',
                            status: 'failed',
                            rationale: 'degraded cluster signal',
                        },
                    ],
                    error: null,
                    schedulingEnabled: true,
                    scheduleIntervalSeconds: 86400,
                    checklistSource: 'bundled',
                },
            });

            const normalized = normalizeOperatorStatusPayload(status);
            assert.strictEqual(normalized.health, 'degraded');
            assert.strictEqual(normalized.aiConformance?.requirements[0].status, 'failed');
        });
    });

    suite('normalizeAIConformanceStatus', () => {
        test('accepts the closed conformance status vocabulary', () => {
            assert.strictEqual(
                normalizeAIConformanceStatus('needs-evidence', () => {}, 'test'),
                'needs-evidence'
            );
        });

        test('never returns passed for unknown values', () => {
            const status = normalizeAIConformanceStatus('passed-ish', () => {}, 'test');
            assert.strictEqual(status, 'not-evaluated');
            assert.notStrictEqual(status, 'passed');
        });
    });
});
