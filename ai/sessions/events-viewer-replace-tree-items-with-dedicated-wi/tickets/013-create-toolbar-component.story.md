---
story_id: 013-create-toolbar-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
  - event-viewer-actions
spec_id:
  - event-viewer-components-spec
---

# Create Toolbar Component with Action Buttons

## Objective

Create Toolbar component with RefreshButton, AutoRefreshToggle, ExportButton, and ClearFiltersButton.

## Context

Toolbar provides primary actions for the Events Viewer at the top of the interface.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/Toolbar.tsx`
- [x] Create `src/webview/event-viewer/components/RefreshButton.tsx`
- [x] Create `src/webview/event-viewer/components/AutoRefreshToggle.tsx`
- [x] Create `src/webview/event-viewer/components/ExportButton.tsx`
- [x] Create `src/webview/event-viewer/components/ClearFiltersButton.tsx`
- [x] Toolbar accepts: onRefresh, onExport, onToggleAutoRefresh, autoRefreshEnabled, onFilterChange, filters
- [x] RefreshButton shows refresh icon (codicon-refresh)
- [x] AutoRefreshToggle shows state (On/Off) with appropriate icon
- [x] ExportButton shows dropdown menu with JSON/CSV options
- [x] ClearFiltersButton is disabled when no filters active
- [x] All buttons have tooltips and aria-labels
- [x] Layout buttons in toolbar-left and toolbar-right sections
- [x] Add proper TypeScript types for all props

## Files Affected

- **Create**: `src/webview/event-viewer/components/Toolbar.tsx`
- **Create**: `src/webview/event-viewer/components/RefreshButton.tsx`
- **Create**: `src/webview/event-viewer/components/AutoRefreshToggle.tsx`
- **Create**: `src/webview/event-viewer/components/ExportButton.tsx`
- **Create**: `src/webview/event-viewer/components/ClearFiltersButton.tsx`

## Implementation Notes

**Use VS Code Codicons**: All icons should use codicon CSS classes (e.g., `codicon-refresh`).

**Export Button Dropdown**: Show menu on click, hide when option selected.

**AutoRefresh Toggle**: Visual state indicates on/off, aria-pressed for accessibility.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-actions.feature.md`

## Estimated Time

25 minutes

