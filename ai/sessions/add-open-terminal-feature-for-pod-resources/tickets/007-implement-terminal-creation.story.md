---
story_id: 007-implement-terminal-creation
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: high
estimated_minutes: 15
---

## Objective

Implement VS Code terminal creation using the Terminal API to execute the kubectl exec command and focus the terminal.

## Context

This is the final core piece that actually creates the terminal window and executes the kubectl exec command to connect to the pod. The terminal should be created, focused, and the command should be sent to it.

## Implementation Steps

1. Open `src/commands/openTerminal.ts`
2. In main command handler, after building kubectl command and terminal name:
3. Create terminal using VS Code API:
   ```typescript
   const terminal = vscode.window.createTerminal({
     name: terminalName
   });
   ```
4. Send the kubectl exec command to the terminal:
   ```typescript
   terminal.sendText(kubectlCommand);
   ```
5. Focus the terminal so it's visible to the user:
   ```typescript
   terminal.show();
   ```
6. Add comment explaining terminal behavior:
   - Terminal will execute kubectl exec command immediately
   - User will see connection establishment
   - Once connected, shell prompt will appear
   - Terminal remains open even after exit for review

## Files Affected

- `src/commands/openTerminal.ts` - Add terminal creation logic

## Acceptance Criteria

- [x] Terminal is created with correct name
- [x] kubectl exec command is sent to terminal
- [x] Terminal is focused automatically (visible to user)
- [x] Terminal appears in VS Code terminal list
- [x] Terminal executes command immediately upon creation
- [x] Multiple terminals can be opened for same pod (independent sessions)
- [x] Feature works identically in Free and Pro tiers (no operator dependency)

## Dependencies

- Story 006 must be completed (kubectl command builder exists)

