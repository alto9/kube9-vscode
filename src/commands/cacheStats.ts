import * as vscode from 'vscode';
import { getResourceCache } from '../kubernetes/cache';

/**
 * Command handler for displaying cache statistics.
 * Shows cache entry count, size, and resource type breakdown for debugging.
 */
export async function showCacheStatsCommand(): Promise<void> {
    try {
        const cache = getResourceCache();
        const output = vscode.window.createOutputChannel('Kube9 Cache Stats');
        
        output.clear();
        output.appendLine('=== Kube9 Cache Statistics ===');
        output.appendLine('');
        
        // Get statistics
        const totalEntries = cache.size();
        const totalSizeBytes = cache.totalSize();
        const totalSizeMB = totalSizeBytes / 1024 / 1024;
        const keys = cache.keys();
        
        // Display total entries
        output.appendLine(`Total Entries: ${totalEntries}`);
        output.appendLine('');
        
        // Group entries by resource type
        const entriesByType: Map<string, number> = new Map();
        for (const key of keys) {
            // Parse key format: context:resourceType or context:resourceType:namespace
            const parts = key.split(':');
            if (parts.length >= 2) {
                const resourceType = parts[1];
                const count = entriesByType.get(resourceType) || 0;
                entriesByType.set(resourceType, count + 1);
            } else {
                // Handle unexpected key format
                const count = entriesByType.get('unknown') || 0;
                entriesByType.set('unknown', count + 1);
            }
        }
        
        // Display entries by resource type
        if (entriesByType.size > 0) {
            output.appendLine('Entries by Resource Type:');
            const sortedTypes = Array.from(entriesByType.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            for (const [resourceType, count] of sortedTypes) {
                output.appendLine(`  ${resourceType}: ${count}`);
            }
            output.appendLine('');
        }
        
        // Display total size
        output.appendLine(`Total Size: ${totalSizeMB.toFixed(2)} MB`);
        output.appendLine('');
        
        // Display cache keys
        output.appendLine('Cache Keys:');
        if (keys.length === 0) {
            output.appendLine('  (empty)');
        } else {
            const sortedKeys = [...keys].sort();
            for (const key of sortedKeys) {
                output.appendLine(`  - ${key}`);
            }
        }
        
        output.show();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to show cache statistics:', errorMessage);
        vscode.window.showErrorMessage(`Failed to show cache statistics: ${errorMessage}`);
    }
}

