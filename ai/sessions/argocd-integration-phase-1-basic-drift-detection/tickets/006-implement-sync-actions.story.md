---
story_id: implement-sync-actions
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-actions]
spec_id: [argocd-service-spec]
diagram_id: [argocd-data-flow]
status: completed
priority: high
estimated_minutes: 30
---

# Implement Sync Actions in ArgoCDService

## Objective

Add methods to execute sync, refresh, and hard refresh actions by patching Application CRDs with appropriate annotations.

## Context

Users trigger sync actions from tree view or webview. The service patches the Application CRD with refresh annotations that ArgoCD controller detects and processes.

## Implementation Steps

1. Open `src/services/ArgoCDService.ts`
2. Implement `syncApplication(name, namespace, context)` method
3. Create patch object with `argocd.argoproj.io/refresh: "normal"` annotation
4. Execute kubectl patch command
5. Implement `refreshApplication(name, namespace, context)` - same as sync
6. Implement `hardRefreshApplication(name, namespace, context)` method
7. Create patch with `argocd.argoproj.io/refresh: "hard"` annotation
8. Implement `trackOperation(name, namespace, context, timeout)` method
9. Poll `status.operationState` every 2 seconds
10. Check phase for "Succeeded" or "Failed"
11. Handle timeout after 5 minutes
12. Return operation result

## Files Affected

- `src/services/ArgoCDService.ts` - Add action methods

## Acceptance Criteria

- [x] `syncApplication()` patches CRD with normal refresh annotation
- [x] `hardRefreshApplication()` patches CRD with hard refresh annotation
- [x] `trackOperation()` polls status every 2 seconds
- [x] Operation tracking stops on success, failure, or timeout
- [x] Timeout is handled after 5 minutes
- [x] RBAC and not found errors are handled
- [x] Methods return operation result or throw appropriate error

## Dependencies

- 005-implement-crd-parsing (needs parsing to check operation state)

