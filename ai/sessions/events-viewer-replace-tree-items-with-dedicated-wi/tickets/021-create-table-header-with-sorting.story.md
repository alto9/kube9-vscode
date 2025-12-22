---
story_id: 021-create-table-header-with-sorting
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create TableHeader with Sorting

## Objective

Create TableHeader component with sortable column headers and sort indicators.

## Context

Table header displays column names and handles click events for sorting.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/TableHeader.tsx`
- [x] Accept props: sortColumn, sortDirection, onSort
- [x] Render column headers: Level, Date/Time, Source, Event ID, Category
- [x] Make headers clickable for sorting
- [x] Show sort indicator (↑ or ↓) on active sort column
- [x] Toggle sort direction on click of same column
- [x] Change sort column on click of different column
- [x] Use appropriate cursor (pointer) on hover
- [x] TypeScript types for props

## Files Affected

- **Create**: `src/webview/event-viewer/components/TableHeader.tsx`

## Implementation Notes

**Sort Indicator**: Unicode arrows ↑ (asc) and ↓ (desc), or codicon equivalents.

**Click Handler**: Call onSort(columnName) which parent handles logic.

**Active Column**: Highlight or bold the active sort column.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`

## Estimated Time

15 minutes

