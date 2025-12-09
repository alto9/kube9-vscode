---
story_id: 008-implement-error-handling
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Implement comprehensive error handling for all failure scenarios including kubectl not found, pod not found, permission denied, and connection errors.

## Context

The command needs to handle various failure scenarios gracefully with clear, actionable error messages. This includes validation errors, kubectl errors, and connection issues.

## Implementation Steps

1. Open `src/commands/openTerminal.ts`
2. Wrap main command logic in try-catch block
3. Implement error detection and user-friendly messages:
   - **kubectl not found**: Check if error message contains 'command not found' or 'ENOENT'
     - Message: "kubectl not found. Please install kubectl to use this feature."
   - **Pod not found**: Check if error contains 'not found' or 404
     - Message: "Pod '<name>' not found in namespace '<namespace>'"
   - **Permission denied**: Check if error contains 'forbidden' or 403
     - Message: "Permission denied: Unable to exec into pod. Check your RBAC permissions for pod/exec resource."
   - **Connection/network errors**: Check for timeout or connection errors
     - Message: "Failed to connect to pod: <error details>"
   - **Generic errors**: Catch-all for unexpected errors
     - Message: "Failed to open terminal: <error message>"
4. Use `vscode.window.showErrorMessage()` to display errors
5. Ensure terminal is not created on error (early return)
6. Add console.error logging for debugging
7. Follow error handling patterns from existing commands (restartWorkload, scaleWorkload)

## Files Affected

- `src/commands/openTerminal.ts` - Add comprehensive error handling

## Acceptance Criteria

- [ ] All error scenarios have specific, actionable error messages
- [ ] kubectl not found error is detected and handled
- [ ] Pod not found error is detected and handled
- [ ] RBAC permission denied error is detected and handled
- [ ] Connection errors are detected and handled with details
- [ ] Generic error catch-all prevents crashes
- [ ] Error messages are user-friendly and guide next actions
- [ ] No terminal is created when errors occur
- [ ] Console logging provides debugging information
- [ ] Follows error handling patterns from existing commands

## Dependencies

- Story 007 must be completed (terminal creation logic exists)

