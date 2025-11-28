---
story_id: 006-implement-notifications
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: pending
priority: medium
estimated_minutes: 20
---

# Implement Success and Error Notifications

## Objective

Add user notifications that inform users of apply success or failure, with appropriate message formatting and action buttons.

## Context

The spec defines notification patterns:
- **Success**: Show resource count/names and action taken
- **Dry run success**: Indicate validation passed
- **Error**: Show brief error description with "Show Output" action

Notifications should be concise but informative, following VS Code UX patterns.

## Implementation Steps

1. Open `src/commands/applyYAML.ts`
2. Implement success notification logic:
   - Single resource: `{resource} {action}`
   - Multiple resources: `{count} resources applied successfully`
   - Dry run: `Dry run passed: {count} resource(s) validated`
3. Implement error notification logic:
   - Show brief error message
   - Add "Show Output" button to open output channel
4. Parse kubectl output to determine resource count and types

## Files Affected

- `src/commands/applyYAML.ts` - Add notification logic

## Code Structure

```typescript
async function showApplyNotification(
  result: ApplyYAMLResult,
  mode: ApplyMode
): Promise<void> {
  const resourceCount = result.resourcesAffected.length;
  
  let message: string;
  if (mode !== 'apply') {
    // Dry run mode
    message = `Dry run passed: ${resourceCount} resource(s) validated`;
  } else if (resourceCount === 1) {
    // Single resource
    message = result.resourcesAffected[0];
  } else {
    // Multiple resources
    message = `${resourceCount} resources applied successfully`;
  }
  
  await vscode.window.showInformationMessage(message);
}

async function showApplyError(error: KubectlError): Promise<void> {
  const message = error.getUserMessage();
  const action = await vscode.window.showErrorMessage(
    message,
    'Show Output'
  );
  
  if (action === 'Show Output') {
    getOutputChannel().show();
  }
}
```

## Error Message Templates

| Error Type | Message Template |
|------------|------------------|
| YAML syntax | `Invalid YAML syntax: {line info}` |
| Validation | `Validation failed: {field/type}` |
| Connection | `Cluster unreachable` |
| Permission | `Permission denied: {resource}` |
| Not found | `Namespace not found: {name}` |

## Acceptance Criteria

- [ ] Success notification shows for successful apply
- [ ] Single resource shows resource name and action
- [ ] Multiple resources shows count summary
- [ ] Dry run shows validation passed message
- [ ] Error notification shows brief, actionable message
- [ ] "Show Output" button opens output channel
- [ ] Notifications don't block user workflow

## Dependencies

- Story 005 (output channel must exist for "Show Output" action)

