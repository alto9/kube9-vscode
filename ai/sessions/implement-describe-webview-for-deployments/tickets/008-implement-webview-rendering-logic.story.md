---
story_id: implement-webview-rendering-logic
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Implement Webview Rendering Logic

## Objective

Add JavaScript to the webview HTML that receives deployment data and renders it into the UI sections.

## Context

The webview needs client-side JavaScript to listen for messages from the extension, render the deployment data into HTML elements, and handle user interactions (refresh, copy, navigate). This follows the pattern from NodeDescribeWebview.

## Acceptance Criteria

- [ ] JavaScript embedded in webview HTML
- [ ] Message listener receives 'updateDeploymentData' messages
- [ ] Renders all deployment sections:
  - Overview with status badge
  - Replica status with progress bars
  - Rollout strategy details
  - Pod template (containers, resources, probes)
  - Conditions with status indicators
  - ReplicaSets table (current highlighted)
  - Selectors & Labels
  - Events (warnings highlighted)
  - Annotations (expandable)
- [ ] Refresh button posts 'refresh' message to extension
- [ ] Copy buttons post 'copyValue' message to extension
- [ ] ReplicaSet names are clickable and post 'navigateToReplicaSet' message
- [ ] Loading indicator shows/hides appropriately
- [ ] Error messages display when errors occur
- [ ] Handles undefined/null values gracefully

## Implementation Steps

1. In `getWebviewContent()` method, add `<script>` tag before closing `</body>`
2. Implement message listener:
```javascript
<script>
(function() {
    const vscode = acquireVsCodeApi();
    
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'updateDeploymentData':
                renderDeploymentData(message.data);
                hideLoading();
                break;
            case 'error':
                showError(message.message);
                hideLoading();
                break;
        }
    });
    
    function renderDeploymentData(data) {
        // Render each section
        renderOverview(data.overview);
        renderReplicaStatus(data.replicaStatus);
        renderStrategy(data.strategy);
        renderPodTemplate(data.podTemplate);
        renderConditions(data.conditions);
        renderReplicaSets(data.replicaSets);
        renderLabels(data.labels, data.selectors);
        renderEvents(data.events);
        renderAnnotations(data.annotations);
    }
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        vscode.postMessage({ command: 'refresh' });
        showLoading();
    });
    
    // Copy functionality
    function setupCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                vscode.postMessage({ command: 'copyValue', value });
            });
        });
    }
})();
</script>
```
3. Implement render functions for each section:
   - `renderOverview()` - Show name, namespace, status badge, replicas summary
   - `renderReplicaStatus()` - Create progress bars for desired/ready/available
   - `renderStrategy()` - Show strategy type, maxSurge, maxUnavailable
   - `renderPodTemplate()` - List containers with images, resources, probes
   - `renderConditions()` - Table with status indicators
   - `renderReplicaSets()` - Table with revision, replicas, clickable names
   - `renderLabels()` - Tables for selectors and labels
   - `renderEvents()` - Table with events (warnings highlighted)
   - `renderAnnotations()` - List with expandable long values
4. Create progress bar HTML dynamically:
```javascript
function createProgressBar(current, total, label) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return `<div class="progress-container">
        <span>${label}: ${current}/${total}</span>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
    </div>`;
}
```
5. Handle warning indicators for unhealthy deployments
6. Make ReplicaSet names clickable and post navigation messages
7. Handle expand/collapse for long annotations

## Files to Modify

- `src/webview/DeploymentDescribeWebview.ts` - Add JavaScript to getWebviewContent()

## Related Patterns

See NodeDescribeWebview webview rendering for reference.

