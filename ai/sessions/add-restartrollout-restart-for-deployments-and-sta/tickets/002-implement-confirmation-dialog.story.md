---
story_id: 002-implement-confirmation-dialog
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: high
estimated_minutes: 25
---

# Implement Restart Confirmation Dialog

## Objective
Create a confirmation dialog that explains the restart operation and includes a "Wait for rollout to complete" checkbox.

## Context
Before restarting a workload, users must see a clear explanation of what will happen. The dialog should explain that this triggers a rolling restart by adding an annotation, and give users the option to wait for the rollout to complete or proceed immediately.

## Implementation Steps

1. Create a helper function `showRestartConfirmationDialog(resourceName: string)`
2. Use VSCode's `showInformationMessage` API with modal option
3. Configure dialog properties:
   - Title: `Restart ${resourceName}`
   - Detail text: Multi-line explanation of rolling restart
   - Buttons: ['Restart', 'Cancel']
   - Checkbox: "Wait for rollout to complete" (unchecked by default)
4. Return dialog result including:
   - confirmed: boolean (true if user clicked Restart)
   - waitForRollout: boolean (checkbox state)
5. Update command handler to:
   - Extract resource name from tree item
   - Show confirmation dialog
   - Return early if user cancelled
   - Pass checkbox state to restart logic

## Files Affected
- `src/commands/restartWorkload.ts` (new file) - Dialog implementation
- `src/extension.ts` - Wire up dialog in command handler

## Acceptance Criteria
- [ ] Dialog shows with correct title including resource name
- [ ] Dialog explains the rolling restart mechanism clearly
- [ ] Checkbox "Wait for rollout to complete" is present and unchecked by default
- [ ] Clicking "Restart" returns confirmed=true
- [ ] Clicking "Cancel" or ESC returns confirmed=false
- [ ] Checkbox state is captured and returned
- [ ] Command handler respects user cancellation

## Dependencies
- 001-register-restart-command (needs command handler to exist)

