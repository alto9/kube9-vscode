---
story_id: 015-implement-folder-crud-operations
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Implement Folder CRUD Operations in Service

## Objective

Add folder management methods to ClusterCustomizationService: create, rename, and delete folders with validation and auto-save.

## Context

Users need to create folder hierarchies to organize clusters. The service layer handles folder persistence with validation for nesting depth and name uniqueness.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - createFolder(), renameFolder(), deleteFolder()
- `ai/features/studio/cluster-folder-organization.feature.md` - Creating folders, validation, deleting

## Acceptance Criteria

1. Add `createFolder(name: string, parentId: string | null)` method:
   - Generate UUID for folder ID
   - Validate name non-empty and unique within parent
   - Check nesting depth (max 5 levels)
   - Calculate next order value
   - Return created FolderConfig
2. Add `renameFolder(folderId: string, newName: string)` method:
   - Validate folder exists
   - Validate new name unique within parent
3. Add `deleteFolder(folderId: string, moveToRoot: boolean)` method:
   - Move contained clusters to root or remove from customizations
   - Delete recursively for nested folders
4. Add unit tests for all operations

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `tests/unit/services/ClusterCustomizationService.test.ts`

## Implementation Notes

Use `uuid` library for generating folder IDs:
```typescript
import { v4 as uuidv4 } from 'uuid';

const folderId = uuidv4();
```

Validate nesting depth by traversing parent chain.

## Estimated Time

30 minutes

