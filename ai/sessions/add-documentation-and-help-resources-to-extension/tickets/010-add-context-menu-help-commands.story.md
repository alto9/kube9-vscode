---
story_id: 010-add-context-menu-help-commands
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: pending
estimated_minutes: 20
---

# Add Context Menu Help Commands

## Objective

Add help commands for resource types (pods, deployments, services) that open resource-specific documentation when accessed from context menus.

## Context

Users should be able to right-click on resources in the tree view and access help documentation specific to that resource type.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios: Context menu shows help for pods, Context menu shows help for deployments, Context menu shows help for services)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Context Menu Integration section)

## Implementation

Add to `src/help/HelpController.ts`:

```typescript
export function registerContextMenuHelpCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.helpForPods', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/pods/')
      );
    }),
    
    vscode.commands.registerCommand('kube9.helpForDeployments', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/deployments/')
      );
    }),
    
    vscode.commands.registerCommand('kube9.helpForServices', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/services/')
      );
    })
  );
}
```

Call in `src/extension.ts`:

```typescript
registerContextMenuHelpCommands(context);
```

Add to `package.json`:

```json
{
  "commands": [
    {
      "command": "kube9.helpForPods",
      "title": "Help: Working with Pods"
    },
    {
      "command": "kube9.helpForDeployments",
      "title": "Help: Working with Deployments"
    },
    {
      "command": "kube9.helpForServices",
      "title": "Help: Working with Services"
    }
  ]
}
```

## Files to Modify

- **UPDATE**: `src/help/HelpController.ts` - Add registerContextMenuHelpCommands function
- **UPDATE**: `src/extension.ts` - Call registerContextMenuHelpCommands
- **UPDATE**: `package.json` - Add three help commands

## Acceptance Criteria

- [ ] Three help commands registered: helpForPods, helpForDeployments, helpForServices
- [ ] Each command opens correct documentation URL
- [ ] Commands properly registered in package.json with descriptive titles
- [ ] URLs point to:
  - Pods: `/resources/pods/`
  - Deployments: `/resources/deployments/`
  - Services: `/resources/services/`

## Testing Notes

Unit tests to verify:
- Correct URL for each resource type
- Commands registered properly

Manual testing:
- Commands can be run from command palette
- Correct documentation opens for each command

