import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { PreferencesManager, PanelPreferences } from '../../../utils/PreferencesManager';

suite('PreferencesManager Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let mockMemento: vscode.Memento;

    setup(() => {
        // Create a mock memento (globalState)
        const storage = new Map<string, unknown>();
        mockMemento = {
            keys: () => Array.from(storage.keys()),
            get: <T>(key: string, defaultValue?: T): T => {
                return storage.has(key) ? (storage.get(key) as T) : (defaultValue as T);
            },
            update: async (key: string, value: unknown): Promise<void> => {
                storage.set(key, value);
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
    });

    test('Should initialize successfully with ExtensionContext', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        assert.ok(manager);
    });

    test('getPreferences should return defaults when no preferences exist', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        const prefs = manager.getPreferences('cluster1');
        
        assert.strictEqual(prefs.followMode, true);
        assert.strictEqual(prefs.showTimestamps, false);
        assert.strictEqual(prefs.lineLimit, 1000);
        assert.strictEqual(prefs.showPrevious, false);
    });

    test('getPreferences should return saved preferences for a cluster', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        const customPrefs: PanelPreferences = {
            followMode: false,
            showTimestamps: true,
            lineLimit: 500,
            showPrevious: true
        };
        
        await manager.savePreferences('cluster1', customPrefs);
        const retrievedPrefs = manager.getPreferences('cluster1');
        
        assert.strictEqual(retrievedPrefs.followMode, false);
        assert.strictEqual(retrievedPrefs.showTimestamps, true);
        assert.strictEqual(retrievedPrefs.lineLimit, 500);
        assert.strictEqual(retrievedPrefs.showPrevious, true);
    });

    test('savePreferences should persist preferences correctly', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        const customPrefs: PanelPreferences = {
            followMode: false,
            showTimestamps: true,
            lineLimit: 'all',
            showPrevious: false
        };
        
        await manager.savePreferences('cluster2', customPrefs);
        
        // Verify by reading directly from storage
        const allPrefs = mockMemento.get<Record<string, PanelPreferences>>('podLogsPreferences', {});
        assert.ok(allPrefs['cluster2']);
        assert.strictEqual(allPrefs['cluster2'].followMode, false);
        assert.strictEqual(allPrefs['cluster2'].showTimestamps, true);
        assert.strictEqual(allPrefs['cluster2'].lineLimit, 'all');
        assert.strictEqual(allPrefs['cluster2'].showPrevious, false);
    });

    test('Multiple clusters should maintain independent preferences', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        
        const cluster1Prefs: PanelPreferences = {
            followMode: false,
            showTimestamps: true,
            lineLimit: 500,
            showPrevious: false
        };
        
        const cluster2Prefs: PanelPreferences = {
            followMode: true,
            showTimestamps: false,
            lineLimit: 2000,
            showPrevious: true
        };
        
        await manager.savePreferences('cluster1', cluster1Prefs);
        await manager.savePreferences('cluster2', cluster2Prefs);
        
        const retrievedCluster1 = manager.getPreferences('cluster1');
        const retrievedCluster2 = manager.getPreferences('cluster2');
        
        // Verify cluster1 preferences
        assert.strictEqual(retrievedCluster1.followMode, false);
        assert.strictEqual(retrievedCluster1.showTimestamps, true);
        assert.strictEqual(retrievedCluster1.lineLimit, 500);
        assert.strictEqual(retrievedCluster1.showPrevious, false);
        
        // Verify cluster2 preferences
        assert.strictEqual(retrievedCluster2.followMode, true);
        assert.strictEqual(retrievedCluster2.showTimestamps, false);
        assert.strictEqual(retrievedCluster2.lineLimit, 2000);
        assert.strictEqual(retrievedCluster2.showPrevious, true);
    });

    test('getDefaults should return correct default values', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        const defaults = manager.getDefaults();
        
        assert.strictEqual(defaults.followMode, true);
        assert.strictEqual(defaults.showTimestamps, false);
        assert.strictEqual(defaults.lineLimit, 1000);
        assert.strictEqual(defaults.showPrevious, false);
    });

    test('getDefaults should return a new object each time', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        const defaults1 = manager.getDefaults();
        const defaults2 = manager.getDefaults();
        
        // Modify defaults1
        defaults1.followMode = false;
        
        // defaults2 should be unaffected
        assert.strictEqual(defaults2.followMode, true);
    });

    test('Preferences should persist across manager instances', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager1 = new PreferencesManager(mockContext as any);
        const customPrefs: PanelPreferences = {
            followMode: false,
            showTimestamps: true,
            lineLimit: 750,
            showPrevious: true
        };
        
        await manager1.savePreferences('cluster3', customPrefs);
        
        // Create a new manager instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager2 = new PreferencesManager(mockContext as any);
        const retrievedPrefs = manager2.getPreferences('cluster3');
        
        assert.strictEqual(retrievedPrefs.followMode, false);
        assert.strictEqual(retrievedPrefs.showTimestamps, true);
        assert.strictEqual(retrievedPrefs.lineLimit, 750);
        assert.strictEqual(retrievedPrefs.showPrevious, true);
    });

    test('Updating preferences should overwrite existing values', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new PreferencesManager(mockContext as any);
        
        const initialPrefs: PanelPreferences = {
            followMode: true,
            showTimestamps: false,
            lineLimit: 1000,
            showPrevious: false
        };
        
        await manager.savePreferences('cluster4', initialPrefs);
        
        const updatedPrefs: PanelPreferences = {
            followMode: false,
            showTimestamps: true,
            lineLimit: 'all',
            showPrevious: true
        };
        
        await manager.savePreferences('cluster4', updatedPrefs);
        const retrievedPrefs = manager.getPreferences('cluster4');
        
        assert.strictEqual(retrievedPrefs.followMode, false);
        assert.strictEqual(retrievedPrefs.showTimestamps, true);
        assert.strictEqual(retrievedPrefs.lineLimit, 'all');
        assert.strictEqual(retrievedPrefs.showPrevious, true);
    });
});

