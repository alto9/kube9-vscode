---
story_id: 008-implement-alias-crud-operations
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-alias-management
spec_id:
  - cluster-customization-storage-spec
status: pending
---

# Implement Alias CRUD Operations in Service

## Objective

Add `setAlias()` method to ClusterCustomizationService for setting, updating, and removing cluster aliases with automatic persistence.

## Context

Users need to assign friendly names to clusters. The service layer handles the alias persistence logic with validation and auto-save.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - setAlias() method
- `ai/features/studio/cluster-alias-management.feature.md` - Setting/removing aliases

## Acceptance Criteria

1. Add `setAlias(contextName: string, alias: string | null)` method
2. Get or create cluster config for the context
3. Trim whitespace from alias
4. If alias is empty/null, remove it (set to null)
5. Validate alias length (max 100 characters)
6. Update config and save to Global State
7. Emit customization change event
8. Add unit tests for all cases

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `tests/unit/services/ClusterCustomizationService.test.ts`

## Implementation Notes

```typescript
async setAlias(contextName: string, alias: string | null): Promise<void> {
  const config = await this.getConfiguration();
  
  // Trim alias
  const trimmedAlias = alias?.trim() || null;
  
  // Validate
  if (trimmedAlias && trimmedAlias.length > 100) {
    throw new Error('Alias must be 100 characters or less');
  }
  
  // Get or create cluster config
  if (!config.clusters[contextName]) {
    config.clusters[contextName] = { alias: null, hidden: false, folderId: null, order: 0 };
  }
  
  config.clusters[contextName].alias = trimmedAlias;
  await this.updateConfiguration(config);
}
```

## Estimated Time

20 minutes

