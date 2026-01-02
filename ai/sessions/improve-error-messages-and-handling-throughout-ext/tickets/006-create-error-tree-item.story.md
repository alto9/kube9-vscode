---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - tree-view-error-display
story_id: 006-create-error-tree-item
status: completed
---

# Create Error Tree Item Class

## Objective

Create a specialized tree item class for displaying errors in the tree view with error icons, tooltips, and retry callbacks.

## Files to Create

- `src/tree/ErrorTreeItem.ts`

## Dependencies

- None (extends BaseTreeItem which should exist)

## Implementation

Create `src/tree/ErrorTreeItem.ts` with:

1. **ErrorCategory enum**:
   - CONNECTION, PERMISSION, NOT_FOUND, TIMEOUT, UNKNOWN

2. **ErrorTreeItem class** extending BaseTreeItem:
   - Constructor parameters:
     - errorMessage: string
     - errorCategory: ErrorCategory
     - errorDetails?: string
     - retryCallback?: () => Promise<void>
   
   - Set properties:
     - iconPath: red error icon with errorForeground color
     - tooltip: markdown with error details
     - contextValue: 'error'
     - description: category-specific text
   
3. **Private helper methods**:
   - getErrorIcon() - returns ThemeIcon with error symbol
   - buildTooltip() - creates MarkdownString with formatted error
   - getErrorDescription() - returns user-friendly category description

Use the implementation from spec `tree-view-error-display.spec.md` lines 24-92.

## Acceptance Criteria

- [x] File `src/tree/ErrorTreeItem.ts` created
- [x] ErrorCategory enum with 5 values
- [x] ErrorTreeItem extends vscode.TreeItem (not BaseTreeItem which doesn't exist)
- [x] Constructor accepts all 4 parameters
- [x] Error icon is red with errorForeground theme color
- [x] Tooltip is MarkdownString with error details
- [x] contextValue set to 'error' for context menus
- [x] getErrorDescription() returns appropriate text per category
- [x] retryCallback stored for later use
- [x] Unit tests created and passing
- [x] File compiles without errors
- [x] Build succeeds (`npm run build`)
- [x] Tests pass (`npm run test`)

## Estimated Time

15 minutes

