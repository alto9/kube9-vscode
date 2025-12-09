---
story_id: 002-register-command-handler-in-extension
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: high
estimated_minutes: 10
---

## Objective

Register the `kube9.openTerminal` command handler in `src/extension.ts` to connect the command to its implementation.

## Context

After registering the command in package.json, we need to connect it to the actual implementation function in the extension activation code. This story creates a stub implementation that will be filled in by subsequent stories.

## Implementation Steps

1. Open `src/extension.ts`
2. Add import at the top of the file:
   ```typescript
   import { openTerminalCommand } from './commands/openTerminal';
   ```
3. Locate the `registerCommands()` function
4. Add command registration inside `registerCommands()`:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('kube9.openTerminal', openTerminalCommand)
   );
   ```
5. Save the file

Note: The `openTerminalCommand` function doesn't exist yet - it will be created in the next story. This may show a TypeScript error until story 003 is completed.

## Files Affected

- `src/commands/openTerminal.ts` - Created stub command file with function signature
- `src/extension.ts` - Add import and command registration

## Acceptance Criteria

- [x] Import statement added for `openTerminalCommand`
- [x] Command registered in `registerCommands()` function
- [x] Command is added to `context.subscriptions` for proper cleanup
- [x] Code follows existing patterns from other commands (scale, restart, delete)

## Dependencies

- Story 001 must be completed (package.json registration)

