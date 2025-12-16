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

    suite('setAlias', () => {
        test('setAlias should create cluster config if it doesn\'t exist', async () => {
            const contextName = 'new-cluster';
            
            await service.setAlias(contextName, 'My Cluster');
            
            const config = await service.getConfiguration();
            assert.ok(config.clusters[contextName]);
            assert.strictEqual(config.clusters[contextName].alias, 'My Cluster');
            assert.strictEqual(config.clusters[contextName].hidden, false);
            assert.strictEqual(config.clusters[contextName].folderId, null);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('setAlias should set alias for existing cluster', async () => {
            const contextName = 'existing-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Old Alias',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setAlias(contextName, 'New Alias');
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, 'New Alias');
        });

        test('setAlias should trim whitespace from alias', async () => {
            const contextName = 'trim-test-cluster';
            
            await service.setAlias(contextName, '  Trimmed Alias  ');
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, 'Trimmed Alias');
        });

        test('setAlias should remove alias when set to null', async () => {
            const contextName = 'remove-alias-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Existing Alias',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setAlias(contextName, null);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, null);
        });

        test('setAlias should remove alias when set to empty string', async () => {
            const contextName = 'empty-string-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Existing Alias',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setAlias(contextName, '');
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, null);
        });

        test('setAlias should remove alias when set to whitespace only', async () => {
            const contextName = 'whitespace-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Existing Alias',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setAlias(contextName, '   ');
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, null);
        });

        test('setAlias should throw error when alias exceeds 100 characters', async () => {
            const contextName = 'long-alias-cluster';
            const longAlias = 'a'.repeat(101);
            
            try {
                await service.setAlias(contextName, longAlias);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Alias must be 100 characters or less');
            }
        });

        test('setAlias should emit customization change event', (done) => {
            const contextName = 'event-test-cluster';
            
            service.onDidChangeCustomizations(() => {
                done();
            });
            
            service.setAlias(contextName, 'Test Alias').catch((err) => {
                done(err);
            });
        });

        test('setAlias should persist alias to Global State', async () => {
            const contextName = 'persist-test-cluster';
            const alias = 'Persisted Alias';
            
            await service.setAlias(contextName, alias);
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, alias);
        });

        test('setAlias should preserve other cluster config fields', async () => {
            const contextName = 'preserve-fields-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Old Alias',
                        hidden: true,
                        folderId: 'folder-1',
                        order: 5
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setAlias(contextName, 'New Alias');
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, 'New Alias');
            assert.strictEqual(config.clusters[contextName].hidden, true);
            assert.strictEqual(config.clusters[contextName].folderId, 'folder-1');
            assert.strictEqual(config.clusters[contextName].order, 5);
        });

        test('setAlias should accept alias exactly 100 characters', async () => {
            const contextName = 'max-length-cluster';
            const maxLengthAlias = 'a'.repeat(100);
            
            await service.setAlias(contextName, maxLengthAlias);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, maxLengthAlias);
            assert.strictEqual(config.clusters[contextName].alias!.length, 100);
        });
    });

    suite('setVisibility', () => {
        test('setVisibility should create cluster config if it doesn\'t exist with hidden=true', async () => {
            const contextName = 'new-cluster-hidden';
            
            await service.setVisibility(contextName, true);
            
            const config = await service.getConfiguration();
            assert.ok(config.clusters[contextName]);
            assert.strictEqual(config.clusters[contextName].hidden, true);
            assert.strictEqual(config.clusters[contextName].alias, null);
            assert.strictEqual(config.clusters[contextName].folderId, null);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('setVisibility should create cluster config if it doesn\'t exist with hidden=false', async () => {
            const contextName = 'new-cluster-visible';
            
            await service.setVisibility(contextName, false);
            
            const config = await service.getConfiguration();
            assert.ok(config.clusters[contextName]);
            assert.strictEqual(config.clusters[contextName].hidden, false);
            assert.strictEqual(config.clusters[contextName].alias, null);
            assert.strictEqual(config.clusters[contextName].folderId, null);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('setVisibility should set hidden for existing cluster from visible to hidden', async () => {
            const contextName = 'existing-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Existing Cluster',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setVisibility(contextName, true);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, true);
        });

        test('setVisibility should set hidden for existing cluster from hidden to visible', async () => {
            const contextName = 'hidden-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Hidden Cluster',
                        hidden: true,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setVisibility(contextName, false);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, false);
        });

        test('setVisibility should emit customization change event', (done) => {
            const contextName = 'event-test-cluster';
            
            service.onDidChangeCustomizations(() => {
                done();
            });
            
            service.setVisibility(contextName, true).catch((err) => {
                done(err);
            });
        });

        test('setVisibility should persist visibility to Global State', async () => {
            const contextName = 'persist-test-cluster';
            const hidden = true;
            
            await service.setVisibility(contextName, hidden);
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, hidden);
        });

        test('setVisibility should preserve other cluster config fields', async () => {
            const contextName = 'preserve-fields-cluster';
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [],
                clusters: {
                    [contextName]: {
                        alias: 'Test Alias',
                        hidden: false,
                        folderId: 'folder-1',
                        order: 5
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.setVisibility(contextName, true);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, true);
            assert.strictEqual(config.clusters[contextName].alias, 'Test Alias');
            assert.strictEqual(config.clusters[contextName].folderId, 'folder-1');
            assert.strictEqual(config.clusters[contextName].order, 5);
        });

        test('setVisibility should handle multiple visibility changes', async () => {
            const contextName = 'toggle-cluster';
            
            // Initially visible
            await service.setVisibility(contextName, false);
            let config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, false);
            
            // Hide it
            await service.setVisibility(contextName, true);
            config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, true);
            
            // Show it again
            await service.setVisibility(contextName, false);
            config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, false);
            
            // Hide it again
            await service.setVisibility(contextName, true);
            config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].hidden, true);
        });
    });

    suite('moveCluster', () => {
        test('moveCluster should create cluster config if it doesn\'t exist', async () => {
            const contextName = 'move-new-cluster';
            const folder = await service.createFolder('Move Test Folder', null);
            
            await service.moveCluster(contextName, folder.id, 0);
            
            const config = await service.getConfiguration();
            assert.ok(config.clusters[contextName]);
            assert.strictEqual(config.clusters[contextName].folderId, folder.id);
            assert.strictEqual(config.clusters[contextName].order, 0);
            assert.strictEqual(config.clusters[contextName].alias, null);
            assert.strictEqual(config.clusters[contextName].hidden, false);
        });

        test('moveCluster should update folderId and order for existing cluster', async () => {
            const contextName = 'existing-cluster';
            const folder1 = await service.createFolder('Folder 1', null);
            const folder2 = await service.createFolder('Folder 2', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder1, folder2],
                clusters: {
                    [contextName]: {
                        alias: 'Existing Cluster',
                        hidden: false,
                        folderId: folder1.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.moveCluster(contextName, folder2.id, 1);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].folderId, folder2.id);
            assert.strictEqual(config.clusters[contextName].order, 1);
            assert.strictEqual(config.clusters[contextName].alias, 'Existing Cluster');
            assert.strictEqual(config.clusters[contextName].hidden, false);
        });

        test('moveCluster should move cluster to root (folderId: null)', async () => {
            const contextName = 'move-root-cluster';
            const folder = await service.createFolder('Move Root Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    [contextName]: {
                        alias: 'Root Cluster',
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.moveCluster(contextName, null, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].folderId, null);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('moveCluster should throw error when folder doesn\'t exist', async () => {
            const contextName = 'test-cluster';
            
            try {
                await service.moveCluster(contextName, 'non-existent-folder-id', 0);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder non-existent-folder-id not found');
            }
        });

        test('moveCluster should handle null folderId (root level)', async () => {
            const contextName = 'root-level-cluster';
            
            await service.moveCluster(contextName, null, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].folderId, null);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('moveCluster should reorder clusters when moving forward within same folder', async () => {
            const folder = await service.createFolder('Reorder Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    },
                    'cluster-3': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 2
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move cluster-3 from position 2 to position 0
            await service.moveCluster('cluster-3', folder.id, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters['cluster-3'].order, 0);
            assert.strictEqual(config.clusters['cluster-1'].order, 1);
            assert.strictEqual(config.clusters['cluster-2'].order, 2);
        });

        test('moveCluster should reorder clusters when moving backward within same folder', async () => {
            const folder = await service.createFolder('Reorder Backward Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    },
                    'cluster-3': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 2
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move cluster-1 from position 0 to position 2
            await service.moveCluster('cluster-1', folder.id, 2);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters['cluster-2'].order, 0);
            assert.strictEqual(config.clusters['cluster-3'].order, 1);
            assert.strictEqual(config.clusters['cluster-1'].order, 2);
        });

        test('moveCluster should shift clusters in both folders when moving to different folder', async () => {
            const folder1 = await service.createFolder('Move Shift Folder 1', null);
            const folder2 = await service.createFolder('Move Shift Folder 2', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder1, folder2],
                clusters: {
                    'cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: folder1.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: folder1.id,
                        order: 1
                    },
                    'cluster-3': {
                        alias: null,
                        hidden: false,
                        folderId: folder2.id,
                        order: 0
                    },
                    'cluster-4': {
                        alias: null,
                        hidden: false,
                        folderId: folder2.id,
                        order: 1
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move cluster-2 from folder1 (order 1) to folder2 (order 0)
            await service.moveCluster('cluster-2', folder2.id, 0);
            
            const config = await service.getConfiguration();
            // cluster-2 should be in folder2 at order 0
            assert.strictEqual(config.clusters['cluster-2'].folderId, folder2.id);
            assert.strictEqual(config.clusters['cluster-2'].order, 0);
            // cluster-1 should remain at order 0 in folder1 (no shift needed)
            assert.strictEqual(config.clusters['cluster-1'].folderId, folder1.id);
            assert.strictEqual(config.clusters['cluster-1'].order, 0);
            // cluster-3 and cluster-4 in folder2 should shift up
            assert.strictEqual(config.clusters['cluster-3'].order, 1);
            assert.strictEqual(config.clusters['cluster-4'].order, 2);
        });

        test('moveCluster should shift clusters when moving from folder to root', async () => {
            const folder = await service.createFolder('To Root Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    },
                    'root-cluster': {
                        alias: null,
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move cluster-2 from folder to root at order 0
            await service.moveCluster('cluster-2', null, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters['cluster-2'].folderId, null);
            assert.strictEqual(config.clusters['cluster-2'].order, 0);
            // cluster-1 should remain at order 0 in folder (no shift needed)
            assert.strictEqual(config.clusters['cluster-1'].folderId, folder.id);
            assert.strictEqual(config.clusters['cluster-1'].order, 0);
            // root-cluster should shift up
            assert.strictEqual(config.clusters['root-cluster'].order, 1);
        });

        test('moveCluster should shift clusters when moving from root to folder', async () => {
            const folder = await service.createFolder('From Root Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'root-cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: null,
                        order: 0
                    },
                    'root-cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: null,
                        order: 1
                    },
                    'folder-cluster': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move root-cluster-2 from root to folder at order 0
            await service.moveCluster('root-cluster-2', folder.id, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters['root-cluster-2'].folderId, folder.id);
            assert.strictEqual(config.clusters['root-cluster-2'].order, 0);
            // root-cluster-1 should remain at order 0 (no shift needed)
            assert.strictEqual(config.clusters['root-cluster-1'].folderId, null);
            assert.strictEqual(config.clusters['root-cluster-1'].order, 0);
            // folder-cluster should shift up
            assert.strictEqual(config.clusters['folder-cluster'].order, 1);
        });

        test('moveCluster should emit customization change event', async () => {
            const contextName = 'event-test-cluster';
            const folder = await service.createFolder('Event Test Folder', null);
            
            return new Promise<void>((resolve, reject) => {
                service.onDidChangeCustomizations(() => {
                    resolve();
                });
                
                service.moveCluster(contextName, folder.id, 0).catch((err) => {
                    reject(err);
                });
            });
        });

        test('moveCluster should persist changes to Global State', async () => {
            const contextName = 'persist-test-cluster';
            const folder = await service.createFolder('Persist Folder', null);
            
            await service.moveCluster(contextName, folder.id, 0);
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            assert.strictEqual(config.clusters[contextName].folderId, folder.id);
            assert.strictEqual(config.clusters[contextName].order, 0);
        });

        test('moveCluster should preserve alias and hidden fields when moving', async () => {
            const contextName = 'preserve-fields-cluster';
            const folder1 = await service.createFolder('Preserve Folder 1', null);
            const folder2 = await service.createFolder('Preserve Folder 2', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder1, folder2],
                clusters: {
                    [contextName]: {
                        alias: 'Preserved Alias',
                        hidden: true,
                        folderId: folder1.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.moveCluster(contextName, folder2.id, 1);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters[contextName].alias, 'Preserved Alias');
            assert.strictEqual(config.clusters[contextName].hidden, true);
            assert.strictEqual(config.clusters[contextName].folderId, folder2.id);
            assert.strictEqual(config.clusters[contextName].order, 1);
        });

        test('moveCluster should handle no-op when order unchanged in same folder', async () => {
            const folder = await service.createFolder('No Op Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: null,
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Move cluster-1 to same position (no-op)
            await service.moveCluster('cluster-1', folder.id, 0);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.clusters['cluster-1'].order, 0);
            assert.strictEqual(config.clusters['cluster-2'].order, 1);
        });
    });

    suite('createFolder', () => {
        test('createFolder should create folder at root level with unique name', async () => {
            const folder = await service.createFolder('Production', null);
            
            assert.ok(folder);
            assert.strictEqual(folder.name, 'Production');
            assert.strictEqual(folder.parentId, null);
            assert.strictEqual(folder.order, 0);
            assert.strictEqual(folder.expanded, false);
            assert.ok(folder.id); // UUID should be generated
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.folders.length, 1);
            assert.strictEqual(config.folders[0].id, folder.id);
        });

        test('createFolder should create folder with parentId', async () => {
            // Create parent folder first
            const parentFolder = await service.createFolder('AWS', null);
            
            // Create child folder
            const childFolder = await service.createFolder('Production', parentFolder.id);
            
            assert.strictEqual(childFolder.parentId, parentFolder.id);
            assert.strictEqual(childFolder.name, 'Production');
            assert.strictEqual(childFolder.order, 0);
            
            const config = await service.getConfiguration();
            // Verify both folders exist
            assert.ok(config.folders.find(f => f.id === parentFolder.id));
            assert.ok(config.folders.find(f => f.id === childFolder.id));
        });

        test('createFolder should generate UUID v4 for folder ID', async () => {
            const folder = await service.createFolder('Test', null);
            
            // UUID v4 format: 8-4-4-4-12 hexadecimal characters
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            assert.ok(uuidRegex.test(folder.id), 'Folder ID should be a valid UUID v4');
        });

        test('createFolder should calculate correct order value', async () => {
            // Create first folder
            const folder1 = await service.createFolder('Order Folder 1', null);
            const initialOrder = folder1.order;
            
            // Create second folder
            const folder2 = await service.createFolder('Order Folder 2', null);
            assert.strictEqual(folder2.order, initialOrder + 1);
            
            // Create third folder
            const folder3 = await service.createFolder('Order Folder 3', null);
            assert.strictEqual(folder3.order, initialOrder + 2);
        });

        test('createFolder should set expanded to false by default', async () => {
            const folder = await service.createFolder('Expanded Test Folder', null);
            assert.strictEqual(folder.expanded, false);
        });

        test('createFolder should throw error for empty name', async () => {
            try {
                await service.createFolder('', null);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder name cannot be empty');
            }
        });

        test('createFolder should throw error for whitespace-only name', async () => {
            try {
                await service.createFolder('   ', null);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder name cannot be empty');
            }
        });

        test('createFolder should throw error for duplicate name within same parent', async () => {
            await service.createFolder('Duplicate Test Production', null);
            
            try {
                await service.createFolder('Duplicate Test Production', null);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'A folder with this name already exists');
            }
        });

        test('createFolder should allow duplicate names in different parents', async () => {
            const parent1 = await service.createFolder('Duplicate Parent AWS', null);
            const parent2 = await service.createFolder('Duplicate Parent Azure', null);
            
            // Should be able to create "Production" under both parents
            const prod1 = await service.createFolder('Duplicate Production', parent1.id);
            const prod2 = await service.createFolder('Duplicate Production', parent2.id);
            
            assert.strictEqual(prod1.name, 'Duplicate Production');
            assert.strictEqual(prod2.name, 'Duplicate Production');
            assert.strictEqual(prod1.parentId, parent1.id);
            assert.strictEqual(prod2.parentId, parent2.id);
        });

        test('createFolder should throw error when exceeding max nesting depth', async () => {
            // Create 5 levels of nesting (root = level 0, so 5 folders = level 5)
            let currentParent: string | null = null;
            for (let i = 0; i < 5; i++) {
                const folder = await service.createFolder(`Level ${i}`, currentParent);
                currentParent = folder.id;
            }
            
            // Attempting to create at 6th level should fail
            try {
                await service.createFolder('Level 6', currentParent);
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Maximum folder depth reached (5 levels)');
            }
        });

        test('createFolder should emit customization change event', (done) => {
            service.onDidChangeCustomizations((event: CustomizationChangeEvent) => {
                assert.strictEqual(event.type, 'folder');
                assert.strictEqual(event.operation, 'create');
                assert.ok(Array.isArray(event.affectedIds));
                assert.strictEqual(event.affectedIds.length, 1);
                done();
            });
            
            service.createFolder('Event Emit Test', null).catch((err) => {
                done(err);
            });
        });

        test('createFolder should persist folder to Global State', async () => {
            const folder = await service.createFolder('Persisted Folder', null);
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            
            const persistedFolder = config.folders.find(f => f.id === folder.id);
            assert.ok(persistedFolder);
            assert.strictEqual(persistedFolder!.name, 'Persisted Folder');
        });

        test('createFolder should return created FolderConfig', async () => {
            const folder = await service.createFolder('Return Test Folder', null);
            
            assert.ok(folder);
            assert.strictEqual(typeof folder.id, 'string');
            assert.strictEqual(folder.name, 'Test Folder');
            assert.strictEqual(folder.parentId, null);
            assert.strictEqual(typeof folder.order, 'number');
            assert.strictEqual(typeof folder.expanded, 'boolean');
        });

        test('createFolder should trim whitespace from name', async () => {
            const folder = await service.createFolder('  Trimmed Name  ', null);
            assert.strictEqual(folder.name, 'Trimmed Name');
        });
    });

    suite('renameFolder', () => {
        test('renameFolder should rename existing folder', async () => {
            const folder = await service.createFolder('Old Name', null);
            
            await service.renameFolder(folder.id, 'New Name');
            
            const config = await service.getConfiguration();
            const renamedFolder = config.folders.find(f => f.id === folder.id);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.name, 'New Name');
        });

        test('renameFolder should validate folder exists', async () => {
            try {
                await service.renameFolder('non-existent-id', 'New Name');
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder not found');
            }
        });

        test('renameFolder should validate new name is non-empty', async () => {
            const folder = await service.createFolder('Rename Empty Test', null);
            
            try {
                await service.renameFolder(folder.id, '');
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder name cannot be empty');
            }
        });

        test('renameFolder should validate new name is unique within parent', async () => {
            await service.createFolder('Folder 1', null);
            const folder2 = await service.createFolder('Folder 2', null);
            
            try {
                await service.renameFolder(folder2.id, 'Folder 1');
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'A folder with this name already exists');
            }
        });

        test('renameFolder should allow rename to same name', async () => {
            const folder = await service.createFolder('Same Name', null);
            
            // Should not throw error
            await service.renameFolder(folder.id, 'Same Name');
            
            const config = await service.getConfiguration();
            const renamedFolder = config.folders.find(f => f.id === folder.id);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.name, 'Same Name');
        });

        test('renameFolder should allow rename if name unique in different parent', async () => {
            const parent1 = await service.createFolder('Rename Unique AWS', null);
            const parent2 = await service.createFolder('Rename Unique Azure', null);
            await service.createFolder('Rename Unique Production', parent1.id);
            const folder2 = await service.createFolder('Rename Unique Staging', parent2.id);
            
            // Should be able to rename folder2 to "Production" since it's in different parent
            await service.renameFolder(folder2.id, 'Rename Unique Production');
            
            const config = await service.getConfiguration();
            const renamedFolder = config.folders.find(f => f.id === folder2.id);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.name, 'Production');
        });

        test('renameFolder should emit customization change event', (done) => {
            service.createFolder('Rename Event Test', null).then((folder) => {
                service.onDidChangeCustomizations((event: CustomizationChangeEvent) => {
                    // updateConfiguration emits 'bulk' event first, then renameFolder emits 'folder' event
                    // We want to check the 'folder' event
                    if (event.type === 'folder') {
                        assert.strictEqual(event.type, 'folder');
                        assert.strictEqual(event.operation, 'update');
                        assert.ok(Array.isArray(event.affectedIds));
                        assert.strictEqual(event.affectedIds.length, 1);
                        assert.strictEqual(event.affectedIds[0], folder.id);
                        done();
                    }
                });
                
                service.renameFolder(folder.id, 'Renamed').catch((err) => {
                    done(err);
                });
            }).catch((err) => {
                done(err);
            });
        });

        test('renameFolder should persist rename to Global State', async () => {
            const folder = await service.createFolder('Original Name', null);
            await service.renameFolder(folder.id, 'Renamed');
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            
            const renamedFolder = config.folders.find(f => f.id === folder.id);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.name, 'Renamed');
        });

        test('renameFolder should preserve other folder properties', async () => {
            const folder = await service.createFolder('Rename Preserve Test', null);
            const originalId = folder.id;
            const originalParentId = folder.parentId;
            const originalOrder = folder.order;
            const originalExpanded = folder.expanded;
            
            await service.renameFolder(folder.id, 'Renamed');
            
            const config = await service.getConfiguration();
            const renamedFolder = config.folders.find(f => f.id === originalId);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.id, originalId);
            assert.strictEqual(renamedFolder!.parentId, originalParentId);
            assert.strictEqual(renamedFolder!.order, originalOrder);
            assert.strictEqual(renamedFolder!.expanded, originalExpanded);
        });

        test('renameFolder should trim whitespace from new name', async () => {
            const folder = await service.createFolder('Rename Trim Test', null);
            
            await service.renameFolder(folder.id, '  Trimmed Name  ');
            
            const config = await service.getConfiguration();
            const renamedFolder = config.folders.find(f => f.id === folder.id);
            assert.ok(renamedFolder);
            assert.strictEqual(renamedFolder!.name, 'Trimmed Name');
        });
    });

    suite('deleteFolder', () => {
        test('deleteFolder should delete empty folder', async () => {
            const folder = await service.createFolder('Empty Folder', null);
            
            await service.deleteFolder(folder.id);
            
            const config = await service.getConfiguration();
            const deletedFolder = config.folders.find(f => f.id === folder.id);
            assert.strictEqual(deletedFolder, undefined);
        });

        test('deleteFolder should move clusters to root when moveToRoot is true', async () => {
            const folder = await service.createFolder('Move To Root Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: 'Cluster 2',
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.deleteFolder(folder.id, true);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.folders.length, 0);
            assert.strictEqual(config.clusters['cluster-1'].folderId, null);
            assert.strictEqual(config.clusters['cluster-2'].folderId, null);
            assert.strictEqual(config.clusters['cluster-1'].alias, 'Cluster 1');
            assert.strictEqual(config.clusters['cluster-2'].alias, 'Cluster 2');
        });

        test('deleteFolder should remove cluster configs when moveToRoot is false', async () => {
            const folder = await service.createFolder('Remove Configs Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: 'Cluster 2',
                        hidden: false,
                        folderId: folder.id,
                        order: 1
                    },
                    'cluster-3': {
                        alias: 'Cluster 3',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.deleteFolder(folder.id, false);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.folders.length, 0);
            assert.strictEqual(config.clusters['cluster-1'], undefined);
            assert.strictEqual(config.clusters['cluster-2'], undefined);
            // Cluster not in folder should be preserved
            assert.ok(config.clusters['cluster-3']);
        });

        test('deleteFolder should delete folder recursively', async () => {
            const parent = await service.createFolder('Recursive Parent', null);
            const child1 = await service.createFolder('Recursive Child 1', parent.id);
            const child2 = await service.createFolder('Recursive Child 2', parent.id);
            const grandchild = await service.createFolder('Recursive Grandchild', child1.id);
            
            await service.deleteFolder(parent.id);
            
            const config = await service.getConfiguration();
            // Check that all specific folders are deleted
            assert.strictEqual(config.folders.find(f => f.id === parent.id), undefined);
            assert.strictEqual(config.folders.find(f => f.id === child1.id), undefined);
            assert.strictEqual(config.folders.find(f => f.id === child2.id), undefined);
            assert.strictEqual(config.folders.find(f => f.id === grandchild.id), undefined);
        });

        test('deleteFolder should move clusters from nested folders to root when moveToRoot is true', async () => {
            const parent = await service.createFolder('Nested Move Parent', null);
            const child = await service.createFolder('Nested Move Child', parent.id);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [parent, child],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: parent.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: 'Cluster 2',
                        hidden: false,
                        folderId: child.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.deleteFolder(parent.id, true);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.folders.length, 0);
            assert.strictEqual(config.clusters['cluster-1'].folderId, null);
            assert.strictEqual(config.clusters['cluster-2'].folderId, null);
        });

        test('deleteFolder should remove clusters from nested folders when moveToRoot is false', async () => {
            const parent = await service.createFolder('Nested Remove Parent', null);
            const child = await service.createFolder('Nested Remove Child', parent.id);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [parent, child],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: parent.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: 'Cluster 2',
                        hidden: false,
                        folderId: child.id,
                        order: 0
                    },
                    'cluster-3': {
                        alias: 'Cluster 3',
                        hidden: false,
                        folderId: null,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.deleteFolder(parent.id, false);
            
            const config = await service.getConfiguration();
            assert.strictEqual(config.folders.length, 0);
            assert.strictEqual(config.clusters['cluster-1'], undefined);
            assert.strictEqual(config.clusters['cluster-2'], undefined);
            // Cluster not in deleted folder tree should be preserved
            assert.ok(config.clusters['cluster-3']);
        });

        test('deleteFolder should throw error if folder not found', async () => {
            try {
                await service.deleteFolder('non-existent-id');
                assert.fail('Expected error to be thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Folder not found');
            }
        });

        test('deleteFolder should emit customization change event with all affected folder IDs', (done) => {
            service.createFolder('Event Parent', null).then((parent) => {
                service.createFolder('Event Child', parent.id).then((child) => {
                    service.onDidChangeCustomizations((event: CustomizationChangeEvent) => {
                        // updateConfiguration emits 'bulk' event first, then deleteFolder emits 'folder' event
                        // We want to check the 'folder' event
                        if (event.type === 'folder') {
                            assert.strictEqual(event.type, 'folder');
                            assert.strictEqual(event.operation, 'delete');
                            assert.ok(Array.isArray(event.affectedIds));
                            assert.ok(event.affectedIds.length >= 2);
                            assert.ok(event.affectedIds.includes(parent.id));
                            assert.ok(event.affectedIds.includes(child.id));
                            done();
                        }
                    });
                    
                    service.deleteFolder(parent.id).catch((err) => {
                        done(err);
                    });
                }).catch((err) => {
                    done(err);
                });
            }).catch((err) => {
                done(err);
            });
        });

        test('deleteFolder should persist deletion to Global State', async () => {
            const folder = await service.createFolder('To Delete', null);
            await service.deleteFolder(folder.id);
            
            // Create a new service instance to verify persistence
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newService = new ClusterCustomizationService(mockContext as any);
            const config = await newService.getConfiguration();
            
            const deletedFolder = config.folders.find(f => f.id === folder.id);
            assert.strictEqual(deletedFolder, undefined);
        });

        test('deleteFolder should preserve clusters not in deleted folder', async () => {
            const folder1 = await service.createFolder('Preserve Folder 1', null);
            const folder2 = await service.createFolder('Preserve Folder 2', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder1, folder2],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: folder1.id,
                        order: 0
                    },
                    'cluster-2': {
                        alias: 'Cluster 2',
                        hidden: false,
                        folderId: folder2.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            await service.deleteFolder(folder1.id, true);
            
            const config = await service.getConfiguration();
            // Folder 2 should still exist
            assert.ok(config.folders.find(f => f.id === folder2.id));
            // Cluster 2 should still be in Folder 2
            assert.strictEqual(config.clusters['cluster-2'].folderId, folder2.id);
            // Cluster 1 should be moved to root
            assert.strictEqual(config.clusters['cluster-1'].folderId, null);
        });

        test('deleteFolder should use moveToRoot=true as default', async () => {
            const folder = await service.createFolder('Default Move Folder', null);
            const initialConfig: ClusterCustomizationConfig = {
                version: '1.0',
                folders: [folder],
                clusters: {
                    'cluster-1': {
                        alias: 'Cluster 1',
                        hidden: false,
                        folderId: folder.id,
                        order: 0
                    }
                }
            };
            await service.updateConfiguration(initialConfig);
            
            // Call without moveToRoot parameter (should default to true)
            await service.deleteFolder(folder.id);
            
            const config = await service.getConfiguration();
            // Cluster should be moved to root, not deleted
            assert.ok(config.clusters['cluster-1']);
            assert.strictEqual(config.clusters['cluster-1'].folderId, null);
        });
    });
});

