import * as assert from 'assert';
import * as vscode from 'vscode';
import { getApplicationIcon } from '../../../utils/argoCDIcons';
import { SyncStatusCode, HealthStatusCode } from '../../../types/argocd';

suite('argoCDIcons Test Suite', () => {
    suite('getApplicationIcon', () => {
        test('should return check icon with green for Synced + Healthy', () => {
            const icon = getApplicationIcon('Synced', 'Healthy');
            
            assert.strictEqual(icon.id, 'check');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'testing.iconPassed');
        });
        
        test('should return warning icon with orange for OutOfSync + Degraded', () => {
            const icon = getApplicationIcon('OutOfSync', 'Degraded');
            
            assert.strictEqual(icon.id, 'warning');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'editorWarning.foreground');
        });
        
        test('should return warning icon with yellow for OutOfSync + Healthy', () => {
            const icon = getApplicationIcon('OutOfSync', 'Healthy');
            
            assert.strictEqual(icon.id, 'warning');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'charts.yellow');
        });
        
        test('should return sync icon with blue for Synced + Progressing', () => {
            const icon = getApplicationIcon('Synced', 'Progressing');
            
            assert.strictEqual(icon.id, 'sync');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'editorInfo.foreground');
        });
        
        test('should return error icon with red for Missing health status', () => {
            const icon = getApplicationIcon('Synced', 'Missing');
            
            assert.strictEqual(icon.id, 'error');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'testing.iconFailed');
        });
        
        test('should return error icon with red for Missing health regardless of sync status', () => {
            const icon1 = getApplicationIcon('Synced', 'Missing');
            const icon2 = getApplicationIcon('OutOfSync', 'Missing');
            const icon3 = getApplicationIcon('Unknown', 'Missing');
            
            assert.strictEqual(icon1.id, 'error');
            assert.strictEqual(icon2.id, 'error');
            assert.strictEqual(icon3.id, 'error');
            assert.strictEqual(icon1.color?.id, 'testing.iconFailed');
            assert.strictEqual(icon2.color?.id, 'testing.iconFailed');
            assert.strictEqual(icon3.color?.id, 'testing.iconFailed');
        });
        
        test('should return debug-pause icon with no color for Suspended health status', () => {
            const icon = getApplicationIcon('Synced', 'Suspended');
            
            assert.strictEqual(icon.id, 'debug-pause');
            assert.strictEqual(icon.color, undefined);
        });
        
        test('should return debug-pause icon for Suspended regardless of sync status', () => {
            const icon1 = getApplicationIcon('Synced', 'Suspended');
            const icon2 = getApplicationIcon('OutOfSync', 'Suspended');
            const icon3 = getApplicationIcon('Unknown', 'Suspended');
            
            assert.strictEqual(icon1.id, 'debug-pause');
            assert.strictEqual(icon2.id, 'debug-pause');
            assert.strictEqual(icon3.id, 'debug-pause');
            assert.strictEqual(icon1.color, undefined);
            assert.strictEqual(icon2.color, undefined);
            assert.strictEqual(icon3.color, undefined);
        });
        
        test('should return warning icon with orange for Synced + Degraded', () => {
            const icon = getApplicationIcon('Synced', 'Degraded');
            
            assert.strictEqual(icon.id, 'warning');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'editorWarning.foreground');
        });
        
        test('should return check icon with green for Synced + Unknown health', () => {
            const icon = getApplicationIcon('Synced', 'Unknown');
            
            assert.strictEqual(icon.id, 'check');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'testing.iconPassed');
        });
        
        test('should return warning icon with orange for OutOfSync + Progressing', () => {
            const icon = getApplicationIcon('OutOfSync', 'Progressing');
            
            assert.strictEqual(icon.id, 'warning');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'editorWarning.foreground');
        });
        
        test('should return warning icon with orange for OutOfSync + Unknown health', () => {
            const icon = getApplicationIcon('OutOfSync', 'Unknown');
            
            assert.strictEqual(icon.id, 'warning');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'editorWarning.foreground');
        });
        
        test('should return error icon with red for Unknown sync + Degraded health', () => {
            const icon = getApplicationIcon('Unknown', 'Degraded');
            
            assert.strictEqual(icon.id, 'error');
            assert.ok(icon.color instanceof vscode.ThemeColor);
            assert.strictEqual(icon.color.id, 'testing.iconFailed');
        });
        
        test('should return question icon with no color for Unknown sync + Unknown health', () => {
            const icon = getApplicationIcon('Unknown', 'Unknown');
            
            assert.strictEqual(icon.id, 'question');
            assert.strictEqual(icon.color, undefined);
        });
        
        test('should return question icon with no color for Unknown sync + Healthy health', () => {
            const icon = getApplicationIcon('Unknown', 'Healthy');
            
            assert.strictEqual(icon.id, 'question');
            assert.strictEqual(icon.color, undefined);
        });
        
        test('should return question icon with no color for Unknown sync + Progressing health', () => {
            const icon = getApplicationIcon('Unknown', 'Progressing');
            
            assert.strictEqual(icon.id, 'question');
            assert.strictEqual(icon.color, undefined);
        });
        
        test('should handle all sync status combinations', () => {
            const syncStatuses: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
            const healthStatuses: HealthStatusCode[] = ['Healthy', 'Degraded', 'Progressing', 'Suspended', 'Missing', 'Unknown'];
            
            // Verify all combinations return valid icons
            for (const syncStatus of syncStatuses) {
                for (const healthStatus of healthStatuses) {
                    const icon = getApplicationIcon(syncStatus, healthStatus);
                    assert.ok(icon instanceof vscode.ThemeIcon, 
                        `Should return ThemeIcon for ${syncStatus} + ${healthStatus}`);
                    assert.ok(typeof icon.id === 'string' && icon.id.length > 0,
                        `Should have valid icon ID for ${syncStatus} + ${healthStatus}`);
                }
            }
        });
    });
});

