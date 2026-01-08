---
story_id: 004-create-help-status-bar-item
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: completed
estimated_minutes: 20
---

# Create Help Status Bar Item

## Objective

Create a persistent help icon in the status bar that provides quick access to help resources via a quick pick menu.

## Context

The status bar help icon is the most visible entry point for users to access help. It should be always present in the far-right of the status bar.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios: Status bar displays help icon, Status bar help icon is clickable, Status bar help icon is keyboard accessible)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Status Bar Integration section)

## Implementation

Create `src/help/HelpStatusBar.ts`:

```typescript
import * as vscode from 'vscode';
import { HelpController } from './HelpController';

export class HelpStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor(private helpController: HelpController) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -1000 // Far right position
    );
    
    this.statusBarItem.text = '$(question) Kube9 Help';
    this.statusBarItem.tooltip = 'Kube9 Help and Documentation';
    this.statusBarItem.command = 'kube9.showHelpMenu';
    
    this.statusBarItem.show();
  }
  
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
```

Update `src/extension.ts` to create and register the status bar:

```typescript
const helpStatusBar = new HelpStatusBar(helpController);
context.subscriptions.push(helpStatusBar);
```

## Files to Modify

- **CREATE**: `src/help/HelpStatusBar.ts`
- **UPDATE**: `src/extension.ts` - Create and register HelpStatusBar

## Acceptance Criteria

- [ ] HelpStatusBar class created with dispose method
- [ ] Status bar item positioned at far right (-1000 priority)
- [ ] Displays "$(question) Kube9 Help" text
- [ ] Has tooltip "Kube9 Help and Documentation"
- [ ] Triggers `kube9.showHelpMenu` command when clicked
- [ ] Shows immediately on extension activation
- [ ] Persists across VSCode sessions
- [ ] Disposed properly when extension deactivates

## Testing Notes

Manual verification:
- Status bar icon appears on far right after activation
- Icon shows question mark symbol and "Kube9 Help" text
- Hovering shows tooltip
- Icon is always visible (doesn't hide)
- Clicking icon triggers command (will implement menu in next story)

