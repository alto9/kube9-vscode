---
story_id: 003-implement-mode-selection
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: pending
priority: high
estimated_minutes: 15
---

# Implement Apply Mode Quick Pick Selection

## Objective

Add a quick pick dialog that lets users choose between Apply, Dry Run (Server), and Dry Run (Client) options before executing the kubectl command.

## Context

Users need the ability to validate their YAML manifests before actually applying them. The quick pick provides three options:
- **Apply**: Direct apply to cluster
- **Dry Run (Server)**: Server-side validation without persistence
- **Dry Run (Client)**: Client-side validation only

This follows the VS Code pattern of using `showQuickPick` for mode selection.

## Implementation Steps

1. Open `src/commands/applyYAML.ts`
2. Define quick pick items with labels and descriptions:
   ```typescript
   interface ApplyOption {
     label: string;
     description: string;
     mode: ApplyMode;
   }
   ```
3. Create the options array with three choices
4. Call `vscode.window.showQuickPick()` with options
5. Handle user cancellation (Escape key)
6. Pass selected mode to kubectl execution (Story 004)

## Files Affected

- `src/commands/applyYAML.ts` - Add mode selection logic

## Code Structure

```typescript
interface ApplyOption {
  label: string;
  description: string;
  mode: ApplyMode;
}

const applyOptions: ApplyOption[] = [
  {
    label: 'Apply',
    description: 'Apply manifest to cluster',
    mode: 'apply'
  },
  {
    label: 'Dry Run (Server)',
    description: 'Validate against cluster API without persisting',
    mode: 'dry-run-server'
  },
  {
    label: 'Dry Run (Client)',
    description: 'Local validation only',
    mode: 'dry-run-client'
  }
];

async function selectApplyMode(): Promise<ApplyMode | undefined> {
  const selected = await vscode.window.showQuickPick(applyOptions, {
    placeHolder: 'Select apply mode',
    title: 'Apply YAML Manifest'
  });
  return selected?.mode;
}
```

## Acceptance Criteria

- [ ] Quick pick shows three options: Apply, Dry Run (Server), Dry Run (Client)
- [ ] Each option has a descriptive label and description
- [ ] Pressing Escape cancels the operation without executing anything
- [ ] Selected mode is passed to kubectl execution step
- [ ] Quick pick has appropriate title and placeholder text

## Dependencies

- Story 002 (command handler must exist)

