---
story_id: 002-register-help-commands-package-json
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-commands
spec_id:
  - help-commands
status: completed
estimated_minutes: 15
---

# Register Help Commands in Package.json

## Objective

Add the three help commands to `package.json` contributions so they appear in the command palette with proper titles and categories.

## Context

VSCode requires command contributions in package.json for commands to be discoverable in the command palette. All three help commands need proper metadata.

See:
- Feature: `ai/features/help/help-commands.feature.md`
- Spec: `ai/specs/help/help-commands.spec.md`

## Implementation

Add to `package.json` in the `contributes.commands` section:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kube9.openDocumentation",
        "title": "Kube9: Open Documentation",
        "category": "Kube9"
      },
      {
        "command": "kube9.reportIssue",
        "title": "Kube9: Report Issue",
        "category": "Kube9"
      },
      {
        "command": "kube9.viewKeyboardShortcuts",
        "title": "Kube9: View Keyboard Shortcuts",
        "category": "Kube9"
      }
    ]
  }
}
```

## Files to Modify

- **UPDATE**: `package.json` - Add commands to contributes.commands array

## Acceptance Criteria

- [x] Three help commands added to contributes.commands
- [x] Each command has correct command ID
- [x] Each command has descriptive title starting with "Kube9:"
- [x] All commands have category "Kube9"
- [x] Commands appear in command palette when searched
- [x] Command titles are searchable by "help", "docs", "bug", "shortcuts"

## Testing Notes

Manual verification:
- Open command palette (Cmd/Ctrl+Shift+P)
- Type "Kube9" - all three commands should appear
- Type "help" - commands should appear
- Type "docs" - Open Documentation should appear
- Type "bug" - Report Issue should appear

