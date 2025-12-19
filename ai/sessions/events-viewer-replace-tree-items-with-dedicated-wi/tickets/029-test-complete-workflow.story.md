---
story_id: 029-test-complete-workflow
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-panel
  - event-viewer-ui
  - event-viewer-filtering
  - event-viewer-actions
  - dynamic-namespace-discovery
spec_id: []
---

# Test Complete Workflow End-to-End

## Objective

Perform comprehensive end-to-end testing of Events Viewer functionality to ensure all features work correctly.

## Context

Final verification that all components integrate properly and user workflows function as designed.

## Acceptance Criteria

**Panel Lifecycle**:
- [ ] Click Events category opens webview
- [ ] Command palette "Kube9: Open Events Viewer" works
- [ ] One panel per cluster (reveal existing, don't duplicate)
- [ ] Panel title shows cluster name
- [ ] Multiple cluster panels can be open simultaneously
- [ ] Closing panel cleans up resources

**Data Loading**:
- [ ] Events load on panel open
- [ ] Loading state displays during fetch
- [ ] Events display in table after load
- [ ] Error state shows if operator unavailable
- [ ] Empty state shows if no events

**UI Components**:
- [ ] Three-pane layout renders correctly
- [ ] Filter pane is resizable
- [ ] Event table displays with virtual scrolling
- [ ] Table columns are sortable
- [ ] Event rows are color-coded by type
- [ ] Selected event highlights
- [ ] Details pane shows selected event info
- [ ] Details pane is resizable and collapsible
- [ ] Status bar shows correct counts

**Filtering**:
- [ ] Type filter works (Normal/Warning/Error)
- [ ] Time range filter works
- [ ] Namespace filter works
- [ ] Resource type filter works
- [ ] Search box filters in real-time
- [ ] Multiple filters combine correctly
- [ ] Clear filters button works
- [ ] Filter state persists per cluster

**Actions**:
- [ ] Refresh button refetches events
- [ ] Auto-refresh toggles on/off
- [ ] Auto-refresh updates events every 30s
- [ ] Export to JSON works
- [ ] Export to CSV works
- [ ] Copy event details to clipboard works
- [ ] Navigate to resource works
- [ ] View YAML works

**Dynamic Namespace**:
- [ ] Namespace resolves from ConfigMap when available
- [ ] Namespace falls back to settings when ConfigMap missing
- [ ] Namespace defaults to 'kube9-system' when no config
- [ ] Operator in custom namespace works correctly
- [ ] Settings change invalidates cache

**Theme Integration**:
- [ ] UI matches VS Code dark theme
- [ ] UI matches VS Code light theme
- [ ] Switching themes updates webview

## Files Affected

- **Test**: All implemented components and features

## Implementation Notes

**Testing Approach**:
1. Test with operator in default namespace
2. Test with operator in custom namespace
3. Test with multiple clusters
4. Test filter combinations
5. Test actions and exports
6. Test theme switching
7. Test error scenarios

**Operator Setup**: May need to configure custom namespace for full testing.

## Linked Resources

- All feature files
- All spec files

## Estimated Time

30 minutes

