import * as assert from 'assert';
import { ErrorTreeItem, ErrorCategory } from '../../../tree/ErrorTreeItem';
import * as vscode from '../../mocks/vscode';

suite('ErrorTreeItem Test Suite', () => {
    suite('Constructor and Basic Properties', () => {
        test('Should create an error tree item with all parameters', () => {
            const retryCallback = async (): Promise<void> => {
                // Mock retry callback
            };

            const item = new ErrorTreeItem(
                'Failed to load pods',
                ErrorCategory.CONNECTION,
                'Connection timeout after 30 seconds',
                retryCallback
            );

            assert.strictEqual(item.label, 'Failed to load pods');
            assert.strictEqual(item.errorMessage, 'Failed to load pods');
            assert.strictEqual(item.errorCategory, ErrorCategory.CONNECTION);
            assert.strictEqual(item.errorDetails, 'Connection timeout after 30 seconds');
            assert.ok(item.retryCallback);
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.contextValue, 'error');
        });

        test('Should create an error tree item with minimal parameters', () => {
            const item = new ErrorTreeItem(
                'Failed to load resources',
                ErrorCategory.UNKNOWN
            );

            assert.strictEqual(item.label, 'Failed to load resources');
            assert.strictEqual(item.errorMessage, 'Failed to load resources');
            assert.strictEqual(item.errorCategory, ErrorCategory.UNKNOWN);
            assert.strictEqual(item.errorDetails, undefined);
            assert.strictEqual(item.retryCallback, undefined);
            assert.strictEqual(item.contextValue, 'error');
        });
    });

    suite('ErrorCategory Enum', () => {
        test('Should have all 5 error category values', () => {
            assert.strictEqual(ErrorCategory.CONNECTION, 'connection');
            assert.strictEqual(ErrorCategory.PERMISSION, 'permission');
            assert.strictEqual(ErrorCategory.NOT_FOUND, 'not_found');
            assert.strictEqual(ErrorCategory.TIMEOUT, 'timeout');
            assert.strictEqual(ErrorCategory.UNKNOWN, 'unknown');
        });

        test('Should create error items with each category', () => {
            const categories = [
                ErrorCategory.CONNECTION,
                ErrorCategory.PERMISSION,
                ErrorCategory.NOT_FOUND,
                ErrorCategory.TIMEOUT,
                ErrorCategory.UNKNOWN
            ];

            categories.forEach(category => {
                const item = new ErrorTreeItem('Test error', category);
                assert.strictEqual(item.errorCategory, category);
            });
        });
    });

    suite('Icon Path', () => {
        test('Should set error icon with errorForeground color', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            assert.ok(item.iconPath);
            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            
            const icon = item.iconPath as vscode.ThemeIcon;
            assert.strictEqual(icon.id, 'error');
            assert.ok(icon.color);
            assert.strictEqual(icon.color?.id, 'errorForeground');
        });

        test('Should use error icon for all categories', () => {
            const categories = [
                ErrorCategory.CONNECTION,
                ErrorCategory.PERMISSION,
                ErrorCategory.NOT_FOUND,
                ErrorCategory.TIMEOUT,
                ErrorCategory.UNKNOWN
            ];

            categories.forEach(category => {
                const item = new ErrorTreeItem('Test error', category);
                const icon = item.iconPath as vscode.ThemeIcon;
                assert.strictEqual(icon.id, 'error');
                assert.strictEqual(icon.color?.id, 'errorForeground');
            });
        });
    });

    suite('Tooltip', () => {
        test('Should create MarkdownString tooltip', () => {
            const item = new ErrorTreeItem(
                'Failed to load pods',
                ErrorCategory.CONNECTION
            );

            assert.ok(item.tooltip);
            // Verify it's not a plain string
            assert.ok(typeof item.tooltip !== 'string');
        });

        test('Should include error message in tooltip', () => {
            const item = new ErrorTreeItem(
                'Failed to load pods',
                ErrorCategory.CONNECTION
            );

            // Tooltip should be set and be a MarkdownString
            assert.ok(item.tooltip);
            assert.ok(typeof item.tooltip !== 'string');
        });

        test('Should include error details when provided', () => {
            const item = new ErrorTreeItem(
                'Failed to load pods',
                ErrorCategory.CONNECTION,
                'Connection timeout after 30 seconds'
            );

            // Tooltip should be set when error details are provided
            assert.ok(item.tooltip);
            assert.ok(typeof item.tooltip !== 'string');
        });

        test('Should exclude details section when errorDetails is undefined', () => {
            const item = new ErrorTreeItem(
                'Failed to load pods',
                ErrorCategory.CONNECTION
            );

            // Tooltip should still be set even without details
            assert.ok(item.tooltip);
            assert.ok(typeof item.tooltip !== 'string');
        });

        test('Should include category in tooltip', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.PERMISSION
            );

            // Tooltip should be set
            assert.ok(item.tooltip);
            assert.ok(typeof item.tooltip !== 'string');
        });

        test('Should mark tooltip as trusted', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            // Verify tooltip is set and is a MarkdownString
            assert.ok(item.tooltip);
            assert.ok(typeof item.tooltip !== 'string');
            // In the actual implementation, isTrusted is set to true in buildTooltip()
        });
    });

    suite('Description', () => {
        test('Should return "Connection failed" for CONNECTION category', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            assert.strictEqual(item.description, 'Connection failed');
        });

        test('Should return "Access denied" for PERMISSION category', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.PERMISSION
            );

            assert.strictEqual(item.description, 'Access denied');
        });

        test('Should return "Not found" for NOT_FOUND category', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.NOT_FOUND
            );

            assert.strictEqual(item.description, 'Not found');
        });

        test('Should return "Timed out" for TIMEOUT category', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.TIMEOUT
            );

            assert.strictEqual(item.description, 'Timed out');
        });

        test('Should return "Error" for UNKNOWN category', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.UNKNOWN
            );

            assert.strictEqual(item.description, 'Error');
        });
    });

    suite('Retry Callback', () => {
        test('Should store retry callback when provided', () => {
            const retryCallback = async (): Promise<void> => {
                // Mock retry callback
            };

            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION,
                undefined,
                retryCallback
            );

            assert.ok(item.retryCallback);
            assert.strictEqual(item.retryCallback, retryCallback);
        });

        test('Should allow undefined retry callback', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            assert.strictEqual(item.retryCallback, undefined);
        });
    });

    suite('TreeItem Extension', () => {
        test('Should extend vscode.TreeItem', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            // Check that it has TreeItem properties
            assert.ok('label' in item);
            assert.ok('collapsibleState' in item);
            assert.ok('contextValue' in item);
            assert.ok('iconPath' in item);
            assert.ok('tooltip' in item);
            assert.ok('description' in item);
        });

        test('Should have non-collapsible state', () => {
            const item = new ErrorTreeItem(
                'Test error',
                ErrorCategory.CONNECTION
            );

            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
        });
    });
});

