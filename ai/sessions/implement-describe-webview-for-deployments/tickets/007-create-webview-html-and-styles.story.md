---
story_id: create-webview-html-and-styles
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Create Webview HTML and Styles

## Objective

Create the HTML structure and CSS styles for the deployment describe webview, including all section layouts and visual components.

## Context

The webview HTML provides the UI structure for displaying deployment information. It uses VSCode theme variables for consistent styling and includes sections for all deployment data (overview, replicas, strategy, pod template, conditions, etc.).

## Acceptance Criteria

- [ ] `getWebviewContent()` method exists in DeploymentDescribeWebview
- [ ] Returns complete HTML string with embedded CSS
- [ ] Uses VSCode theme variables (--vscode-foreground, etc.)
- [ ] Includes sections for all deployment data:
  - Header with refresh button
  - Overview card
  - Replica status card with progress bars
  - Rollout strategy card
  - Pod template card
  - Conditions card
  - ReplicaSets card (table)
  - Selectors & Labels card
  - Events card
  - Annotations card
- [ ] Responsive layout with cards/sections
- [ ] Loading indicator placeholders
- [ ] Error message display area
- [ ] Copy buttons for copyable fields
- [ ] Collapsible sections for long content

## Implementation Steps

1. In `DeploymentDescribeWebview.ts`, add `getWebviewContent()` static method
2. Method should accept webview instance to generate nonce and resource URIs if needed
3. Create HTML structure:
```typescript
private static getWebviewContent(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <title>Deployment Describe</title>
        <style>
            /* VSCode theme variables */
            body { ... }
            .card { ... }
            .progress-bar { ... }
            /* ... more styles */
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <h1 id="title">Loading...</h1>
            <button id="refresh-btn">Refresh</button>
        </div>
        
        <!-- Overview Card -->
        <div class="card">
            <h2>Overview</h2>
            <div id="overview-content"></div>
        </div>
        
        <!-- More cards... -->
        
        <div id="error-message" class="error hidden"></div>
        <div id="loading" class="loading">Loading deployment data...</div>
    </body>
    </html>`;
}
```
4. Style cards with borders, padding, margins
5. Create progress bar styles for replica status
6. Create table styles for ReplicaSets and Events
7. Create badge styles for status indicators
8. Use flexbox/grid for responsive layout
9. Keep styles minimal and clean

## Files to Modify

- `src/webview/DeploymentDescribeWebview.ts` - Add getWebviewContent() method

## Notes

- No external CSS files; embed everything in the HTML string
- Use `unsafe-inline` in CSP for styles (standard VSCode webview pattern)
- Defer JavaScript implementation to next story

