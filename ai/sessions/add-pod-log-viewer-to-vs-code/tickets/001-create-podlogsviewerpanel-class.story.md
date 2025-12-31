---
story_id: 001-create-podlogsviewerpanel-class
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Create PodLogsViewerPanel Class with Cluster-Specific Registry

## Objective

Create the `PodLogsViewerPanel` class that manages cluster-specific webview panels using the FreeDashboardPanel pattern with `Map<contextName, PanelInfo>`.

## Context

This is the foundation for the pod logs viewer. It establishes the cluster-specific panel pattern where each cluster gets its own log viewer panel that can be reused when viewing different pods within the same cluster.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Panel Management section
- `ai/diagrams/webview/pod-logs-viewer/pod-logs-architecture.diagram.md` - Panel Registry pattern
- `src/dashboard/FreeDashboardPanel.ts` - Reference implementation

## Files to Create/Modify

- `src/webview/PodLogsViewerPanel.ts` (new)
- `src/webview/index.ts` (export)

## Implementation Steps

1. Create `src/webview/PodLogsViewerPanel.ts`
2. Define interfaces:
   ```typescript
   interface PanelInfo {
     panel: vscode.WebviewPanel;
     currentPod: PodInfo;
   }
   
   interface PodInfo {
     name: string;
     namespace: string;
     container: string;
     contextName: string;
     clusterName: string;
   }
   ```
3. Create class with static `openPanels: Map<string, PanelInfo>`
4. Implement static `show()` method:
   - Check if panel exists for `contextName`
   - If exists: reveal and return existing panel
   - If not: create new panel
5. Implement `createPanel()` private method:
   - Create webview panel with:
     - viewType: `kube9PodLogs`
     - title: `Logs: ${clusterName}`
     - enableScripts: true
     - retainContextWhenHidden: true
   - Add panel to registry
   - Set up disposal handler to remove from registry
6. Add placeholder HTML content: "Pod Logs Viewer - Under Construction"
7. Export from `src/webview/index.ts`

## Acceptance Criteria

- [ ] `PodLogsViewerPanel` class exists with cluster-specific registry pattern
- [ ] `show()` method creates new panel or reveals existing for cluster
- [ ] Panel is stored in Map with contextName as key
- [ ] Panel disposal removes entry from registry
- [ ] Panel title shows "Logs: {cluster-name}"
- [ ] Placeholder HTML loads in webview

## Estimated Time

25 minutes

