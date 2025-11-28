---
story_id: 007-register-command-extension
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: pending
priority: high
estimated_minutes: 10
---

# Register Apply YAML Command in extension.ts

## Objective

Wire up the `applyYAMLCommand` handler in `extension.ts` so VS Code invokes the handler when the command is triggered.

## Context

Commands in this extension are registered in the `registerCommands()` function in `extension.ts`. The pattern involves:
1. Importing the command handler
2. Calling `vscode.commands.registerCommand()`
3. Adding to `context.subscriptions` and `disposables`

This follows the existing pattern used for `configureApiKeyCommand`, `refreshClusters`, etc.

## Implementation Steps

1. Open `src/extension.ts`
2. Add import at top of file:
   ```typescript
   import { applyYAMLCommand } from './commands/applyYAML';
   ```
3. In `registerCommands()` function, add command registration:
   ```typescript
   const applyYAMLCmd = vscode.commands.registerCommand(
     'kube9.applyYAML',
     applyYAMLCommand
   );
   context.subscriptions.push(applyYAMLCmd);
   disposables.push(applyYAMLCmd);
   ```

## Files Affected

- `src/extension.ts` - Add import and command registration

## Acceptance Criteria

- [ ] `applyYAMLCommand` is imported from `./commands/applyYAML`
- [ ] Command is registered with ID `kube9.applyYAML`
- [ ] Command is added to `context.subscriptions`
- [ ] Command is added to `disposables` array
- [ ] No TypeScript compilation errors
- [ ] Command can be invoked from command palette

## Dependencies

- Story 006 (command handler must be complete with all functionality)

