---
story_id: 005-implement-help-menu-quick-pick
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-commands
  - help-ui-elements
spec_id:
  - help-ui-integration
status: completed
estimated_minutes: 20
---

# Implement Help Menu Quick Pick

## Objective

Implement the `kube9.showHelpMenu` command that displays a quick pick menu with help options when the status bar icon is clicked.

## Context

The quick pick menu provides organized access to all help resources: Documentation, Report Issue, Keyboard Shortcuts, and Getting Started tutorial.

See:
- Feature: `ai/features/help/help-commands.feature.md` (scenarios: Status bar help menu shows all options, Status bar help menu opens tutorial)
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenario: Status bar help icon is clickable)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Quick Help Menu section)

## Implementation

Add to `src/help/HelpController.ts`:

```typescript
export function registerHelpMenuCommand(context: vscode.ExtensionContext, helpController: HelpController): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.showHelpMenu', async () => {
      const selected = await vscode.window.showQuickPick([
        {
          label: '$(book) Documentation',
          description: 'Open Kube9 documentation website',
          action: 'docs'
        },
        {
          label: '$(bug) Report Issue',
          description: 'Report a bug or request a feature',
          action: 'issue'
        },
        {
          label: '$(keyboard) Keyboard Shortcuts',
          description: 'View and customize Kube9 keyboard shortcuts',
          action: 'shortcuts'
        },
        {
          label: '$(question) Getting Started',
          description: 'View the interactive tutorial',
          action: 'tutorial'
        }
      ], {
        placeHolder: 'Select a help option'
      });
      
      if (selected) {
        switch (selected.action) {
          case 'docs':
            await vscode.commands.executeCommand('kube9.openDocumentation');
            break;
          case 'issue':
            await vscode.commands.executeCommand('kube9.reportIssue');
            break;
          case 'shortcuts':
            await vscode.commands.executeCommand('kube9.viewKeyboardShortcuts');
            break;
          case 'tutorial':
            await vscode.commands.executeCommand('kube9.showTutorial');
            break;
        }
      }
    })
  );
}
```

Call this function in `src/extension.ts`:

```typescript
registerHelpMenuCommand(context, helpController);
```

Add to `package.json`:

```json
{
  "command": "kube9.showHelpMenu",
  "title": "Kube9: Show Help Menu",
  "category": "Kube9"
}
```

## Files to Modify

- **UPDATE**: `src/help/HelpController.ts` - Add registerHelpMenuCommand function
- **UPDATE**: `src/extension.ts` - Call registerHelpMenuCommand
- **UPDATE**: `package.json` - Add showHelpMenu command

## Acceptance Criteria

- [ ] showHelpMenu command registered
- [ ] Quick pick displays four options with icons and descriptions
- [ ] Selecting "Documentation" runs openDocumentation command
- [ ] Selecting "Report Issue" runs reportIssue command
- [ ] Selecting "Keyboard Shortcuts" runs viewKeyboardShortcuts command
- [ ] Selecting "Getting Started" runs showTutorial command
- [ ] Menu can be dismissed with Escape
- [ ] Placeholder text is "Select a help option"

## Testing Notes

Manual verification:
- Click status bar help icon
- Quick pick menu appears with 4 options
- Each option has icon, label, and description
- Selecting each option runs the correct command
- Pressing Escape closes menu without action

