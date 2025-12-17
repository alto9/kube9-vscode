---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - error-handler-utility
story_id: 004-create-main-error-handler
---

# Create Main Error Handler Class

## Objective

Create the central ErrorHandler singleton class that orchestrates error processing, logging, throttling, user notification, and action handling.

## Files to Create

- `src/errors/ErrorHandler.ts`

## Dependencies

- Story 001 (types and interfaces)
- Story 002 (OutputPanelLogger)
- Story 003 (ErrorMetrics)

## Implementation

Create `src/errors/ErrorHandler.ts` implementing singleton with:

1. **Private properties**:
   - logger: OutputPanelLogger
   - metrics: ErrorMetrics
   - errorThrottleMap: Map<string, number>
   - THROTTLE_WINDOW = 5000ms

2. **Main method handleError(details: ErrorDetails)**:
   - Log to Output Panel
   - Track metrics
   - Check throttling
   - Display error if not throttled

3. **Private helper methods**:
   - displayError() - shows notification based on severity
   - formatErrorMessage() - adds context to message
   - formatActions() - builds action button array
   - handleActionChoice() - routes to custom or standard actions
   - shouldThrottle() - checks if error occurred within window
   - reportIssue() - opens GitHub with pre-filled template
   - generateIssueTemplate() - formats bug report
   - copyErrorDetails() - copies formatted error to clipboard
   - formatErrorDetailsForCopy() - formats error for clipboard

Use the complete implementation from spec `error-handler-utility.spec.md` lines 32-316.

## Acceptance Criteria

- [ ] File `src/errors/ErrorHandler.ts` created
- [ ] Singleton pattern implemented
- [ ] handleError() orchestrates full flow
- [ ] Throttling prevents duplicate notifications within 5 seconds
- [ ] displayError() uses correct VS Code notification based on severity
- [ ] formatErrorMessage() includes context information
- [ ] Standard actions always include: View Logs, Copy Error Details
- [ ] Report Issue action added for UNEXPECTED errors
- [ ] GitHub issue template includes all required information
- [ ] All methods properly typed
- [ ] File compiles without errors

## Estimated Time

30 minutes

