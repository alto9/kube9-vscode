---
story_id: 002-add-event-system-to-customization-service
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
  - cluster-folder-organization
  - cluster-alias-management
  - cluster-visibility-control
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Add Event System to ClusterCustomizationService

## Objective

Add VS Code EventEmitter to ClusterCustomizationService to notify subscribers (webview, tree provider) when customizations change, enabling real-time synchronization.

## Context

The service needs to notify other components when customizations change so the tree view and webview stay synchronized. This implements the event-based synchronization pattern shown in the architecture diagram.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - Event System section
- `ai/diagrams/studio/cluster-manager-architecture.diagram.md` - Real-time Synchronization

## Acceptance Criteria

1. Add private `EventEmitter<CustomizationChangeEvent>` property
2. Define `CustomizationChangeEvent` interface:
   - `type`: 'folder' | 'cluster' | 'bulk'
   - `operation`: 'create' | 'update' | 'delete'
   - `affectedIds`: string[]
3. Expose public `onDidChangeCustomizations` event
4. Emit event in `updateConfiguration()` method
5. Add unit tests verifying events fire correctly

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `tests/unit/services/ClusterCustomizationService.test.ts`

## Implementation Notes

```typescript
private changeEmitter = new vscode.EventEmitter<CustomizationChangeEvent>();
readonly onDidChangeCustomizations = this.changeEmitter.event;
```

- Emit event AFTER Global State write succeeds
- Event payload should include what changed for optimization
- Don't emit if write fails

## Estimated Time

20 minutes

