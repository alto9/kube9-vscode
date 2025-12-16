---
story_id: 009-add-alias-editing-ui-in-webview
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-alias-management
spec_id:
  - cluster-manager-webview-spec
status: pending
---

# Add Alias Editing UI in Webview

## Objective

Add inline alias editing in the webview cluster list with edit icon, input field, and message protocol to save aliases.

## Context

Users need a UI to set cluster aliases. This adds the inline editing interaction and wires it to the backend service.

See:
- `ai/features/studio/cluster-alias-management.feature.md` - Setting an alias, canceling edit
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Set Alias message

## Acceptance Criteria

1. Display cluster name or alias (prefer alias if exists)
2. Show edit icon next to cluster name
3. Click edit icon → inline input field appears
4. Input pre-filled with current name (alias or context name)
5. Press Enter → send `setAlias` message to extension
6. Press Escape → cancel edit, revert to previous value
7. Show tooltip on hover: display original context name if alias exists
8. Handle `customizationsUpdated` message to refresh UI

## Files to Modify

- `media/cluster-manager/components/ClusterItem.tsx`
- `src/webviews/ClusterManagerWebview.ts` (add setAlias message handler)

## Implementation Notes

```typescript
// Webview → Extension
{ type: 'setAlias', data: { contextName: string, alias: string | null } }

// In ClusterManagerWebview.ts
case 'setAlias':
  await this.customizationService.setAlias(message.data.contextName, message.data.alias);
  // Service emits event, which triggers customizationsUpdated message back
  break;
```

## Estimated Time

30 minutes

