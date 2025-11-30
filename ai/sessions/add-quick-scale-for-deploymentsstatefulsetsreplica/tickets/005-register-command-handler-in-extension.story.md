---
story_id: register-command-handler-in-extension
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: pending
priority: high
estimated_minutes: 10
---

## Objective

Register the scale command handler in extension.ts so it gets activated when the extension loads.

## Context

The command needs to be registered in the `activate` function so VSCode knows what to execute when the user clicks "Scale" in the context menu.

## Implementation Steps

1. Open `src/extension.ts`

2. Add import at top of file:
```typescript
import { scaleWorkloadCommand } from './commands/scaleWorkload';
```

3. Find the section where commands are registered (look for `context.subscriptions.push`)

4. Add command registration after other command registrations:
```typescript
// Register scale workload command
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.scaleWorkload', scaleWorkloadCommand)
);
```

5. Add comment above registration for clarity

## Files Affected

- `src/extension.ts` - Add import and command registration

## Acceptance Criteria

- [ ] Import statement added at top of file
- [ ] Command registered in activate function
- [ ] Registration added to context.subscriptions array
- [ ] Comment added to identify the command
- [ ] Command registration placed with other command registrations

## Dependencies

- Story 004 (command handler implementation)

## Technical Notes

- Follow existing pattern in extension.ts
- Place registration near other command registrations (viewResourceYAML, deleteResource, etc.)
- Use `registerCommand` with command ID matching package.json

