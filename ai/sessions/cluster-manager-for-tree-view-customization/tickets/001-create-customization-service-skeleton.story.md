---
story_id: 001-create-customization-service-skeleton
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-customization-storage-spec
status: pending
---

# Create ClusterCustomizationService Skeleton

## Objective

Create the core `ClusterCustomizationService` class with TypeScript interfaces for the customization configuration schema and basic CRUD operations for Global State persistence.

## Context

The ClusterCustomizationService is the persistence layer that manages all cluster customizations (folders, aliases, visibility) using VS Code's Global State API. This is the foundation for all cluster organization features.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` for complete API specification
- `ai/diagrams/studio/cluster-manager-architecture.diagram.md` for component architecture

## Acceptance Criteria

1. Create `src/services/ClusterCustomizationService.ts` file
2. Define TypeScript interfaces:
   - `ClusterCustomizationConfig` (version, folders, clusters)
   - `FolderConfig` (id, name, parentId, order, expanded)
   - `ClusterConfig` (alias, hidden, folderId, order)
3. Implement constructor accepting `ExtensionContext`
4. Implement `getConfiguration()` method:
   - Read from Global State key `kube9.clusterCustomizations`
   - Return default empty config if not found
5. Implement `updateConfiguration()` method:
   - Write complete config to Global State
   - No validation yet (add later)
6. Add unit tests for read/write operations

## Files to Create/Modify

- `src/services/ClusterCustomizationService.ts` (new)
- `src/services/index.ts` (export service)
- `tests/unit/services/ClusterCustomizationService.test.ts` (new)

## Implementation Notes

- Use `context.globalState.get()` and `context.globalState.update()`
- Default config: `{ version: "1.0", folders: [], clusters: {} }`
- No event emitter yet (add in later story)
- Keep it simple - just basic read/write for now

## Estimated Time

25 minutes

