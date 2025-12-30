---
story_id: 013-implement-copy-logs
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Copy Logs to Clipboard

## Objective

Implement the copy button that copies all visible logs to clipboard.

## Context

Users need to quickly copy logs to share with others or paste into bug reports. The copy action should preserve line breaks and optionally include timestamps.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Copy scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Copy button

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add copy handler)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle copy message)

## Implementation Steps

1. In App, add copy handler:
   ```typescript
   const handleCopy = () => {
     vscode.postMessage({
       type: 'copy',
       lines: logs,
       includeTimestamps: preferences.showTimestamps
     });
   };
   ```
2. In extension, handle 'copy' message:
   ```typescript
   case 'copy':
     const text = message.lines.join('\n');
     await vscode.env.clipboard.writeText(text);
     vscode.window.showInformationMessage(
       `${message.lines.length} lines copied to clipboard`
     );
     break;
   ```
3. Wire copy button in Toolbar to handleCopy
4. Show notification after successful copy
5. Preserve line breaks in copied text
6. Include timestamps if they are enabled

## Acceptance Criteria

- [x] Copy button copies all visible logs to clipboard
- [x] Line breaks are preserved
- [x] Timestamps included if timestamps toggle is on
- [x] Notification shows: "X lines copied to clipboard"
- [x] Copied text can be pasted into other applications
- [x] Works with large log volumes (thousands of lines)

## Estimated Time

15 minutes

