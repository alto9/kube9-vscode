---
story_id: 014-implement-line-limit-selector
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Implement Line Limit Selector and Custom Input

## Objective

Implement the line limit dropdown that allows users to control how many log lines to fetch (50, 100, 500, 1000, 5000, All, Custom).

## Context

Users need control over how many log lines are fetched, especially for pods with large log volumes. This helps with performance and focuses on recent logs.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Line limit scenarios
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Line limit selector

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add line limit handler)
- `src/webview/pod-logs/components/Toolbar.tsx` (modify - add custom input logic)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle line limit message)

## Implementation Steps

1. In App, add line limit change handler:
   ```typescript
   const handleLineLimitChange = (limit: number | 'all') => {
     setPreferences({ ...preferences, lineLimit: limit });
     vscode.postMessage({ type: 'setLineLimit', limit });
   };
   ```
2. In Toolbar, add dropdown with options:
   ```tsx
   <select value={preferences.lineLimit} onChange={handleChange}>
     <option value="50">50 lines</option>
     <option value="100">100 lines</option>
     <option value="500">500 lines</option>
     <option value="1000">1000 lines</option>
     <option value="5000">5000 lines</option>
     <option value="all">All lines</option>
     <option value="custom">Custom...</option>
   </select>
   ```
3. For "Custom" selection, show input box:
   ```typescript
   if (selected === 'custom') {
     const input = await vscode.window.showInputBox({
       prompt: 'Enter number of lines',
       validateInput: (value) => {
         const num = parseInt(value, 10);
         return isNaN(num) || num < 1 ? 'Please enter a valid number' : null;
       }
     });
     if (input) {
       handleLineLimitChange(parseInt(input, 10));
     }
   }
   ```
4. In extension, handle 'setLineLimit' message:
   - Update preferences
   - Restart stream with new tailLines parameter
5. Update footer to show current line count

## Acceptance Criteria

- [ ] Line limit dropdown shows all options
- [ ] Selecting a limit re-fetches logs with new tail value
- [ ] "Custom..." option prompts for numeric input
- [ ] Input validates that value is a number
- [ ] "All lines" fetches without tail limit
- [ ] Warning shown if "All" exceeds 10,000 lines
- [ ] Line limit persists per cluster

## Estimated Time

25 minutes

