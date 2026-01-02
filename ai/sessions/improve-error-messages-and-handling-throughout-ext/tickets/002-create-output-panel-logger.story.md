---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - error-handler-utility
  - output-panel-logging
story_id: 002-create-output-panel-logger
status: completed
---

# Create Output Panel Logger

## Objective

Create a singleton class that manages logging to the VS Code Output Panel, providing structured logging for all errors with timestamps, context, and formatting.

## Files to Create

- `src/errors/OutputPanelLogger.ts`

## Dependencies

- Story 001 (ErrorDetails interface)

## Implementation

Create `src/errors/OutputPanelLogger.ts` implementing the singleton pattern with:

1. **Private constructor** with `vscode.window.createOutputChannel('kube9')`
2. **getInstance()** static method
3. **log(message, level)** method for general logging
4. **logError(details: ErrorDetails)** method for structured error logging with:
   - 80-character separator lines
   - Timestamp in ISO format
   - Error type and severity
   - Status code (if present)
   - Context as formatted JSON
   - Technical details
   - Stack trace (if present)
5. **show()** method to display the panel
6. **dispose()** method for cleanup

Use the implementation from spec `error-handler-utility.spec.md` lines 430-491.

## Acceptance Criteria

- [x] File `src/errors/OutputPanelLogger.ts` created
- [x] Singleton pattern implemented correctly
- [x] Output channel named 'kube9' created
- [x] log() method includes timestamp and level prefix
- [x] logError() method formats ErrorDetails with separators
- [x] show() and dispose() methods implemented
- [x] File compiles without errors

## Estimated Time

15 minutes

