---
story_id: 004-implement-container-selection
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Implement Container Selection for Multi-Container Pods

## Objective

Add logic to detect multi-container pods and show QuickPick for container selection before starting log stream.

## Context

When a pod has multiple containers, users must choose which container's logs to view. Single-container pods should automatically select the container without prompting.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-panel.feature.md` - Container selection scenario
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Container Discovery section

## Files to Create/Modify

- `src/webview/PodLogsViewerPanel.ts` (modify)
- `src/providers/LogsProvider.ts` (modify - add getPodContainers method)

## Implementation Steps

1. Add `getPodContainers()` method to LogsProvider:
   ```typescript
   async getPodContainers(namespace: string, podName: string): Promise<string[]> {
     const coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
     const pod = await coreApi.readNamespacedPod(podName, namespace);
     const containers: string[] = [];
     
     if (pod.body.spec?.containers) {
       containers.push(...pod.body.spec.containers.map(c => c.name));
     }
     if (pod.body.spec?.initContainers) {
       containers.push(...pod.body.spec.initContainers.map(c => c.name));
     }
     
     return containers;
   }
   ```
2. Update `PodLogsViewerPanel.show()`:
   - Create LogsProvider instance
   - Fetch containers using `getPodContainers()`
   - If 1 container: auto-select
   - If 2+ containers: show QuickPick with options + "All Containers"
3. Add QuickPick logic:
   ```typescript
   const selection = await vscode.window.showQuickPick(
     [...containers, 'All Containers'],
     { placeHolder: 'Select container to view logs' }
   );
   if (!selection) return; // User cancelled
   ```
4. Pass selected container to panel creation
5. Update PanelInfo to include LogsProvider and containers list

## Acceptance Criteria

- [ ] Single-container pods automatically select the container
- [ ] Multi-container pods show QuickPick
- [ ] QuickPick includes all regular and init containers
- [ ] QuickPick includes "All Containers" option
- [ ] User can cancel container selection (panel not created)
- [ ] Selected container is stored in PanelInfo

## Estimated Time

25 minutes

