---
story_id: 007-add-integration-tests
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: medium
estimated_minutes: 30
---

# Add Integration Tests for Restart Feature

## Objective
Create comprehensive tests covering all restart scenarios including success cases, error handling, and rollout watch functionality.

## Context
The restart feature needs thorough testing to ensure it works reliably across different workload types and handles all edge cases correctly.

## Implementation Steps

1. Create test file `tests/commands/restartWorkload.test.ts`
2. Test scenarios:
   - **Command registration**: Verify command appears in correct contexts
   - **Confirmation dialog**: Test dialog shows and captures user input
   - **Restart Deployment**: Test successful restart with annotation
   - **Restart StatefulSet**: Test successful restart
   - **Restart DaemonSet**: Test successful restart
   - **Wait for rollout**: Test rollout watch with mock status updates
   - **Skip rollout watch**: Test immediate success when checkbox unchecked
   - **Cancel operation**: Test cancellation from dialog
   - **Resource not found**: Test error handling
   - **Permission denied**: Test RBAC error handling
   - **Rollout timeout**: Test 5-minute timeout error
   - **Missing annotations**: Test auto-creation of annotations object
   - **Tree view refresh**: Test refresh is called after restart
   - **Multiple restarts**: Test annotation is updated, not duplicated
3. Mock Kubernetes API responses
4. Mock VSCode APIs (showInformationMessage, withProgress, etc.)
5. Verify correct API calls are made
6. Verify correct error messages are shown

## Files Affected
- `tests/commands/restartWorkload.test.ts` (new file) - Test implementation
- `tests/mocks/kubernetes.ts` - Mock Kubernetes client (if not exists)
- `tests/mocks/vscode.ts` - Mock VSCode APIs (if not exists)

## Acceptance Criteria
- [ ] All success scenarios are tested
- [ ] All error scenarios are tested
- [ ] Rollout watch functionality is tested
- [ ] Dialog interaction is tested
- [ ] Tree view refresh is verified
- [ ] Correct API calls are verified
- [ ] Correct notification messages are verified
- [ ] All three workload types are tested
- [ ] Tests pass reliably
- [ ] Code coverage is adequate

## Dependencies
- 001-register-restart-command (needs command to test)
- 002-implement-confirmation-dialog (needs dialog to test)
- 003-implement-restart-annotation-logic (needs core logic to test)
- 004-implement-rollout-watch (needs watch logic to test)
- 005-implement-tree-view-refresh (needs refresh to verify)
- 006-add-error-handling (needs error handling to test)

