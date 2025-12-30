---
story_id: 014-implement-timestamps-toggle
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Timestamps Toggle

## Objective

Implement the timestamps toggle button that shows/hides timestamps in log lines.

## Context

Logs can include timestamps from Kubernetes. Users should be able to toggle their visibility.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Toggle timestamps scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Timestamp display

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add toggle handler)
- `src/webview/pod-logs/components/LogDisplay.tsx` (modify - conditional timestamp display)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle toggle message)

## Implementation Steps

1. In App, add timestamps toggle handler:
   ```typescript
   const handleToggleTimestamps = () => {
     const newShowTimestamps = !preferences.showTimestamps;
     setPreferences({ ...preferences, showTimestamps: newShowTimestamps });
     vscode.postMessage({ type: 'toggleTimestamps', enabled: newShowTimestamps });
   };
   ```
2. In LogDisplay, parse timestamps from log lines:
   ```typescript
   function parseLogLine(line: string): { timestamp?: string; content: string } {
     const timestampRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/;
     const match = line.match(timestampRegex);
     if (match) {
       return { timestamp: match[1], content: match[2] };
     }
     return { content: line };
   }
   ```
3. Conditionally render timestamp:
   ```typescript
   {showTimestamps && timestamp && (
     <span className="timestamp">{timestamp}</span>
   )}
   <span className="content">{content}</span>
   ```
4. In extension, handle 'toggleTimestamps' message:
   - Update preferences
   - Restart stream with timestamps parameter
5. Style timestamps as dimmed (gray)

## Acceptance Criteria

- [ ] Timestamps toggle button works
- [ ] When on: timestamps appear before each log line
- [ ] When off: timestamps are hidden
- [ ] Timestamps are gray/dimmed color
- [ ] Timestamp format: "2024-12-29T10:30:45.123Z"
- [ ] Toggle state persists per cluster
- [ ] Button shows correct state (On/Off)

## Estimated Time

20 minutes

