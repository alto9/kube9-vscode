---
story_id: 013-add-cache-stats-command
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Add Cache Statistics Debug Command
feature_id:
  - api-client-performance
spec_id:
  - api-client-caching-strategy
status: completed
estimated_minutes: 20
---

# Add Cache Statistics Debug Command

## Objective

Add a VS Code command to display cache statistics for debugging and performance monitoring.

## Context

Developers and power users need visibility into cache behavior to understand performance characteristics and troubleshoot issues. This command shows cache hit rate, entry count, and cache size.

## Acceptance Criteria

- [ ] New VS Code command `kube9.showCacheStats` registered
- [ ] Command displays statistics in Output panel
- [ ] Statistics include:
  - Total cache entries
  - Cache entries by resource type
  - Approximate cache size in MB
  - List of cache keys (for debugging)
- [ ] Command accessible via Command Palette
- [ ] Output panel clearly formatted

## Implementation Steps

1. Open `src/extension.ts` (or wherever commands are registered)
2. Import cache utilities:
   ```typescript
   import { getResourceCache } from './kubernetes/cache';
   ```
3. Register new command:
   ```typescript
   context.subscriptions.push(
       vscode.commands.registerCommand('kube9.showCacheStats', () => {
           const cache = getResourceCache();
           const output = vscode.window.createOutputChannel('Kube9 Cache Stats');
           
           output.clear();
           output.appendLine('=== Kube9 Cache Statistics ===\n');
           output.appendLine(`Total Entries: ${cache.size()}`);
           output.appendLine(`Total Size: ${(cache.totalSize() / 1024 / 1024).toFixed(2)} MB\n`);
           output.appendLine('Cache Keys:');
           
           for (const key of cache.keys()) {
               output.appendLine(`  - ${key}`);
           }
           
           output.show();
       })
   );
   ```
4. Add `size()`, `totalSize()`, and `keys()` methods to ResourceCache class if not present
5. Update package.json commands section
6. Test command execution

## Files to Modify

- `src/kubernetes/cache.ts` - Add size(), totalSize(), keys() methods
- `src/extension.ts` - Register command
- `package.json` - Add command declaration

## package.json Update

```json
"commands": [
    {
        "command": "kube9.showCacheStats",
        "title": "Show Cache Statistics",
        "category": "Kube9"
    }
]
```

## Testing

- Run command from Command Palette
- Verify statistics displayed in Output panel
- Verify cache keys listed correctly
- Test with empty cache
- Test with populated cache
- Verify size calculation reasonable

## Notes

- This is a debug/developer tool, not end-user feature
- Consider adding cache hit/miss statistics in future (requires metrics collection)
- Consider adding "Clear Cache" button in output panel (future)
- Size calculation is approximate (uses JSON.stringify length estimation)

