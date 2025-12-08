---
story_id: add-unit-tests
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-detection, argocd-tree-view, argocd-actions]
spec_id: [argocd-service-spec]
status: pending
priority: medium
estimated_minutes: 30
---

# Add Unit Tests for ArgoCDService

## Objective

Create unit tests for ArgoCDService covering detection, querying, parsing, and action methods with mocked kubectl and operator status.

## Context

The service needs comprehensive unit test coverage to ensure detection logic, CRD parsing, and action methods work correctly in various scenarios.

## Implementation Steps

1. Create `tests/services/ArgoCDService.test.ts` file
2. Set up mocks for KubectlCommands
3. Set up mocks for OperatorStatusClient
4. Test `isInstalled()` in operated mode
5. Test `isInstalled()` in basic mode (CRD detection)
6. Test `getApplications()` with valid CRD data
7. Test `getApplication()` for single app
8. Test `parseApplication()` with various CRD structures
9. Test sync action with successful patch
10. Test error handling (RBAC, not found, network)
11. Test caching behavior
12. Add test for operation tracking

## Files Affected

- `tests/services/ArgoCDService.test.ts` - Create unit tests

## Acceptance Criteria

- [ ] Tests cover operated mode detection
- [ ] Tests cover basic mode detection
- [ ] Tests cover application querying
- [ ] Tests cover CRD parsing edge cases
- [ ] Tests cover sync/refresh actions
- [ ] Tests cover error scenarios
- [ ] Tests cover caching behavior
- [ ] All tests pass
- [ ] Code coverage > 80%

## Dependencies

- 018-add-error-handling (needs complete service with error handling)

