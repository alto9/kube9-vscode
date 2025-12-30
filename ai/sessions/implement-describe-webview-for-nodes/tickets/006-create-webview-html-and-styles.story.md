---
story_id: create-webview-html-and-styles
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Create Webview HTML Structure and Styles

## Objective

Create the HTML template and CSS styles for the Node Describe webview, including all sections (overview, resources, conditions, pods, addresses, labels, taints, allocation).

## Context

The webview needs a complete HTML structure with VS Code theme-integrated CSS. This follows the structure defined in the spec and matches VS Code's design language.

## Files to Modify

- `src/webview/NodeDescribeWebview.ts`

## Implementation Steps

1. Add private static method `getWebviewContent()`:
```typescript
private static getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string
```

2. Create HTML structure with sections:
   - Header with node title and refresh button
   - Status banner (Ready/NotReady/Unknown indicator)
   - Overview section (info grid with node metadata)
   - Resources section (table with progress bars)
   - Conditions section (table with status indicators)
   - Pods section (sortable table)
   - Addresses section (copyable list)
   - Labels section (key-value list)
   - Taints section (table with effects)
   - Allocation section (progress bars for requests vs limits)

3. Add CSS using VS Code CSS variables:
   - Use --vscode-editor-background, --vscode-foreground, etc.
   - Style progress bars with --vscode-progressBar-background
   - Style status indicators with theme colors (testing icons, warnings)
   - Make tables responsive and readable
   - Add hover effects for interactive elements

4. Add placeholder JavaScript that will receive messages:
```javascript
const vscode = acquireVsCodeApi();
window.addEventListener('message', event => {
  const message = event.data;
  if (message.command === 'updateNodeData') {
    renderNodeData(message.data);
  }
});
```

5. Update show() method to call getWebviewContent() instead of placeholder

## Acceptance Criteria

- [ ] getWebviewContent() method created and returns complete HTML string
- [ ] HTML includes all sections: header, status, overview, resources, conditions, pods, addresses, labels, taints, allocation
- [ ] CSS uses VS Code theme variables for consistent theming
- [ ] Refresh button included in header
- [ ] Progress bars included in resources and allocation sections
- [ ] Tables structured for all data sections
- [ ] Status indicators styled (green for healthy, red for unhealthy)
- [ ] Click-to-copy icons included for addresses, labels, taints
- [ ] JavaScript skeleton included for message handling
- [ ] HTML is valid and properly escaped
- [ ] show() method updated to use getWebviewContent()

## Estimated Time

< 30 minutes

## Dependencies

- Requires story 005 to be completed (need NodeDescribeWebview class)

