import * as vscode from 'vscode';
import { SyncStatusCode, HealthStatusCode } from '../types/argocd';

/**
 * Gets the appropriate icon for an ArgoCD application based on sync and health status.
 * 
 * Maps status combinations to VS Code ThemeIcon names and colors:
 * - Synced + Healthy → "check" with green
 * - OutOfSync + Degraded → "warning" with orange
 * - OutOfSync + Healthy → "warning" with yellow
 * - Synced + Progressing → "sync" with blue
 * - Missing → "error" with red
 * - Suspended → "debug-pause" with gray
 * - Unknown → "question" with gray
 * 
 * @param syncStatus Sync status code
 * @param healthStatus Health status code
 * @returns ThemeIcon with appropriate icon and color
 */
export function getApplicationIcon(
    syncStatus: SyncStatusCode,
    healthStatus: HealthStatusCode
): vscode.ThemeIcon {
    // Handle health-specific cases first (these override sync status)
    if (healthStatus === 'Missing') {
        return new vscode.ThemeIcon(
            'error',
            new vscode.ThemeColor('testing.iconFailed')
        );
    }
    
    if (healthStatus === 'Suspended') {
        return new vscode.ThemeIcon('debug-pause');
    }
    
    // Handle sync status with health context
    switch (syncStatus) {
        case 'Synced':
            if (healthStatus === 'Healthy') {
                // Synced and healthy - show green check
                return new vscode.ThemeIcon(
                    'check',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            } else if (healthStatus === 'Progressing') {
                // Synced but progressing - show blue sync icon
                return new vscode.ThemeIcon(
                    'sync',
                    new vscode.ThemeColor('editorInfo.foreground')
                );
            } else if (healthStatus === 'Degraded') {
                // Synced but degraded - show warning
                return new vscode.ThemeIcon(
                    'warning',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            } else {
                // Synced but unknown health - show check
                return new vscode.ThemeIcon(
                    'check',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            }
            
        case 'OutOfSync':
            if (healthStatus === 'Degraded') {
                // Out of sync and degraded - show orange warning
                return new vscode.ThemeIcon(
                    'warning',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            } else if (healthStatus === 'Healthy') {
                // Out of sync but healthy - show yellow warning
                return new vscode.ThemeIcon(
                    'warning',
                    new vscode.ThemeColor('charts.yellow')
                );
            } else {
                // Out of sync with other health status - show warning
                return new vscode.ThemeIcon(
                    'warning',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            }
            
        case 'Unknown':
        default:
            // Unknown sync status - check health for context
            if (healthStatus === 'Degraded') {
                return new vscode.ThemeIcon(
                    'error',
                    new vscode.ThemeColor('testing.iconFailed')
                );
            } else {
                // Unknown status - show question icon
                return new vscode.ThemeIcon('question');
            }
    }
}

