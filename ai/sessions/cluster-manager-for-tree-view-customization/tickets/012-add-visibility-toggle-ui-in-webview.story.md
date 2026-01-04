---
story_id: 012-add-visibility-toggle-ui-in-webview
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-visibility-control
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Add Visibility Toggle UI in Webview

## Objective

Add visibility toggle switch to each cluster item in the webview with visual feedback (badge, grayed out styling) and message protocol.

## Context

Users need UI controls to hide/show clusters. This adds the toggle switch and visual indicators for hidden state.

See:
- `ai/features/studio/cluster-visibility-control.feature.md` - Visibility toggle is a switch control, hidden indicator styling
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Toggle Visibility message

## Acceptance Criteria

1. Add toggle switch next to each cluster
2. Switch shows "Visible" (on) or "Hidden" (off)
3. Apply styling to hidden clusters:
   - 50% opacity
   - Gray "Hidden" badge
   - Gray text color
4. Click toggle → send `toggleVisibility` message
5. Handle message in extension, call `setVisibility()`
6. Update UI when `customizationsUpdated` received

## Files to Modify

- `media/cluster-manager/components/ClusterItem.tsx`
- `media/cluster-manager/styles.css`
- `src/webviews/ClusterManagerWebview.ts` (add message handler)

## Implementation Notes

```typescript
// Message
{ type: 'toggleVisibility', data: { contextName: string, hidden: boolean } }

// CSS for hidden cluster
.cluster-item.hidden {
  opacity: 0.5;
}

.cluster-item.hidden .cluster-name {
  color: var(--vscode-descriptionForeground);
}
```

## Estimated Time

25 minutes









