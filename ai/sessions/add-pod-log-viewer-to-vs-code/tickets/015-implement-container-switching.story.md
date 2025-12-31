---
story_id: 015-implement-container-switching
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Container Switching in Multi-Container Pods

## Objective

Implement the container selector dropdown that allows switching between containers without closing the panel.

## Context

Multi-container pods need a way to switch between containers. This should stop the current stream and start a new one for the selected container.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Switch container scenario
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Container selector

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add container change handler)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle container switch message)

## Implementation Steps

1. In App, add container change handler:
   ```typescript
   const handleContainerChange = (container: string) => {
     setPod({ ...pod, container });
     setLogs([]); // Clear existing logs
     vscode.postMessage({ type: 'switchContainer', container });
   };
   ```
2. In extension, handle 'switchContainer' message:
   - Stop current stream
   - Update currentPod.container
   - Clear webview logs (send empty logData)
   - Start new stream for selected container
3. For "All Containers":
   - Start separate streams for each container
   - Prefix each log line with container name: `[container-name]`
   - Interleave logs chronologically using timestamps
4. Maintain preferences (follow mode, timestamps) across switches
5. Update toolbar to show new container name

## Acceptance Criteria

- [ ] Container dropdown shows all containers + "All Containers"
- [ ] Selecting container clears logs and starts new stream
- [ ] "All Containers" shows logs from all containers with prefixes
- [ ] Container name updates in toolbar
- [ ] Preferences (follow, timestamps) preserved across switches
- [ ] Stream properly cleaned up when switching

## Estimated Time

30 minutes

