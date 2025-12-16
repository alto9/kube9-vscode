import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { ClusterCustomizationService, ClusterCustomizationConfig } from '../../../services/ClusterCustomizationService';

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
});

