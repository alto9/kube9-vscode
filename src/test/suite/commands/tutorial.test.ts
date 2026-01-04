import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';

/**
 * Unit tests for tutorial-related commands.
 * Tests command registration, execution, and expected VS Code API interactions.
 */
suite('Tutorial Command Tests', () => {
    let mockContext: vscode.ExtensionContext;
    let mockMemento: vscode.Memento;
    let commandDisposables: Array<{ dispose(): void }> = [];

    setup(() => {
        // Clear command handlers and messages
        vscode.commands._unregisterCommand('kube9.showTutorial');
        vscode.commands._unregisterCommand('kube9.internal.completeStep3');
        vscode.commands._unregisterCommand('kube9.internal.completeStep4');
        vscode.commands._unregisterCommand('kube9.internal.markTutorialComplete');
        vscode.window._clearMessages();
        commandDisposables = [];

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
        // Clean up registered commands
        commandDisposables.forEach(disposable => disposable.dispose());
        commandDisposables = [];
        vscode.window._clearMessages();
    });

    suite('kube9.showTutorial command', () => {
        test('should register and execute showTutorial command', async () => {
            // Register the workbench command that showTutorial calls
            let walkthroughOpened = false;
            vscode.commands._registerCommand(
                'workbench.action.openWalkthrough',
                async () => {
                    walkthroughOpened = true;
                }
            );

            // Register the command
            const showTutorialCommand = vscode.commands.registerCommand(
                'kube9.showTutorial',
                async () => {
                    await vscode.commands.executeCommand(
                        'workbench.action.openWalkthrough',
                        'Alto9.kube9-vscode#kube9.gettingStarted',
                        false
                    );
                }
            );
            commandDisposables.push(showTutorialCommand);

            // Execute the command
            await vscode.commands.executeCommand('kube9.showTutorial');

            // Verify the walkthrough command was called
            assert.strictEqual(walkthroughOpened, true, 'Walkthrough should be opened');
        });

        test('should handle errors gracefully', async () => {
            // Register a command that throws an error
            const showTutorialCommand = vscode.commands.registerCommand(
                'kube9.showTutorial',
                async () => {
                    throw new Error('Walkthrough not found');
                }
            );
            commandDisposables.push(showTutorialCommand);

            // Execute and expect error
            try {
                await vscode.commands.executeCommand('kube9.showTutorial');
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.ok(error instanceof Error, 'Error should be an Error instance');
                assert.ok(error.message.includes('Walkthrough not found'), 'Error message should match');
            }
        });
    });

    suite('kube9.internal.completeStep3 command', () => {
        test('should register and execute completeStep3 command', async () => {
            // Track if completion event was fired
            let completionEventFired = false;
            vscode.commands._registerCommand(
                'workbench.action.fireWalkthroughCompletionEvent',
                async (...args: unknown[]) => {
                    const eventName = args[0] as string;
                    if (eventName === 'kube9.onNamespaceExpanded') {
                        completionEventFired = true;
                    }
                }
            );

            // Register the command
            const completeStep3 = vscode.commands.registerCommand(
                'kube9.internal.completeStep3',
                async () => {
                    await vscode.commands.executeCommand(
                        'workbench.action.fireWalkthroughCompletionEvent',
                        'kube9.onNamespaceExpanded'
                    );
                    vscode.window.showInformationMessage(
                        'Great! When you connect a cluster, you can expand namespaces to explore resources.'
                    );
                }
            );
            commandDisposables.push(completeStep3);

            // Execute the command
            await vscode.commands.executeCommand('kube9.internal.completeStep3');

            // Verify completion event was fired
            assert.strictEqual(completionEventFired, true, 'Completion event should be fired');

            // Verify informational message was shown
            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1, 'Should show one informational message');
            assert.ok(
                infoMessages[0].includes('connect a cluster'),
                'Message should mention connecting a cluster'
            );
        });

        test('should show correct message to user', async () => {
            const completeStep3 = vscode.commands.registerCommand(
                'kube9.internal.completeStep3',
                async () => {
                    await vscode.commands.executeCommand(
                        'workbench.action.fireWalkthroughCompletionEvent',
                        'kube9.onNamespaceExpanded'
                    );
                    vscode.window.showInformationMessage(
                        'Great! When you connect a cluster, you can expand namespaces to explore resources.'
                    );
                }
            );
            commandDisposables.push(completeStep3);

            await vscode.commands.executeCommand('kube9.internal.completeStep3');

            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1);
            assert.strictEqual(
                infoMessages[0],
                'Great! When you connect a cluster, you can expand namespaces to explore resources.'
            );
        });
    });

    suite('kube9.internal.completeStep4 command', () => {
        test('should register and execute completeStep4 command', async () => {
            // Track if completion event was fired
            let completionEventFired = false;
            vscode.commands._registerCommand(
                'workbench.action.fireWalkthroughCompletionEvent',
                async (...args: unknown[]) => {
                    const eventName = args[0] as string;
                    if (eventName === 'kube9.onPodClicked') {
                        completionEventFired = true;
                    }
                }
            );

            // Register the command
            const completeStep4 = vscode.commands.registerCommand(
                'kube9.internal.completeStep4',
                async () => {
                    await vscode.commands.executeCommand(
                        'workbench.action.fireWalkthroughCompletionEvent',
                        'kube9.onPodClicked'
                    );
                    vscode.window.showInformationMessage(
                        'Connect a cluster to view resource details. Click any pod to see its current status, conditions, and events.'
                    );
                }
            );
            commandDisposables.push(completeStep4);

            // Execute the command
            await vscode.commands.executeCommand('kube9.internal.completeStep4');

            // Verify completion event was fired
            assert.strictEqual(completionEventFired, true, 'Completion event should be fired');

            // Verify informational message was shown
            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1, 'Should show one informational message');
            assert.ok(
                infoMessages[0].includes('Connect a cluster'),
                'Message should mention connecting a cluster'
            );
        });

        test('should show correct message to user', async () => {
            const completeStep4 = vscode.commands.registerCommand(
                'kube9.internal.completeStep4',
                async () => {
                    await vscode.commands.executeCommand(
                        'workbench.action.fireWalkthroughCompletionEvent',
                        'kube9.onPodClicked'
                    );
                    vscode.window.showInformationMessage(
                        'Connect a cluster to view resource details. Click any pod to see its current status, conditions, and events.'
                    );
                }
            );
            commandDisposables.push(completeStep4);

            await vscode.commands.executeCommand('kube9.internal.completeStep4');

            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1);
            assert.strictEqual(
                infoMessages[0],
                'Connect a cluster to view resource details. Click any pod to see its current status, conditions, and events.'
            );
        });
    });

    suite('kube9.internal.markTutorialComplete command', () => {
        test('should register and execute markTutorialComplete command', async () => {
            // Track context key updates
            let contextKeyValue: boolean | undefined;
            vscode.commands._registerCommand(
                'setContext',
                async (...args: unknown[]) => {
                    const key = args[0] as string;
                    const value = args[1] as boolean;
                    if (key === 'kube9.tutorialCompleted') {
                        contextKeyValue = value;
                    }
                }
            );

            // Register the command
            const markTutorialComplete = vscode.commands.registerCommand(
                'kube9.internal.markTutorialComplete',
                async () => {
                    await mockContext.globalState.update('kube9.tutorialCompleted', true);
                    await vscode.commands.executeCommand(
                        'setContext',
                        'kube9.tutorialCompleted',
                        true
                    );
                    vscode.window.showInformationMessage(
                        'Tutorial completed! You can replay it anytime from the Command Palette.'
                    );
                }
            );
            commandDisposables.push(markTutorialComplete);

            // Execute the command
            await vscode.commands.executeCommand('kube9.internal.markTutorialComplete');

            // Verify globalState was updated
            const tutorialCompleted = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );
            assert.strictEqual(tutorialCompleted, true, 'GlobalState should be updated to true');

            // Verify context key was set
            assert.strictEqual(contextKeyValue, true, 'Context key should be set to true');

            // Verify informational message was shown
            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1, 'Should show one informational message');
            assert.ok(
                infoMessages[0].includes('Tutorial completed'),
                'Message should mention tutorial completion'
            );
        });

        test('should update both globalState and context key', async () => {
            let contextKeyValue: boolean | undefined;
            vscode.commands._registerCommand(
                'setContext',
                async (...args: unknown[]) => {
                    const key = args[0] as string;
                    const value = args[1] as boolean;
                    if (key === 'kube9.tutorialCompleted') {
                        contextKeyValue = value;
                    }
                }
            );

            const markTutorialComplete = vscode.commands.registerCommand(
                'kube9.internal.markTutorialComplete',
                async () => {
                    await mockContext.globalState.update('kube9.tutorialCompleted', true);
                    await vscode.commands.executeCommand(
                        'setContext',
                        'kube9.tutorialCompleted',
                        true
                    );
                    vscode.window.showInformationMessage(
                        'Tutorial completed! You can replay it anytime from the Command Palette.'
                    );
                }
            );
            commandDisposables.push(markTutorialComplete);

            await vscode.commands.executeCommand('kube9.internal.markTutorialComplete');

            // Verify both are updated
            const globalStateValue = mockContext.globalState.get<boolean>(
                'kube9.tutorialCompleted',
                false
            );
            assert.strictEqual(globalStateValue, true);
            assert.strictEqual(contextKeyValue, true);
        });

        test('should show correct completion message', async () => {
            vscode.commands._registerCommand('setContext', async () => {
                // No-op
            });

            const markTutorialComplete = vscode.commands.registerCommand(
                'kube9.internal.markTutorialComplete',
                async () => {
                    await mockContext.globalState.update('kube9.tutorialCompleted', true);
                    await vscode.commands.executeCommand(
                        'setContext',
                        'kube9.tutorialCompleted',
                        true
                    );
                    vscode.window.showInformationMessage(
                        'Tutorial completed! You can replay it anytime from the Command Palette.'
                    );
                }
            );
            commandDisposables.push(markTutorialComplete);

            await vscode.commands.executeCommand('kube9.internal.markTutorialComplete');

            const infoMessages = vscode.window._getInfoMessages();
            assert.strictEqual(infoMessages.length, 1);
            assert.strictEqual(
                infoMessages[0],
                'Tutorial completed! You can replay it anytime from the Command Palette.'
            );
        });
    });
});

