---
story_id: 009-add-unit-tests
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: medium
estimated_minutes: 30
---

## Objective

Add comprehensive unit tests for the openTerminal command covering validation, container selection, command building, and error scenarios.

## Context

Unit tests ensure the command logic works correctly for all scenarios. Tests should cover happy paths and error cases without requiring actual kubectl or pod connections.

## Implementation Steps

1. Create test file: `src/test/suite/commands/openTerminal.test.ts`
2. Set up test suite structure following existing test patterns (see `scaleWorkload.test.ts`, `restartWorkload.test.ts`)
3. Add test cases for:
   
   **Tree Item Validation**
   - Valid Pod tree item passes validation
   - Non-Pod resource shows error
   - Missing resourceData shows error
   - Missing context information shows error
   
   **Pod Status Query**
   - Mock kubectl execution to return pod status
   - Verify command includes correct pod name, namespace, context
   - Handle Running state (allows terminal)
   - Handle non-Running states (shows error)
   - Handle pod not found (shows error)
   
   **Container Selection**
   - Single-container pod skips selection dialog
   - Multi-container pod shows quick pick
   - User cancels selection (no terminal created)
   - Empty container list shows error
   
   **Command Building**
   - Single-container command format is correct
   - Multi-container command includes `-c` flag
   - Terminal name format for single-container
   - Terminal name format for multi-container
   
   **Error Handling**
   - kubectl not found error
   - Permission denied error
   - Connection error
   - Generic error

4. Mock VS Code APIs:
   - `vscode.window.createTerminal`
   - `vscode.window.showQuickPick`
   - `vscode.window.showErrorMessage`
5. Mock kubectl execFile execution
6. Use assert/chai for assertions
7. Follow TDD test organization patterns

## Files Affected

- `src/test/suite/commands/openTerminal.test.ts` - Create new test file

## Acceptance Criteria

- [x] All validation scenarios tested
- [x] Pod status query scenarios tested
- [x] Container selection logic tested
- [x] Command building logic tested
- [x] Error handling scenarios tested
- [x] Tests use proper mocking (no real kubectl calls)
- [x] All tests pass
- [x] Test coverage >80% for openTerminal.ts
- [x] Follows existing test patterns and structure

## Dependencies

- Story 008 must be completed (all command logic implemented)

