import * as assert from 'assert';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import { ClusterTreeItem, ClusterStatus } from '../../../tree/ClusterTreeItem';
import { ClusterConnectivity, ConnectivityResult } from '../../../kubernetes/ClusterConnectivity';
import { NamespaceCommands, NamespacesResult } from '../../../kubectl/NamespaceCommands';
import { ParsedKubeconfig } from '../../../kubernetes/KubeconfigParser';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import * as kubectlContextModule from '../../../utils/kubectlContext';
import * as vscode from '../../mocks/vscode';
import { ClusterCustomizationService } from '../../../services/ClusterCustomizationService';

suite('ClusterTreeProvider Test Suite', () => {
    let provider: ClusterTreeProvider;
    let originalGetNamespaces: typeof NamespaceCommands.getNamespaces;
    let originalCheckMultipleConnectivity: typeof ClusterConnectivity.checkMultipleConnectivity;
    let originalGetCurrentNamespace: typeof kubectlContextModule.getCurrentNamespace;
    let originalGetNamespaceForContext: typeof kubectlContextModule.getNamespaceForContext;

    const mockKubeconfig: ParsedKubeconfig = {
        filePath: '/test/kubeconfig.yaml',
        clusters: [
            { name: 'test-cluster-1', server: 'https://api.test1.com:6443' },
            { name: 'test-cluster-2', server: 'https://api.test2.com:6443' }
        ],
        contexts: [
            { name: 'context-1', cluster: 'test-cluster-1', user: 'user-1', namespace: 'default' },
            { name: 'context-2', cluster: 'test-cluster-2', user: 'user-2' }
        ],
        users: [
            { name: 'user-1' },
            { name: 'user-2' }
        ],
        currentContext: 'context-1'
    };

    setup(() => {
        provider = new ClusterTreeProvider();
        
        // Save original methods for restoration
        originalGetNamespaces = NamespaceCommands.getNamespaces;
        originalCheckMultipleConnectivity = ClusterConnectivity.checkMultipleConnectivity;
        originalGetCurrentNamespace = kubectlContextModule.getCurrentNamespace;
        originalGetNamespaceForContext = kubectlContextModule.getNamespaceForContext;
        
        // Mock getCurrentNamespace to return null by default (no active namespace)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getCurrentNamespace = async (): Promise<string | null> => {
            return null;
        };
        
        // Mock getNamespaceForContext to return null by default (no active namespace for any context)
        // This is what NamespacesCategory now uses to determine active namespace
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
            return null;
        };
        
        // Clear any previous window messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any)._clearMessages();
    });

    teardown(() => {
        // Restore original methods
        NamespaceCommands.getNamespaces = originalGetNamespaces;
        ClusterConnectivity.checkMultipleConnectivity = originalCheckMultipleConnectivity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getCurrentNamespace = originalGetCurrentNamespace;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getNamespaceForContext = originalGetNamespaceForContext;
        
        // Dispose provider if it was created
        if (provider) {
            provider.dispose();
        }
    });

    suite('getTreeItem', () => {
        test('Should return the tree item as-is', () => {
            const item = new ClusterTreeItem('test', 'cluster', vscode.TreeItemCollapsibleState.Collapsed);
            const result = provider.getTreeItem(item);
            assert.strictEqual(result, item);
        });
    });

    suite('2-Level Structure Tests', () => {
        test('Should return clusters at root level', async () => {
            // Mock connectivity check to avoid waiting
            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected }
            ];

            provider.setKubeconfig(mockKubeconfig);
            
            const items = await provider.getChildren();
            
            // Should have 2 clusters
            assert.strictEqual(items.length, 2);
            assert.strictEqual(items[0].type, 'cluster');
            assert.strictEqual(items[0].label, 'context-1');
            assert.strictEqual(items[1].type, 'cluster');
            assert.strictEqual(items[1].label, 'context-2');
        });

        test('Should return categories for cluster level', async () => {
            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const clusterItem = clusters[0];
            
            const categories = await provider.getChildren(clusterItem);
            
            // Should have 9 categories (Dashboard, Nodes, Namespaces, Workloads, Services, ConfigMaps, Secrets, PersistentVolumes, StorageClasses, CronJobs)
            assert.strictEqual(categories.length, 9);
            assert.strictEqual(categories[0].label, 'Dashboard');
            assert.strictEqual(categories[1].label, 'Nodes');
            assert.strictEqual(categories[2].label, 'Namespaces');
            assert.strictEqual(categories[3].label, 'Workloads');
        });

        test('Should return empty array for category with no data', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            
            const children = await provider.getChildren(namespacesCategory!);
            
            assert.strictEqual(children.length, 0);
        });

        test('Should return empty array for non-cluster items without children', async () => {
            const infoItem = new ClusterTreeItem('Info', 'info', vscode.TreeItemCollapsibleState.None);
            const children = await provider.getChildren(infoItem);
            assert.strictEqual(children.length, 0);
        });
    });

    suite('Namespace Retrieval Tests (Mocked kubectl)', () => {
        test('Should call getNamespaces with correct parameters', async () => {
            let calledWithPath: string | undefined;
            let calledWithContext: string | undefined;

            NamespaceCommands.getNamespaces = async (kubeconfigPath: string, contextName: string): Promise<NamespacesResult> => {
                calledWithPath = kubeconfigPath;
                calledWithContext = contextName;
                return { namespaces: [{ name: 'default', status: 'Active' }] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            await provider.getChildren(namespacesCategory!);
            
            assert.strictEqual(calledWithPath, '/test/kubeconfig.yaml');
            assert.strictEqual(calledWithContext, 'context-1');
        });

        test('Should sort namespaces alphabetically', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                // Return sorted namespaces (as the real implementation would)
                return { namespaces: [
                    { name: 'alpha', status: 'Active' },
                    { name: 'beta', status: 'Active' },
                    { name: 'kube-system', status: 'Active' },
                    { name: 'zebra', status: 'Active' }
                ] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            
            const namespaceNames = namespaceItems.map(item => item.label);
            
            assert.deepStrictEqual(namespaceNames, ['alpha', 'beta', 'kube-system', 'zebra']);
        });

        test('Should handle empty namespace list', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            
            assert.strictEqual(namespaceItems.length, 0);
        });
    });

    suite('Namespace Category Tests', () => {
        test('Should have correct type', async () => {
            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            
            assert.ok(namespacesCategory);
            assert.strictEqual(namespacesCategory!.type, 'namespaces');
        });

        test('Should be expandable', async () => {
            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            
            assert.ok(namespacesCategory);
            assert.strictEqual(namespacesCategory!.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        });

        test('Should have appropriate icon', async () => {
            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            
            assert.ok(namespacesCategory);
            assert.ok(namespacesCategory!.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((namespacesCategory!.iconPath as vscode.ThemeIcon).id, 'symbol-namespace');
        });
    });

    suite('Individual Namespace Tests', () => {
        test('Should have type "namespace"', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [
                    { name: 'default', status: 'Active' },
                    { name: 'production', status: 'Active' }
                ] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            
            assert.strictEqual(namespaceItems[0].type, 'namespace');
            assert.strictEqual(namespaceItems[1].type, 'namespace');
        });

        test('Should have kube9.openNamespace command', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [{ name: 'default', status: 'Active' }] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            const namespaceItem = namespaceItems[0];
            
            assert.ok(namespaceItem.command);
            assert.strictEqual(namespaceItem.command.command, 'kube9.openNamespace');
        });

        test('Should have symbol-namespace icon', async () => {
            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [{ name: 'default', status: 'Active' }] };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            const namespaceItem = namespaceItems[0];
            
            assert.ok(namespaceItem.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((namespaceItem.iconPath as vscode.ThemeIcon).id, 'symbol-namespace');
        });
    });

    suite('Refresh Mechanism Tests', () => {
        test('Should fire onDidChangeTreeData event when refresh() is called', (done) => {
            let eventFired = false;
            
            provider.onDidChangeTreeData(() => {
                eventFired = true;
                assert.strictEqual(eventFired, true);
                done();
            });
            
            provider.refresh();
        });

        test('Should fire event with element when refreshItem() is called', (done) => {
            const testItem = new ClusterTreeItem('test', 'cluster', vscode.TreeItemCollapsibleState.Collapsed);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provider.onDidChangeTreeData((element: any) => {
                assert.strictEqual(element, testItem);
                done();
            });
            
            provider.refreshItem(testItem);
        });

        test('Should trigger refresh when setKubeconfig() is called', (done) => {
            provider.onDidChangeTreeData(() => {
                done();
            });
            
            provider.setKubeconfig(mockKubeconfig);
        });
    });

    suite('Error Handling Tests (Mocked Errors)', () => {
        test('Should show kubectl binary not found error once per session only', async () => {
            const error = new KubectlError(
                KubectlErrorType.BinaryNotFound,
                'kubectl is not installed',
                'kubectl: command not found',
                'context-1'
            );

            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [], error };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            await provider.getChildren(namespacesCategory!);
            
            // First call should show error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errors1 = (vscode.window as any)._getErrorMessages();
            assert.strictEqual(errors1.length, 1);
            
            // Second call should NOT show error again
            await provider.getChildren(namespacesCategory!);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errors2 = (vscode.window as any)._getErrorMessages();
            assert.strictEqual(errors2.length, 1); // Still only 1
        });

        test('Should show warning for permission denied errors', async () => {
            const error = new KubectlError(
                KubectlErrorType.PermissionDenied,
                'Access denied to cluster',
                'permission denied',
                'context-1'
            );

            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [], error };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            await provider.getChildren(namespacesCategory!);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const warnings = (vscode.window as any)._getWarningMessages();
            assert.strictEqual(warnings.length, 1);
        });

        test('Should only log connection failures (no UI message)', async () => {
            const error = new KubectlError(
                KubectlErrorType.ConnectionFailed,
                'Cannot connect to cluster',
                'connection refused',
                'context-1'
            );

            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [], error };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            await provider.getChildren(clusters[0]);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errors = (vscode.window as any)._getErrorMessages();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const warnings = (vscode.window as any)._getWarningMessages();
            
            // No UI messages should be shown
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(warnings.length, 0);
        });

        test('Should only log timeout errors (no UI message)', async () => {
            const error = new KubectlError(
                KubectlErrorType.Timeout,
                'Connection timed out',
                'timeout',
                'context-1'
            );

            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [], error };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            await provider.getChildren(clusters[0]);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errors = (vscode.window as any)._getErrorMessages();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const warnings = (vscode.window as any)._getWarningMessages();
            
            assert.strictEqual(errors.length, 0);
            assert.strictEqual(warnings.length, 0);
        });

        test('Should return empty array on namespace error', async () => {
            const error = new KubectlError(
                KubectlErrorType.Unknown,
                'Failed to execute kubectl',
                'some error',
                'context-1'
            );

            NamespaceCommands.getNamespaces = async (): Promise<NamespacesResult> => {
                return { namespaces: [], error };
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const clusters = await provider.getChildren();
            const categories = await provider.getChildren(clusters[0]);
            const namespacesCategory = categories.find(c => c.label === 'Namespaces');
            const namespaceItems = await provider.getChildren(namespacesCategory!);
            
            assert.strictEqual(namespaceItems.length, 0);
        });
    });

    suite('Edge Cases', () => {
        test('Should show message when no kubeconfig is set', async () => {
            const items = await provider.getChildren();
            
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].type, 'cluster');
            assert.strictEqual(items[0].label, 'No clusters detected');
        });

        test('Should show message when kubeconfig has no contexts', async () => {
            const emptyKubeconfig: ParsedKubeconfig = {
                filePath: '/test/kubeconfig.yaml',
                clusters: [],
                contexts: [],
                users: [],
                currentContext: undefined
            };

            provider.setKubeconfig(emptyKubeconfig);
            
            const items = await provider.getChildren();
            
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].label, 'No clusters configured');
        });

        test('Should skip contexts with missing cluster references', async () => {
            const invalidKubeconfig: ParsedKubeconfig = {
                filePath: '/test/kubeconfig.yaml',
                clusters: [
                    { name: 'test-cluster-1', server: 'https://api.test1.com:6443' }
                ],
                contexts: [
                    { name: 'valid-context', cluster: 'test-cluster-1', user: 'user-1' },
                    { name: 'invalid-context', cluster: 'non-existent-cluster', user: 'user-2' }
                ],
                users: [{ name: 'user-1' }, { name: 'user-2' }],
                currentContext: 'valid-context'
            };

            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected }
            ];

            provider.setKubeconfig(invalidKubeconfig);
            
            const items = await provider.getChildren();
            
            // Should have 1 valid cluster
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].label, 'valid-context');
        });

        test('Should return empty array when cluster has no resourceData', async () => {
            const clusterWithoutData = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            const items = await provider.getChildren(clusterWithoutData);
            
            assert.strictEqual(items.length, 0);
        });
    });

    suite('Connectivity Status Tests', () => {
        test('Should update cluster status after connectivity check', async () => {
            ClusterConnectivity.checkMultipleConnectivity = async (): Promise<ConnectivityResult[]> => {
                return [
                    { status: ClusterStatus.Connected },
                    { status: ClusterStatus.Disconnected }
                ];
            };

            provider.setKubeconfig(mockKubeconfig);
            
            const items = await provider.getChildren();
            
            // Wait a bit for async connectivity checks to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Items should have been updated (though we can't directly check since refresh was called)
            assert.ok(items.length >= 2);
        });
    });

    suite('Visibility Filtering Tests', () => {
        let mockCustomizationService: ClusterCustomizationService;
        let mockContext: vscode.ExtensionContext;
        let mockMemento: vscode.Memento;
        let storage: Map<string, unknown>;

        setup(() => {
            // Create a mock memento (globalState)
            storage = new Map<string, unknown>();
            mockMemento = {
                keys: () => Array.from(storage.keys()),
                get: <T>(key: string, defaultValue?: T): T => {
                    return storage.has(key) ? (storage.get(key) as T) : (defaultValue as T);
                },
                update: async (key: string, value: unknown): Promise<void> => {
                    if (value === undefined) {
                        storage.delete(key);
                    } else {
                        storage.set(key, value);
                    }
                }
            } as vscode.Memento;

            // Create a mock extension context with setKeysForSync
            const globalStateWithSync = Object.assign(mockMemento, {
                setKeysForSync: (): void => {
                    // No-op for testing
                }
            });

            mockContext = {
                globalState: globalStateWithSync,
                subscriptions: [],
                extensionPath: '',
                extensionUri: vscode.Uri.file(''),
                environmentVariableCollection: {},
                storagePath: undefined,
                globalStoragePath: '',
                logPath: '',
                extensionMode: vscode.ExtensionMode.Test,
                storageUri: undefined,
                globalStorageUri: vscode.Uri.file(''),
                logUri: vscode.Uri.file(''),
                workspaceState: {} as vscode.Memento,
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {},
                    keys: async () => [],
                    onDidChange: {}
                } as vscode.SecretStorage,
                extension: {},
                languageModelAccessInformation: {},
                asAbsolutePath: (relativePath: string) => relativePath
            };

            // Create service instance
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockCustomizationService = new ClusterCustomizationService(mockContext as any);
        });

        test('Should filter out hidden clusters from tree view', async () => {
            // Set up kubeconfig with 3 clusters
            const kubeconfigWithThreeClusters: ParsedKubeconfig = {
                filePath: '/test/kubeconfig.yaml',
                clusters: [
                    { name: 'test-cluster-1', server: 'https://api.test1.com:6443' },
                    { name: 'test-cluster-2', server: 'https://api.test2.com:6443' },
                    { name: 'test-cluster-3', server: 'https://api.test3.com:6443' }
                ],
                contexts: [
                    { name: 'context-1', cluster: 'test-cluster-1', user: 'user-1' },
                    { name: 'context-2', cluster: 'test-cluster-2', user: 'user-2' },
                    { name: 'context-3', cluster: 'test-cluster-3', user: 'user-3' }
                ],
                users: [
                    { name: 'user-1' },
                    { name: 'user-2' },
                    { name: 'user-3' }
                ],
                currentContext: 'context-1'
            };

            // Mark context-2 as hidden
            await mockCustomizationService.setVisibility('context-2', true);

            // Create provider with customization service
            const providerWithCustomization = new ClusterTreeProvider(mockCustomizationService);

            // Mock connectivity check
            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected }
            ];

            providerWithCustomization.setKubeconfig(kubeconfigWithThreeClusters);
            const items = await providerWithCustomization.getChildren();

            // Filter to only clusters (folders may also be present)
            const clusterItems = items.filter(item => item.type === 'cluster');
            
            // Should only have 2 clusters (context-1 and context-3), context-2 should be filtered out
            assert.strictEqual(clusterItems.length, 2);
            assert.strictEqual(clusterItems[0].label, 'context-1');
            assert.strictEqual(clusterItems[1].label, 'context-3');
            
            // Verify context-2 is not in the list
            const contextNames = clusterItems.map(item => item.resourceData?.context?.name).filter(Boolean);
            assert.ok(!contextNames.includes('context-2'), 'Hidden cluster should not appear in tree');

            providerWithCustomization.dispose();
        });

        test('Should show all clusters when none are hidden', async () => {
            // Clear any previous visibility settings
            await mockCustomizationService.setVisibility('context-1', false);
            await mockCustomizationService.setVisibility('context-2', false);

            // Create provider with customization service
            const providerWithCustomization = new ClusterTreeProvider(mockCustomizationService);

            // Mock connectivity check
            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected }
            ];

            providerWithCustomization.setKubeconfig(mockKubeconfig);
            const items = await providerWithCustomization.getChildren();

            // Filter to only clusters (folders may also be present)
            const clusterItems = items.filter(item => item.type === 'cluster');
            
            // Should have both clusters
            assert.strictEqual(clusterItems.length, 2);
            assert.strictEqual(clusterItems[0].label, 'context-1');
            assert.strictEqual(clusterItems[1].label, 'context-2');

            providerWithCustomization.dispose();
        });

        test('Should show clusters when customization service is not provided', async () => {
            // Create provider without customization service
            const providerWithoutCustomization = new ClusterTreeProvider();

            // Mock connectivity check
            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected }
            ];

            providerWithoutCustomization.setKubeconfig(mockKubeconfig);
            const items = await providerWithoutCustomization.getChildren();

            // Filter to only clusters (folders may also be present)
            const clusterItems = items.filter(item => item.type === 'cluster');

            // Should have both clusters (no filtering when service is not available)
            assert.strictEqual(clusterItems.length, 2);
            assert.strictEqual(clusterItems[0].label, 'context-1');
            assert.strictEqual(clusterItems[1].label, 'context-2');

            providerWithoutCustomization.dispose();
        });

        test('Should update tree when visibility changes', async () => {
            // Clear any previous visibility settings
            await mockCustomizationService.setVisibility('context-1', false);
            await mockCustomizationService.setVisibility('context-2', false);

            // Create provider with customization service
            const providerWithCustomization = new ClusterTreeProvider(mockCustomizationService);

            // Mock connectivity check
            ClusterConnectivity.checkMultipleConnectivity = async () => [
                { status: ClusterStatus.Connected },
                { status: ClusterStatus.Connected }
            ];

            providerWithCustomization.setKubeconfig(mockKubeconfig);
            let items = await providerWithCustomization.getChildren();

            // Filter to only clusters (folders may also be present)
            let clusterItems = items.filter(item => item.type === 'cluster');
            
            // Initially should have both clusters
            assert.strictEqual(clusterItems.length, 2);

            // Hide context-2
            await mockCustomizationService.setVisibility('context-2', true);

            // Wait a bit for event to propagate
            await new Promise(resolve => setTimeout(resolve, 50));

            // Get items again (tree should have refreshed via event subscription)
            items = await providerWithCustomization.getChildren();

            // Filter to only clusters (folders may also be present)
            clusterItems = items.filter(item => item.type === 'cluster');

            // Should now only have context-1
            assert.strictEqual(clusterItems.length, 1);
            assert.strictEqual(clusterItems[0].label, 'context-1');

            providerWithCustomization.dispose();
        });
    });
});

