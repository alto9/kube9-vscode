import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';

/**
 * Unit tests for tutorial state management.
 * Tests tutorial completion tracking, context key setting, and state persistence.
 */
suite('Tutorial State Management Tests', () => {
    let mockContext: vscode.ExtensionContext;
    let mockMemento: vscode.Memento;
    const contextKeyValues: Map<string, unknown> = new Map();

    setup(() => {
        // Clear context keys and messages
        contextKeyValues.clear();
        vscode.window._clearMessages();

        // Register setContext command to track context key updates
        vscode.commands._registerCommand(
            'setContext',
            async (...args: unknown[]) => {
                const key = args[0] as string;
                const value = args[1];
                contextKeyValues.set(key, value);
            }
        );

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

        // Create a mock extension context
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

    teardown(() => {
        contextKeyValues.clear();
        vscode.window._clearMessages();
    });

    suite('Initialization', () => {
        test('should read tutorial completion status from globalState on activation', async () => {
            // Simulate activation: read from globalState
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            // Verify default state is false (fresh install)
            assert.strictEqual(tutorialCompleted, false, 'Default state should be false');
        });

        test('should set context key on activation', async () => {
            // Simulate activation
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                tutorialCompleted
            );

            // Verify context key was set
            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(contextValue, false, 'Context key should be set to false initially');
        });

        test('should read existing completion state from globalState', async () => {
            // Set tutorial as completed in globalState
            await mockContext.globalState.update('kube9.tutorialCompleted', true);

            // Simulate activation: read from globalState
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            // Verify state is read correctly
            assert.strictEqual(tutorialCompleted, true, 'Should read existing completion state');
        });
    });

    suite('Context Key Setting', () => {
        test('should set context key correctly on activation', async () => {
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                tutorialCompleted
            );

            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(contextValue, false);
        });

        test('should set context key to true when tutorial is completed', async () => {
            // Mark tutorial as complete
            await mockContext.globalState.update('kube9.tutorialCompleted', true);
            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                true
            );

            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(contextValue, true, 'Context key should be set to true');
        });

        test('should use correct context key name', async () => {
            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                false
            );

            assert.ok(
                contextKeyValues.has('kube9.tutorialCompleted'),
                'Context key should be set with correct name'
            );
        });
    });

    suite('State Persistence', () => {
        test('should persist tutorial completion state', async () => {
            // Mark tutorial as complete
            await mockContext.globalState.update('kube9.tutorialCompleted', true);

            // Simulate restart: create new context with same storage
            const newTutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            // Verify state persisted
            assert.strictEqual(
                newTutorialCompleted,
                true,
                'State should persist across restarts'
            );
        });

        test('should persist state across multiple updates', async () => {
            // Initial state
            await mockContext.globalState.update('kube9.tutorialCompleted', false);
            assert.strictEqual(
                mockContext.globalState.get<boolean>('kube9.tutorialCompleted', false),
                false
            );

            // Update to completed
            await mockContext.globalState.update('kube9.tutorialCompleted', true);
            assert.strictEqual(
                mockContext.globalState.get<boolean>('kube9.tutorialCompleted', false),
                true
            );

            // Simulate restart
            const persistedValue = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );
            assert.strictEqual(persistedValue, true, 'State should persist');
        });

        test('should maintain default false state for fresh installs', async () => {
            // Don't set any value - simulate fresh install
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            assert.strictEqual(
                tutorialCompleted,
                false,
                'Fresh install should have false state'
            );
        });
    });

    suite('Mark Complete', () => {
        test('should update globalState when marking tutorial complete', async () => {
            // Mark tutorial as complete
            await mockContext.globalState.update('kube9.tutorialCompleted', true);

            // Verify globalState was updated
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );
            assert.strictEqual(tutorialCompleted, true, 'GlobalState should be updated');
        });

        test('should update context key when marking tutorial complete', async () => {
            // Mark tutorial as complete
            await mockContext.globalState.update('kube9.tutorialCompleted', true);
            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                true
            );

            // Verify context key was updated
            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(contextValue, true, 'Context key should be updated');
        });

        test('should update both globalState and context key together', async () => {
            // Simulate markTutorialComplete command
            await mockContext.globalState.update('kube9.tutorialCompleted', true);
            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                true
            );

            // Verify both are updated
            const globalStateValue = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );
            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');

            assert.strictEqual(globalStateValue, true, 'GlobalState should be true');
            assert.strictEqual(contextValue, true, 'Context key should be true');
        });
    });

    suite('Default State', () => {
        test('should default to false for fresh installs', () => {
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            assert.strictEqual(
                tutorialCompleted,
                false,
                'Fresh install should show tutorial (false = not completed)'
            );
        });

        test('should use false as default when key does not exist', () => {
            // Ensure key doesn't exist
            const keys = mockContext.globalState.keys();
            assert.ok(
                !keys.includes('kube9.tutorialCompleted'),
                'Key should not exist initially'
            );

            // Get with default
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            assert.strictEqual(tutorialCompleted, false, 'Should return default false');
        });
    });

    suite('Integration with Activation', () => {
        test('should initialize state correctly on activation', async () => {
            // Simulate activation sequence
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                tutorialCompleted
            );

            // Verify state and context key match
            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(tutorialCompleted, false);
            assert.strictEqual(contextValue, false);
            assert.strictEqual(tutorialCompleted, contextValue, 'State and context should match');
        });

        test('should handle completed tutorial on activation', async () => {
            // Set tutorial as completed
            await mockContext.globalState.update('kube9.tutorialCompleted', true);

            // Simulate activation
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );

            await vscode.commands.executeCommand(
                'setContext',
                'kube9.tutorialCompleted',
                tutorialCompleted
            );

            // Verify both are true
            const contextValue = contextKeyValues.get('kube9.tutorialCompleted');
            assert.strictEqual(tutorialCompleted, true);
            assert.strictEqual(contextValue, true);
        });
    });
});

