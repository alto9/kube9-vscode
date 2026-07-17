import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import {
    focusAndRefreshClusterTree,
    resolveManagedResourceRevealNamespace,
    revealManagedResourceInTree
} from '../../../services/treeRevealHelper';

suite('treeRevealHelper', () => {
    let focusCommandCalls = 0;
    let invalidateCalls = 0;
    let revealNamespace = '';

    setup(() => {
        focusCommandCalls = 0;
        invalidateCalls = 0;
        revealNamespace = '';

        (vscode.commands as unknown as { _registerCommand: (id: string, fn: () => Promise<void>) => void })
            ._registerCommand('kube9ClusterView.focus', async () => {
                focusCommandCalls += 1;
            });
    });

    suite('resolveManagedResourceRevealNamespace', () => {
        test('uses non-empty resource namespace and ignores destination', () => {
            assert.strictEqual(
                resolveManagedResourceRevealNamespace('apisocial-ns', 'argocd'),
                'apisocial-ns'
            );
        });

        test('falls back to destination when resource namespace is empty', () => {
            assert.strictEqual(
                resolveManagedResourceRevealNamespace('', 'apisocial-ns'),
                'apisocial-ns'
            );
        });

        test('trims whitespace from resource and destination namespaces', () => {
            assert.strictEqual(
                resolveManagedResourceRevealNamespace('  apisocial-ns  ', 'ignored'),
                'apisocial-ns'
            );
            assert.strictEqual(
                resolveManagedResourceRevealNamespace('   ', '  apisocial-ns  '),
                'apisocial-ns'
            );
        });

        test('returns empty when both resource and destination namespaces are empty', () => {
            assert.strictEqual(resolveManagedResourceRevealNamespace('', ''), '');
            assert.strictEqual(resolveManagedResourceRevealNamespace('  ', undefined), '');
        });
    });

    suite('focusAndRefreshClusterTree', () => {
        test('focuses cluster view and invalidates navigate caches', async () => {
            const treeProvider = {
                invalidateCachesBeforeTreeReveal: () => {
                    invalidateCalls += 1;
                }
            } as unknown as ClusterTreeProvider;

            await focusAndRefreshClusterTree(treeProvider);

            assert.strictEqual(focusCommandCalls, 1);
            assert.strictEqual(invalidateCalls, 1);
        });
    });

    suite('revealManagedResourceInTree', () => {
        function buildTreeProvider(overrides: Partial<ClusterTreeProvider> = {}): ClusterTreeProvider {
            return {
                getKubeconfigPath: () => '/mock/kubeconfig',
                isCurrentContext: async () => true,
                invalidateCachesBeforeTreeReveal: () => {
                    invalidateCalls += 1;
                },
                revealTreeResource: async (_kind: string, _name: string, namespace: string) => {
                    revealNamespace = namespace;
                    return true;
                },
                ...overrides
            } as unknown as ClusterTreeProvider;
        }

        test('reveals with resolved resource namespace, not Application CR namespace', async () => {
            const treeProvider = buildTreeProvider();
            const result = await revealManagedResourceInTree(
                { treeProvider, panelContext: 'minikube' },
                'Deployment',
                'apisocial',
                'apisocial-ns',
                { destinationNamespace: 'argocd' }
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(revealNamespace, 'apisocial-ns');
            assert.strictEqual(invalidateCalls, 1);
            assert.strictEqual(focusCommandCalls, 1);
        });

        test('falls back to destination namespace when resource namespace is empty', async () => {
            const treeProvider = buildTreeProvider();
            const result = await revealManagedResourceInTree(
                { treeProvider, panelContext: 'minikube' },
                'Deployment',
                'apisocial',
                '',
                { destinationNamespace: 'apisocial-ns' }
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(revealNamespace, 'apisocial-ns');
        });
    });
});
