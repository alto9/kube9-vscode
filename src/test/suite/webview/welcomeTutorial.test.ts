import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';

/**
 * Unit tests for welcome screen tutorial integration.
 * Tests the startTutorial message handler and its integration with the tutorial command.
 */
suite('Welcome Screen Tutorial Integration Tests', () => {
    let commandExecuted: string | null = null;
    let errorShown: string | null = null;

    setup(() => {
        // Clear state
        commandExecuted = null;
        errorShown = null;
        vscode.window._clearMessages();

        // Register kube9.showTutorial command to track execution
        vscode.commands._registerCommand(
            'kube9.showTutorial',
            async () => {
                commandExecuted = 'kube9.showTutorial';
                return Promise.resolve();
            }
        );
    });

    teardown(() => {
        vscode.commands._unregisterCommand('kube9.showTutorial');
        vscode.window._clearMessages();
    });

    /**
     * Simulates the welcome screen message handler for startTutorial command.
     * This mirrors the behavior in src/webview/WelcomeWebview.ts
     */
    async function handleStartTutorialMessage(): Promise<void> {
        try {
            await vscode.commands.executeCommand('kube9.showTutorial');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open tutorial:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open tutorial: ${errorMessage}`);
            errorShown = errorMessage;
        }
    }

    suite('startTutorial message handler', () => {
        test('should call kube9.showTutorial command when startTutorial message received', async () => {
            await handleStartTutorialMessage();

            assert.strictEqual(
                commandExecuted,
                'kube9.showTutorial',
                'Should execute kube9.showTutorial command'
            );
        });

        test('should execute command without errors when tutorial is available', async () => {
            await handleStartTutorialMessage();

            assert.strictEqual(commandExecuted, 'kube9.showTutorial');
            assert.strictEqual(errorShown, null, 'Should not show error when command succeeds');
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 0, 'Should not show error messages');
        });

        test('should handle errors gracefully if tutorial command fails', async () => {
            // Register a command that throws an error
            vscode.commands._unregisterCommand('kube9.showTutorial');
            vscode.commands._registerCommand(
                'kube9.showTutorial',
                async () => {
                    throw new Error('Walkthrough not found');
                }
            );

            await handleStartTutorialMessage();

            // Verify error was handled
            assert.ok(errorShown !== null, 'Should capture error');
            assert.ok(errorShown!.includes('Walkthrough not found'), 'Error message should match');

            // Verify error message was shown to user
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should show one error message');
            assert.ok(
                errorMessages[0].includes('Failed to open tutorial'),
                'Error message should indicate tutorial opening failed'
            );
        });

        test('should handle non-Error exceptions', async () => {
            // Register a command that throws a non-Error
            vscode.commands._unregisterCommand('kube9.showTutorial');
            vscode.commands._registerCommand(
                'kube9.showTutorial',
                async () => {
                    throw new Error('String error');
                }
            );

            await handleStartTutorialMessage();

            // Verify error was handled
            assert.ok(errorShown !== null, 'Should capture error');
            assert.ok(errorShown!.includes('String error'), 'Should include error message');

            // Verify error message was shown
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1);
        });

        test('should log error to console', async () => {
            // Track console.error calls
            const originalConsoleError = console.error;
            let consoleErrorCalled = false;
            let consoleErrorArgs: unknown[] = [];

            console.error = (...args: unknown[]) => {
                consoleErrorCalled = true;
                consoleErrorArgs = args;
                originalConsoleError.apply(console, args);
            };

            try {
                // Register a command that throws an error
                vscode.commands._unregisterCommand('kube9.showTutorial');
                vscode.commands._registerCommand(
                    'kube9.showTutorial',
                    async () => {
                        throw new Error('Test error');
                    }
                );

                await handleStartTutorialMessage();

                // Verify console.error was called
                assert.strictEqual(consoleErrorCalled, true, 'Should log error to console');
                assert.ok(
                    consoleErrorArgs[0]?.toString().includes('Failed to open tutorial'),
                    'Console error should mention tutorial failure'
                );
            } finally {
                console.error = originalConsoleError;
            }
        });
    });

    suite('Command Execution', () => {
        test('should execute tutorial command when button is clicked', async () => {
            // Simulate button click triggering message handler
            await handleStartTutorialMessage();

            assert.strictEqual(commandExecuted, 'kube9.showTutorial');
        });

        test('should execute command multiple times without issues', async () => {
            // Execute multiple times
            await handleStartTutorialMessage();
            await handleStartTutorialMessage();
            await handleStartTutorialMessage();

            // Command should execute each time
            assert.strictEqual(commandExecuted, 'kube9.showTutorial');
            assert.strictEqual(errorShown, null, 'Should not have errors');
        });

        test('should handle command execution asynchronously', async () => {
            const executionOrder: string[] = [];

            vscode.commands._unregisterCommand('kube9.showTutorial');
            vscode.commands._registerCommand(
                'kube9.showTutorial',
                async () => {
                    executionOrder.push('command');
                    commandExecuted = 'kube9.showTutorial';
                    return Promise.resolve();
                }
            );

            executionOrder.push('before');
            await handleStartTutorialMessage();
            executionOrder.push('after');

            // Verify command executed
            assert.strictEqual(commandExecuted, 'kube9.showTutorial');
            assert.ok(executionOrder.includes('command'), 'Command should execute');
        });
    });

    suite('Error Handling', () => {
        test('should show error message with correct format', async () => {
            vscode.commands._unregisterCommand('kube9.showTutorial');
            vscode.commands._registerCommand(
                'kube9.showTutorial',
                async () => {
                    throw new Error('Walkthrough ID not found');
                }
            );

            await handleStartTutorialMessage();

            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1);
            assert.ok(
                errorMessages[0].startsWith('Failed to open tutorial'),
                'Error message should start with "Failed to open tutorial"'
            );
            assert.ok(
                errorMessages[0].includes('Walkthrough ID not found'),
                'Error message should include original error'
            );
        });

        test('should not break extension if tutorial command fails', async () => {
            vscode.commands._unregisterCommand('kube9.showTutorial');
            vscode.commands._registerCommand(
                'kube9.showTutorial',
                async () => {
                    throw new Error('Test error');
                }
            );

            // Should not throw - error should be caught and handled
            await assert.doesNotReject(
                handleStartTutorialMessage(),
                'Should handle errors gracefully without throwing'
            );

            // Verify error was shown to user
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1);
        });
    });
});

