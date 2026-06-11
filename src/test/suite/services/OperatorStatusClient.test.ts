import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { OperatorStatusClient, getOperatorStatusOutputChannel } from '../../../services/OperatorStatusClient';
import { OperatorStatusMode } from '../../../kubernetes/OperatorStatusTypes';
import { getOperatorNamespaceResolver, resetOperatorNamespaceResolver } from '../../../services/OperatorNamespaceResolver';
import * as ConfigurationCommandsModule from '../../../kubectl/ConfigurationCommands';

interface MockWorkspaceConfiguration {
    _setConfig: (key: string, value: unknown) => void;
    _clearConfig: () => void;
}

suite('OperatorStatusClient Test Suite', () => {
    const TEST_KUBECONFIG = '/test/kubeconfig';
    const TEST_CONTEXT = 'test-context';
    const TEST_NAMESPACE = 'kube9-system';

    let client: OperatorStatusClient;
    let originalGetConfigMap: typeof ConfigurationCommandsModule.ConfigurationCommands.getConfigMap;
    let mockConfigMapResult: Awaited<ReturnType<typeof ConfigurationCommandsModule.ConfigurationCommands.getConfigMap>> | null =
        null;

    setup(() => {
        resetOperatorNamespaceResolver();
        client = new OperatorStatusClient();
        client.clearAllCache();

        originalGetConfigMap = ConfigurationCommandsModule.ConfigurationCommands.getConfigMap;
        ConfigurationCommandsModule.ConfigurationCommands.getConfigMap = async () => {
            if (!mockConfigMapResult) {
                throw new Error('No mock ConfigMap result configured');
            }
            return mockConfigMapResult;
        };

        const resolver = getOperatorNamespaceResolver();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (resolver as any).resolveNamespace = async () => TEST_NAMESPACE;

        (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._clearConfig();
        getOperatorStatusOutputChannel().clear();
    });

    teardown(() => {
        ConfigurationCommandsModule.ConfigurationCommands.getConfigMap = originalGetConfigMap;
        resetOperatorNamespaceResolver();
        client.clearAllCache();
        (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._clearConfig();
    });

    function buildStatusPayload(overrides: Record<string, unknown> = {}): string {
        return JSON.stringify({
            mode: 'operated',
            version: '1.0.0',
            health: 'healthy',
            lastUpdate: new Date().toISOString(),
            error: null,
            namespace: TEST_NAMESPACE,
            collectionStats: {
                totalSuccessCount: 0,
                totalFailureCount: 0,
                collectionsStoredCount: 0,
                lastSuccessTime: null,
            },
            ...overrides,
        });
    }

    test('parses aiConformance when present in operator status JSON', async () => {
        mockConfigMapResult = {
            configMap: {
                data: {
                    status: buildStatusPayload({
                        aiConformance: {
                            checklistVersion: 'v1',
                            kubernetesMinor: '1.31',
                            lastOutcome: 'success',
                            totals: {
                                totalRequirements: 1,
                                mustRequirements: 1,
                                shouldRequirements: 0,
                                passed: 1,
                                failed: 0,
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
                                    status: 'passed',
                                    rationale: 'ok',
                                },
                            ],
                        },
                    }),
                },
            },
        };

        const result = await client.getStatus(TEST_KUBECONFIG, TEST_CONTEXT, true);

        assert.strictEqual(result.mode, OperatorStatusMode.Operated);
        assert.strictEqual(result.status?.aiConformance?.checklistVersion, 'v1');
        assert.strictEqual(result.status?.aiConformance?.requirements[0].status, 'passed');
    });

    test('remains backward compatible when aiConformance is missing', async () => {
        mockConfigMapResult = {
            configMap: {
                data: {
                    status: buildStatusPayload(),
                },
            },
        };

        const result = await client.getStatus(TEST_KUBECONFIG, TEST_CONTEXT, true);

        assert.strictEqual(result.mode, OperatorStatusMode.Operated);
        assert.strictEqual(result.status?.aiConformance, undefined);
    });

    test('logs and normalizes unknown conformance statuses', async () => {
        mockConfigMapResult = {
            configMap: {
                data: {
                    status: buildStatusPayload({
                        aiConformance: {
                            checklistVersion: 'v1',
                            requirements: [
                                {
                                    id: 'REQ-1',
                                    category: 'security',
                                    level: 'MUST',
                                    title: 'Example',
                                    status: 'maybe-passed',
                                    rationale: 'unknown',
                                },
                            ],
                        },
                    }),
                },
            },
        };

        const result = await client.getStatus(TEST_KUBECONFIG, TEST_CONTEXT, true);
        const output = getOperatorStatusOutputChannel() as { _getContent?: () => string };
        const outputText = output._getContent?.() ?? '';

        assert.strictEqual(result.status?.aiConformance?.requirements[0].status, 'not-evaluated');
        assert.ok(outputText.includes('maybe-passed'));
    });

    test('still parses aiConformance for degraded operator health', async () => {
        mockConfigMapResult = {
            configMap: {
                data: {
                    status: buildStatusPayload({
                        health: 'degraded',
                        error: 'writer lagging',
                        aiConformance: {
                            checklistVersion: 'v1',
                            requirements: [
                                {
                                    id: 'REQ-1',
                                    category: 'security',
                                    level: 'MUST',
                                    title: 'Example',
                                    status: 'warning',
                                    rationale: 'partial signal',
                                },
                            ],
                        },
                    }),
                },
            },
        };

        const result = await client.getStatus(TEST_KUBECONFIG, TEST_CONTEXT, true);

        assert.strictEqual(result.mode, OperatorStatusMode.Degraded);
        assert.strictEqual(result.status?.aiConformance?.requirements[0].status, 'warning');
    });
});
