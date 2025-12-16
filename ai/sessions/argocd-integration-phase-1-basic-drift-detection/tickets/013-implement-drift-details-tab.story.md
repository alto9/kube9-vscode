---
story_id: implement-drift-details-tab
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-application-webview]
spec_id: [argocd-webview-spec, argocd-status-spec]
status: completed
priority: high
estimated_minutes: 30
---

# Implement Drift Details Tab Components

## Objective

Create React components for the Drift Details tab showing resource-level sync status with table display, filtering, and expandable rows.

## Context

The Drift Details tab shows which specific resources are out-of-sync. Users can see resource-level status, filter to show only out-of-sync items, and expand rows for details.

## Implementation Steps

1. Create `src/webview/argocd-application/components/DriftDetailsTab.tsx`
2. Create `OutOfSyncSummary.tsx` - warning banner with count
3. Create `ResourceFilter.tsx` - checkbox to show only out-of-sync
4. Create `ResourceTable.tsx` - table with Kind, Name, Namespace, Sync Status, Health Status
5. Create `ResourceRow.tsx` - expandable table row component
6. Implement row expansion state management
7. Display resource message in expanded section
8. Implement "Show only out-of-sync" filter
9. Add click handler for resource name to navigate to tree
10. Highlight out-of-sync rows with warning background
11. Handle empty state ("No resources found")

## Files Affected

- `src/webview/argocd-application/components/DriftDetailsTab.tsx`
- `src/webview/argocd-application/components/OutOfSyncSummary.tsx`
- `src/webview/argocd-application/components/ResourceFilter.tsx`
- `src/webview/argocd-application/components/ResourceTable.tsx`
- `src/webview/argocd-application/components/ResourceRow.tsx`

## Acceptance Criteria

- [x] Resource table displays all resources
- [x] Out-of-sync summary shows correct count
- [x] Filter toggle works correctly
- [x] Out-of-sync resources highlighted
- [x] Row expansion shows resource message
- [x] Resource name click sends navigate message
- [x] Empty state handled gracefully
- [x] Table is responsive and scrollable

## Dependencies

- 011-create-webview-react-app (needs main app structure)

