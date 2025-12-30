---
story_id: implement-webview-rendering-logic
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Implement Webview JavaScript Rendering Logic

## Objective

Implement the JavaScript code within the webview HTML that receives NodeDescribeData and renders it into all sections (overview, resources, conditions, pods, addresses, labels, taints, allocation).

## Context

The webview receives NodeDescribeData via postMessage from the extension. JavaScript needs to parse this data and populate all HTML sections with proper formatting, status indicators, and progress bars.

## Files to Modify

- `src/webview/NodeDescribeWebview.ts` (update getWebviewContent() JavaScript section)

## Implementation Steps

1. Implement `renderNodeData(data)` function that:
   - Updates node name in header
   - Sets status banner color and text based on data.overview.status
   - Calls individual render functions for each section

2. Implement section rendering functions:
   - `renderOverview(overview)` - populate info grid
   - `renderResources(resources)` - create table rows with progress bars
   - `renderConditions(conditions)` - create table with status indicators
   - `renderPods(pods)` - create sortable table with pod data
   - `renderAddresses(addresses)` - create list with copy buttons
   - `renderLabels(labels)` - create key-value list with copy buttons
   - `renderTaints(taints)` - create table with taint data
   - `renderAllocation(allocation)` - create progress bars for requests/limits

3. Implement progress bar helper:
```javascript
function createProgressBar(percentage, used, total) {
  // Returns HTML for progress bar with percentage and values
}
```

4. Implement status indicator helper:
```javascript
function getStatusIndicator(status, type) {
  // Returns HTML for status icon (checkmark or warning)
}
```

5. Implement copy-to-clipboard functionality:
```javascript
function setupCopyButtons() {
  // Attaches click handlers to copy icons
  // Posts 'copyValue' message to extension
}
```

6. Implement refresh button handler:
```javascript
document.getElementById('refresh-btn').addEventListener('click', () => {
  vscode.postMessage({ command: 'refresh', data: { nodeName } });
});
```

7. Implement pod navigation handler:
```javascript
function setupPodNavigation() {
  // Attaches click handlers to pod names
  // Posts 'navigateToPod' message to extension
}
```

## Acceptance Criteria

- [ ] renderNodeData() function receives and processes NodeDescribeData
- [ ] Overview section displays all node metadata fields
- [ ] Resources section shows table with progress bars for each resource type
- [ ] Progress bars visually represent usage percentage
- [ ] Conditions section shows status indicators (green/red) with proper logic
- [ ] Pods section displays table with all pod information
- [ ] Addresses section shows copyable address list
- [ ] Labels section shows key-value pairs with copy functionality
- [ ] Taints section shows table with taint details
- [ ] Allocation section shows progress bars for requests and limits
- [ ] Copy buttons post 'copyValue' message to extension
- [ ] Refresh button posts 'refresh' message to extension
- [ ] Pod names post 'navigateToPod' message when clicked
- [ ] Empty states handled (e.g., "No pods running", "No taints")
- [ ] All data formatted properly (CPU cores, memory GiB, relative time)

## Estimated Time

< 30 minutes

## Dependencies

- Requires story 006 to be completed (need HTML structure)

