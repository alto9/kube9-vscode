---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - tree-view-error-display
story_id: 006-create-error-tree-item
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

- [ ] File `src/tree/ErrorTreeItem.ts` created
- [ ] ErrorCategory enum with 5 values
- [ ] ErrorTreeItem extends BaseTreeItem
- [ ] Constructor accepts all 4 parameters
- [ ] Error icon is red with errorForeground theme color
- [ ] Tooltip is MarkdownString with error details
- [ ] contextValue set to 'error' for context menus
- [ ] getErrorDescription() returns appropriate text per category
- [ ] retryCallback stored for later use
- [ ] File compiles without errors

## Estimated Time

15 minutes

