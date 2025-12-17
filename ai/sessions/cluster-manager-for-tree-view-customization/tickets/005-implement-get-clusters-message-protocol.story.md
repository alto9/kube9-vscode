---
story_id: 005-implement-get-clusters-message-protocol
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
status: completed
---

# Implement Get Clusters Message Protocol

## Objective

Implement the message protocol for the webview to request cluster list from extension, receiving both kubeconfig clusters and current customizations.

## Context

The webview needs to fetch the list of clusters from kubeconfig along with any existing customizations. This establishes the bidirectional message protocol between webview and extension.

See:
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Message Protocol section
- `ai/diagrams/studio/cluster-manager-workflow.diagram.md` - View All Clusters node

## Acceptance Criteria

1. Webview sends `getClusters` message to extension
2. Extension responds with `initialize` message containing:
   - clusters array (from kubeconfig)
   - customizations object (from ClusterCustomizationService)
   - theme ('light' | 'dark')
3. Use existing `KubeconfigService` to get clusters
4. Inject ClusterCustomizationService into webview constructor
5. Add message handlers for both sides
6. Log received data in webview console (no UI yet)

## Files to Modify

- `src/webviews/ClusterManagerWebview.ts`
- Add dependency on `KubeconfigService` and `ClusterCustomizationService`

## Implementation Notes

Message types:
```typescript
// Webview → Extension
{ type: 'getClusters' }

// Extension → Webview
{
  type: 'initialize',
  data: {
    clusters: Array<{ contextName, clusterName, clusterServer, isActive }>,
    customizations: ClusterCustomizationConfig,
    theme: 'light' | 'dark'
  }
}
```

Use `panel.webview.onDidReceiveMessage()` and `panel.webview.postMessage()`

## Estimated Time

25 minutes







