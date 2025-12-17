---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 20
---

# Implement Call-to-Action Webview for Non-Operated Clusters

## Objective

Create the call-to-action (CTA) webview HTML that displays when Event Viewer is opened for a cluster without the kube9-operator installed. This encourages operator installation.

## Acceptance Criteria

- [ ] CTA HTML displays for clusters with operator status "basic"
- [ ] CTA explains that operator is required
- [ ] CTA lists benefits of Event Viewer
- [ ] CTA includes "Install Operator" button that opens docs
- [ ] CTA includes "Learn More" link
- [ ] CTA styling matches VS Code theme
- [ ] CTA is centered and visually appealing

## Implementation Steps

### 1. Create getCTAHtml function

**File**: `src/webview/EventViewerPanel.ts`

Replace the `getPlaceholderHtml` method with this:

```typescript
/**
 * Get HTML for the call-to-action (non-operated clusters).
 * 
 * @param clusterName - Display name of cluster
 * @returns HTML string
 */
private static getCTAHtml(clusterName: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Events - ${clusterName}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 40px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                }
                .cta-container {
                    max-width: 600px;
                    text-align: center;
                }
                .cta-icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                }
                h1 {
                    margin-bottom: 20px;
                }
                .cta-message {
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 30px;
                    color: var(--vscode-descriptionForeground);
                }
                .benefits-list {
                    text-align: left;
                    margin: 30px auto;
                    max-width: 400px;
                }
                .benefits-list li {
                    margin: 10px 0;
                    padding-left: 5px;
                }
                .install-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 12px 24px;
                    font-size: 14px;
                    cursor: pointer;
                    border-radius: 2px;
                    margin: 20px 0;
                }
                .install-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .learn-more {
                    display: block;
                    margin-top: 20px;
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                .learn-more:hover {
                    color: var(--vscode-textLink-activeForeground);
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="cta-container">
                <div class="cta-icon">📅</div>
                <h1>Event Viewer</h1>
                <p class="cta-message">
                    This feature requires the kube9 Operator to be installed in your cluster.
                </p>
                <p class="cta-message">
                    The Event Viewer shows a timeline of cluster events including:
                </p>
                <ul class="benefits-list">
                    <li>• Cluster state changes</li>
                    <li>• Operator activities</li>
                    <li>• Insight generation</li>
                    <li>• Assessment results</li>
                    <li>• Workload lifecycle events</li>
                </ul>
                <button class="install-button" onclick="handleInstallOperator()">
                    Install kube9 Operator
                </button>
                <a href="https://docs.kube9.io/operator/overview" 
                   class="learn-more" 
                   onclick="handleLearnMore(event)">
                    Learn more about the operator →
                </a>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                function handleInstallOperator() {
                    vscode.postMessage({ type: 'installOperator' });
                }
                
                function handleLearnMore(event) {
                    event.preventDefault();
                    vscode.postMessage({ 
                        type: 'installOperator' // Opens same docs URL
                    });
                }
            </script>
        </body>
        </html>
    `;
}
```

### 2. Update show() method to use CTA HTML

**File**: `src/webview/EventViewerPanel.ts`

In the `show()` method, replace the line that sets `panel.webview.html` with:

```typescript
// Set the webview's HTML content based on operator status
if (operatorStatus === 'basic') {
    panel.webview.html = EventViewerPanel.getCTAHtml(clusterName);
} else {
    // Event table HTML will be implemented in next story
    panel.webview.html = EventViewerPanel.getPlaceholderHtml(clusterName, operatorStatus);
}
```

Keep the `getPlaceholderHtml` method for now (for operated clusters).

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add getCTAHtml method and update show() method

## Testing

Manual test:
1. Connect to cluster WITHOUT kube9-operator installed
2. Click "Events" tree item
3. Verify CTA webview displays with:
   - Calendar icon (📅)
   - "Event Viewer" title
   - Explanation message
   - Benefits list (5 items)
   - "Install kube9 Operator" button
   - "Learn more" link
4. Click "Install Operator" button
5. Verify browser opens to https://docs.kube9.io/operator/installation
6. Click "Learn more" link
7. Verify browser opens to docs URL

## Dependencies

- Depends on Story 003 (EventViewerPanel)
- Depends on Story 004 (command registration with operator status check)

## Notes

- CTA uses VS Code CSS variables for theme compatibility
- Both "Install Operator" button and "Learn more" link trigger the same action (open installation docs)
- The CTA is simple and focused on the single call-to-action
- Event table HTML for operated clusters will be implemented in the next story

