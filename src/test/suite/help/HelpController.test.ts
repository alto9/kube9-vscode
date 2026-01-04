import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { HelpController } from '../../../help/HelpController';

suite('HelpController Test Suite', () => {
    let helpController: HelpController;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Clear any previous state
        vscode.env._clearOpenedUris();
        vscode.window._clearMessages();

        // Create mock extension context
        mockContext = {
            subscriptions: [],
            extension: {
                packageJSON: { version: '1.0.0' }
            },
            globalState: {
                keys: () => [],
                get: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
                update: async () => Promise.resolve(),
                setKeysForSync: () => {}
            } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void },
            workspaceState: {
                keys: () => [],
                get: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
                update: async () => Promise.resolve()
            } as vscode.Memento,
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
            secrets: {
                get: async () => undefined,
                store: async () => {},
                delete: async () => {},
                keys: async () => [],
                onDidChange: {}
            } as vscode.SecretStorage,
            languageModelAccessInformation: {},
            asAbsolutePath: (relativePath: string) => relativePath
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        helpController = new HelpController(mockContext as any);
    });

    teardown(() => {
        // Clean up
        vscode.env._clearOpenedUris();
        vscode.window._clearMessages();
    });

    test('should open documentation URL', async () => {
        await helpController['openDocumentation']();

        const openedUris = vscode.env._getOpenedUris();
        assert.strictEqual(openedUris.length, 1, 'Should open one URL');
        assert.strictEqual(
            openedUris[0].path,
            'https://alto9.github.io/kube9/',
            'Should open correct documentation URL'
        );
    });

    test('should build issue template with system info', () => {
        const template = helpController['buildIssueTemplate']();

        // Check for required sections
        assert.ok(template.includes('**Describe the issue**'), 'Should include issue description section');
        assert.ok(template.includes('**Steps to reproduce**'), 'Should include steps to reproduce section');
        assert.ok(template.includes('**Expected behavior**'), 'Should include expected behavior section');
        assert.ok(template.includes('**Environment**'), 'Should include environment section');

        // Check for system information
        assert.ok(template.includes(process.platform), 'Should include OS platform');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assert.ok(template.includes((vscode as any).version), 'Should include VSCode version');
        assert.ok(template.includes('1.0.0'), 'Should include extension version');
        assert.ok(template.includes(process.version), 'Should include Node version');
    });

    test('should map context to correct documentation URLs', () => {
        const contexts = [
            { context: 'events-viewer', expected: 'https://alto9.github.io/kube9/features/events-viewer/' },
            { context: 'pod-logs', expected: 'https://alto9.github.io/kube9/features/pod-logs/' },
            { context: 'cluster-manager', expected: 'https://alto9.github.io/kube9/features/cluster-manager/' },
            { context: 'yaml-editor', expected: 'https://alto9.github.io/kube9/features/yaml-editor/' },
            { context: 'describe-webview', expected: 'https://alto9.github.io/kube9/features/describe-view/' }
        ];

        for (const { context, expected } of contexts) {
            const url = helpController['getContextualHelpUrl'](context);
            assert.strictEqual(url, expected, `Context '${context}' should map to correct URL`);
        }
    });

    test('should default to homepage for unknown context', () => {
        const url = helpController['getContextualHelpUrl']('unknown-context');
        assert.strictEqual(url, 'https://alto9.github.io/kube9/', 'Unknown context should default to homepage');
    });

    test('should handle openUrl errors gracefully when openExternal returns false', async () => {
        // Store original function
        const originalOpenExternal = vscode.env.openExternal;

        // Mock openExternal to return false (failure)
        vscode.env.openExternal = async () => {
            return Promise.resolve(false);
        };

        try {
            await helpController['openUrl']('https://example.com');

            // Check that error message was shown
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should show one error message');
            assert.ok(
                errorMessages[0].includes('Failed to open URL in browser'),
                'Error message should mention failed to open URL'
            );
        } finally {
            // Restore original function
            vscode.env.openExternal = originalOpenExternal;
        }
    });

    test('should handle openUrl errors gracefully when openExternal throws', async () => {
        // Store original function
        const originalOpenExternal = vscode.env.openExternal;

        // Mock openExternal to throw an error
        vscode.env.openExternal = async () => {
            throw new Error('Network error');
        };

        try {
            await helpController['openUrl']('https://example.com');

            // Check that error message was shown
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should show one error message');
            assert.ok(
                errorMessages[0].includes('Error opening URL'),
                'Error message should mention error opening URL'
            );
        } finally {
            // Restore original function
            vscode.env.openExternal = originalOpenExternal;
        }
    });

    test('should register all help commands', () => {
        helpController.registerCommands();
        assert.strictEqual(mockContext.subscriptions.length, 3, 'Should register 3 commands');
    });

    test('should open contextual help for valid context', async () => {
        await helpController.openContextualHelp('events-viewer');

        const openedUris = vscode.env._getOpenedUris();
        assert.strictEqual(openedUris.length, 1, 'Should open one URL');
        assert.strictEqual(
            openedUris[0].path,
            'https://alto9.github.io/kube9/features/events-viewer/',
            'Should open correct contextual help URL'
        );
    });

    test('should open homepage for unknown context via openContextualHelp', async () => {
        await helpController.openContextualHelp('unknown-context');

        const openedUris = vscode.env._getOpenedUris();
        assert.strictEqual(openedUris.length, 1, 'Should open one URL');
        assert.strictEqual(
            openedUris[0].path,
            'https://alto9.github.io/kube9/',
            'Should default to homepage for unknown context'
        );
    });
});

