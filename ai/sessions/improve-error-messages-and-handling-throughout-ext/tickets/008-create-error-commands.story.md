---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - tree-view-error-display
story_id: 008-create-error-commands
status: completed
---

# Create Error Commands for Context Menu

## Objective

Create commands for interacting with error tree items via context menu: retry operation, view error details, and copy error details.

## Files to Create

- `src/commands/errorCommands.ts`

## Dependencies

- Story 002 (OutputPanelLogger)
- Story 006 (ErrorTreeItem)

## Implementation

Create `src/commands/errorCommands.ts` with ErrorCommands class:

1. **Constructor**:
   - Initialize OutputPanelLogger instance

2. **register(context: ExtensionContext)**:
   - Register 3 commands:
     - kube9.retryFailedOperation
     - kube9.viewErrorDetails
     - kube9.copyErrorDetails

3. **retryFailedOperation(errorItem: ErrorTreeItem)**:
   - Check if retryCallback exists
   - Show progress notification
   - Execute retry callback
   - Show success/failure message

4. **viewErrorDetails(errorItem: ErrorTreeItem)**:
   - Log error details with separators
   - Show Output Panel

5. **copyErrorDetails(errorItem: ErrorTreeItem)**:
   - Format error text with message, category, details, timestamp
   - Copy to clipboard via vscode.env.clipboard
   - Show confirmation message

Use the implementation from spec `tree-view-error-display.spec.md` lines 216-320.

## Acceptance Criteria

- [ ] File `src/commands/errorCommands.ts` created
- [ ] ErrorCommands class with constructor
- [ ] register() method registers 3 commands
- [ ] retryFailedOperation() shows progress and executes callback
- [ ] retryFailedOperation() handles missing callback gracefully
- [ ] viewErrorDetails() logs to Output Panel and shows it
- [ ] copyErrorDetails() formats and copies to clipboard
- [ ] All methods properly handle ErrorTreeItem parameter
- [ ] File compiles without errors

## Estimated Time

20 minutes

