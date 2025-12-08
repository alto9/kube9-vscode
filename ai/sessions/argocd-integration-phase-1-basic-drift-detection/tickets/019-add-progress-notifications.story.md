---
story_id: add-progress-notifications
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-actions]
spec_id: [argocd-service-spec]
status: pending
priority: medium
estimated_minutes: 20
---

# Add Progress Notifications for Sync Operations

## Objective

Add VS Code progress notifications that show sync operation status with phase updates and allow cancellation of polling.

## Context

When users trigger sync operations, they need visual feedback showing the operation is in progress, which phase it's in, and when it completes.

## Implementation Steps

1. Open `src/commands/ArgoCDCommands.ts`
2. Wrap sync operations in `vscode.window.withProgress()`
3. Show "Syncing {appName}..." initial message
4. Update progress with operation phase from trackOperation
5. Show phase: "Running", "Terminating", "Succeeded", "Failed"
6. Allow cancellation to stop polling (not stop ArgoCD operation)
7. Show success notification on completion
8. Show error notification on failure
9. Add timeout notification (operation continues in ArgoCD)

## Files Affected

- `src/commands/ArgoCDCommands.ts` - Add progress notifications

## Acceptance Criteria

- [ ] Progress notification appears on sync
- [ ] Progress updates with current phase
- [ ] Success notification shown on completion
- [ ] Error notification shown on failure
- [ ] Timeout notification explains operation continues
- [ ] Cancel button stops polling (doesn't cancel sync)
- [ ] Progress appears in notification area

## Dependencies

- 009-add-tree-context-menu-commands (needs command handlers)

