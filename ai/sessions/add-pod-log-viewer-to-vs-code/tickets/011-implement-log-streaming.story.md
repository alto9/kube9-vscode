---
story_id: 011-implement-log-streaming
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Log Streaming from Kubernetes API

## Objective

Connect LogsProvider to PodLogsViewerPanel and stream logs from Kubernetes API to webview.

## Context

This connects all the pieces: when panel opens, LogsProvider streams logs from Kubernetes API, and logs are sent to webview via messages.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Log Streaming section
- `ai/features/webview/pod-logs-viewer/pod-logs-panel.feature.md` - Streaming scenarios

## Files to Create/Modify

- `src/webview/PodLogsViewerPanel.ts` (modify - start streaming, handle chunks)
- `src/webview/pod-logs/App.tsx` (modify - display streamed logs)

## Implementation Steps

1. In `PodLogsViewerPanel.createPanel()`, start streaming after setup:
   ```typescript
   const preferences = preferencesManager.getPreferences(contextName);
   
   logsProvider.streamLogs(
     namespace,
     podName,
     containerName,
     {
       follow: preferences.followMode,
       tailLines: preferences.lineLimit === 'all' ? undefined : preferences.lineLimit,
       timestamps: preferences.showTimestamps,
       previous: preferences.showPrevious
     },
     (chunk) => this.handleLogData(contextName, chunk),
     (error) => this.handleStreamError(contextName, error),
     () => this.handleStreamClose(contextName)
   );
   ```
2. Implement log data handler:
   - Split chunk into lines
   - Batch lines (collect for 100ms before sending)
   - Send via postMessage as 'logData'
3. Implement error handler:
   - Send 'streamStatus' error message
   - Display error in webview
4. Implement close handler:
   - Send 'streamStatus' disconnected
5. In React App, handle 'logData' messages:
   - Append to logs array
   - Trigger re-render
6. Update stream status in footer

## Acceptance Criteria

- [ ] Logs stream from Kubernetes API when panel opens
- [ ] Log chunks are batched before sending to webview
- [ ] Webview displays streamed logs in real-time
- [ ] Stream errors are captured and displayed
- [ ] Stream close is detected and status updated
- [ ] Follow mode auto-scrolls as logs arrive

## Estimated Time

30 minutes

