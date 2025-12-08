---
story_id: wire-webview-command
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-application-webview]
spec_id: [argocd-webview-spec]
diagram_id: [argocd-architecture]
status: pending
priority: high
estimated_minutes: 15
---

# Wire View Details Command to Open Webview

## Objective

Connect the "View Details" command from tree view to open the webview provider with the selected application.

## Context

When users click an application in the tree or select "View Details" from context menu, the webview should open showing that application's details.

## Implementation Steps

1. Open `src/commands/ArgoCDCommands.ts`
2. Implement `viewDetails` command handler
3. Extract application name, namespace, and context from tree item
4. Call `webviewProvider.showApplication(name, namespace, context)`
5. Register command in extension activation
6. Add click handler to ArgoCDCategory tree items
7. Ensure clicking application in tree opens webview

## Files Affected

- `src/commands/ArgoCDCommands.ts` - Add viewDetails handler
- `src/tree/categories/ArgoCDCategory.ts` - Add click handler to tree items

## Acceptance Criteria

- [ ] Clicking application in tree opens webview
- [ ] "View Details" context menu opens webview
- [ ] Correct application data is loaded
- [ ] Webview title shows application name
- [ ] Multiple applications can have webviews open
- [ ] Clicking same application reuses existing webview

## Dependencies

- 014-add-webview-styling (needs complete webview to display)

