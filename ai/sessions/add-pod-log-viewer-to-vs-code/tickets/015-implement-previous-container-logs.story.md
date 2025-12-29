---
story_id: 015-implement-previous-container-logs
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Implement Previous Container Logs for Crashed Pods

## Objective

Add checkbox to view logs from previous container instance for crashed/restarted pods.

## Context

When a pod crashes and restarts, previous logs are valuable for debugging. Kubernetes API provides `previous=true` parameter to fetch these logs.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Previous logs scenarios
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Previous logs checkbox

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add previous toggle handler)
- `src/webview/pod-logs/components/Toolbar.tsx` (modify - show checkbox conditionally)
- `src/webview/PodLogsViewerPanel.ts` (modify - detect crashed pods, handle message)

## Implementation Steps

1. In extension, detect if container has crashed:
   ```typescript
   async function hasContainerCrashed(
     kc: k8s.KubeConfig,
     namespace: string,
     podName: string,
     containerName: string
   ): Promise<boolean> {
     const coreApi = kc.makeApiClient(k8s.CoreV1Api);
     const pod = await coreApi.readNamespacedPod(podName, namespace);
     const status = pod.body.status?.containerStatuses?.find(cs => cs.name === containerName);
     return status?.restartCount > 0 || status?.lastState?.terminated !== undefined;
   }
   ```
2. Send `hasCrashed` flag to webview in initialState
3. In Toolbar, conditionally show checkbox:
   ```tsx
   {pod.hasCrashed && (
     <label>
       <input type="checkbox" checked={preferences.showPrevious} onChange={onTogglePrevious} />
       Show previous container logs
     </label>
   )}
   ```
4. Add toggle handler in App:
   ```typescript
   const handleTogglePrevious = () => {
     const newShowPrevious = !preferences.showPrevious;
     setPreferences({ ...preferences, showPrevious: newShowPrevious });
     vscode.postMessage({ type: 'setPrevious', enabled: newShowPrevious });
   };
   ```
5. In extension, restart stream with `previous: true/false`
6. Show badge: "⚠ Viewing previous container logs" when enabled

## Acceptance Criteria

- [ ] Checkbox appears only for crashed/restarted containers
- [ ] Checking box fetches logs with previous=true
- [ ] Badge appears when viewing previous logs
- [ ] Unchecking returns to current logs
- [ ] Works with multi-container pods
- [ ] State persists per cluster

## Estimated Time

25 minutes

