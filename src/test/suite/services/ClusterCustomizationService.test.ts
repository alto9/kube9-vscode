import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { ClusterCustomizationService, ClusterCustomizationConfig, CustomizationChangeEvent } from '../../../services/ClusterCustomizationService';

suite('ClusterCustomizationService Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let mockMemento: vscode.Memento;
    let service: ClusterCustomizationService;
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
        service = new ClusterCustomizationService(mockContext as any);
    });

    test('getConfiguration should return default config when Global State is empty', async () => {
        const config = await service.getConfiguration();
        
        assert.strictEqual(config.version, '1.0');
        assert.deepStrictEqual(config.folders, []);
        assert.deepStrictEqual(config.clusters, {});
    });

    test('getConfiguration should return stored config when it exists', async () => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [
                {
                    id: 'folder-1',
                    name: 'Production',
                    parentId: null,
                    order: 0,
                    expanded: true
                }
            ],
            clusters: {
                'test-cluster': {
                    alias: 'Test Cluster',
                    hidden: false,
                    folderId: 'folder-1',
                    order: 0
                }
            }
        };

        // Store config directly in mock storage
        await mockMemento.update('kube9.clusterCustomizations', testConfig);

        const config = await service.getConfiguration();
        
        assert.strictEqual(config.version, testConfig.version);
        assert.strictEqual(config.folders.length, 1);
        assert.strictEqual(config.folders[0].id, 'folder-1');
        assert.strictEqual(config.folders[0].name, 'Production');
        assert.strictEqual(Object.keys(config.clusters).length, 1);
        assert.strictEqual(config.clusters['test-cluster'].alias, 'Test Cluster');
    });

    test('updateConfiguration should write config to Global State', async () => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [
                {
                    id: 'folder-1',
                    name: 'Development',
                    parentId: null,
                    order: 0,
                    expanded: false
                }
            ],
            clusters: {
                'dev-cluster': {
                    alias: null,
                    hidden: false,
                    folderId: 'folder-1',
                    order: 0
                }
            }
        };

        await service.updateConfiguration(testConfig);

        // Verify config was stored
        const storedConfig = mockMemento.get<ClusterCustomizationConfig>('kube9.clusterCustomizations');
        assert.ok(storedConfig);
        assert.strictEqual(storedConfig!.version, testConfig.version);
        assert.strictEqual(storedConfig!.folders.length, 1);
        assert.strictEqual(storedConfig!.folders[0].name, 'Development');
        assert.strictEqual(Object.keys(storedConfig!.clusters).length, 1);
    });

    test('updateConfiguration followed by getConfiguration should retrieve the same data', async () => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [
                {
                    id: 'folder-1',
                    name: 'Production',
                    parentId: null,
                    order: 0,
                    expanded: true
                },
                {
                    id: 'folder-2',
                    name: 'Staging',
                    parentId: null,
                    order: 1,
                    expanded: false
                }
            ],
            clusters: {
                'prod-cluster': {
                    alias: 'Production Cluster',
                    hidden: false,
                    folderId: 'folder-1',
                    order: 0
                },
                'staging-cluster': {
                    alias: null,
                    hidden: true,
                    folderId: 'folder-2',
                    order: 0
                }
            }
        };

        // Write config
        await service.updateConfiguration(testConfig);

        // Read config back
        const retrievedConfig = await service.getConfiguration();

        // Verify all data matches
        assert.strictEqual(retrievedConfig.version, testConfig.version);
        assert.strictEqual(retrievedConfig.folders.length, testConfig.folders.length);
        assert.strictEqual(retrievedConfig.folders[0].id, testConfig.folders[0].id);
        assert.strictEqual(retrievedConfig.folders[0].name, testConfig.folders[0].name);
        assert.strictEqual(retrievedConfig.folders[1].id, testConfig.folders[1].id);
        assert.strictEqual(retrievedConfig.folders[1].name, testConfig.folders[1].name);
        assert.strictEqual(Object.keys(retrievedConfig.clusters).length, Object.keys(testConfig.clusters).length);
        assert.strictEqual(retrievedConfig.clusters['prod-cluster'].alias, testConfig.clusters['prod-cluster'].alias);
        assert.strictEqual(retrievedConfig.clusters['staging-cluster'].hidden, testConfig.clusters['staging-cluster'].hidden);
    });

    test('getConfiguration should return default config after clearing storage', async () => {
        // First, store a config
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [{ id: 'folder-1', name: 'Test', parentId: null, order: 0, expanded: false }],
            clusters: {}
        };
        await service.updateConfiguration(testConfig);

        // Clear storage by removing the key (setting to undefined removes it)
        await mockMemento.update('kube9.clusterCustomizations', undefined);

        // Should return default config
        const config = await service.getConfiguration();
        assert.strictEqual(config.version, '1.0');
        assert.deepStrictEqual(config.folders, []);
        assert.deepStrictEqual(config.clusters, {});
    });

    test('updateConfiguration should fire onDidChangeCustomizations event after successful write', (done) => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [],
            clusters: {}
        };

        let eventFired = false;
        service.onDidChangeCustomizations((event: CustomizationChangeEvent) => {
            eventFired = true;
            assert.strictEqual(event.type, 'bulk');
            assert.strictEqual(event.operation, 'update');
            assert.ok(Array.isArray(event.affectedIds));
            done();
        });

        service.updateConfiguration(testConfig).then(() => {
            assert.strictEqual(eventFired, true);
        }).catch((err) => {
            done(err);
        });
    });

    test('onDidChangeCustomizations event should include correct payload structure', (done) => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [
                {
                    id: 'folder-1',
                    name: 'Production',
                    parentId: null,
                    order: 0,
                    expanded: true
                }
            ],
            clusters: {
                'test-cluster': {
                    alias: 'Test Cluster',
                    hidden: false,
                    folderId: 'folder-1',
                    order: 0
                }
            }
        };

        service.onDidChangeCustomizations((event: CustomizationChangeEvent) => {
            assert.strictEqual(event.type, 'bulk');
            assert.strictEqual(event.operation, 'update');
            assert.ok(Array.isArray(event.affectedIds));
            assert.strictEqual(event.affectedIds.length, 0); // Empty for bulk updates
            done();
        });

        service.updateConfiguration(testConfig).catch((err) => {
            done(err);
        });
    });

    test('multiple subscribers should receive the same event', (done) => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [],
            clusters: {}
        };

        let subscriber1Fired = false;
        let subscriber2Fired = false;

        service.onDidChangeCustomizations(() => {
            subscriber1Fired = true;
            if (subscriber1Fired && subscriber2Fired) {
                done();
            }
        });

        service.onDidChangeCustomizations(() => {
            subscriber2Fired = true;
            if (subscriber1Fired && subscriber2Fired) {
                done();
            }
        });

        service.updateConfiguration(testConfig).catch((err) => {
            done(err);
        });
    });

    test('event should not fire if updateConfiguration throws an error', (done) => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [],
            clusters: {}
        };

        let eventFired = false;
        service.onDidChangeCustomizations(() => {
            eventFired = true;
        });

        // Create a mock that throws an error
        const originalUpdate = mockMemento.update;
        mockMemento.update = async () => {
            throw new Error('Simulated write failure');
        };

        service.updateConfiguration(testConfig).catch(() => {
            // Restore original update function
            mockMemento.update = originalUpdate;
            // Event should not have fired
            assert.strictEqual(eventFired, false);
            done();
        });
    });

    test('dispose should clean up event emitter', () => {
        const testConfig: ClusterCustomizationConfig = {
            version: '1.0',
            folders: [],
            clusters: {}
        };

        let eventFired = false;
        const disposable = service.onDidChangeCustomizations(() => {
            eventFired = true;
        });

        // Dispose the service
        service.dispose();

        // Try to update configuration - event should not fire after dispose
        service.updateConfiguration(testConfig).then(() => {
            assert.strictEqual(eventFired, false);
        });

        // Also dispose the subscription
        disposable.dispose();
    });
});

