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
});

