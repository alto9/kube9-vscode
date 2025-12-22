---
story_id: 018-create-individual-filter-components
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-filtering
spec_id:
  - event-viewer-components-spec
---

# Create Individual Filter Components

## Objective

Create TypeFilter, TimeRangeFilter, NamespaceFilter, and ResourceTypeFilter components.

## Context

Individual filter controls allow users to narrow down events by various criteria.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/TypeFilter.tsx`
- [x] Create `src/webview/event-viewer/components/TimeRangeFilter.tsx`
- [x] Create `src/webview/event-viewer/components/NamespaceFilter.tsx`
- [x] Create `src/webview/event-viewer/components/ResourceTypeFilter.tsx`
- [x] TypeFilter: Radio or checkbox for Normal/Warning/Error with counts
- [x] TimeRangeFilter: Dropdown with quick options (1h, 24h, 7d, All) + Custom option
- [x] NamespaceFilter: Dropdown with namespace list and counts
- [x] ResourceTypeFilter: Dropdown with resource types (Pod, Deployment, etc.) and counts
- [x] All filters accept: selected value(s), onChange callback, counts/events
- [x] Support "All" option for each filter
- [x] Show counts next to each option
- [x] TypeScript types for all props

## Files Affected

- **Create**: `src/webview/event-viewer/components/TypeFilter.tsx`
- **Create**: `src/webview/event-viewer/components/TimeRangeFilter.tsx`
- **Create**: `src/webview/event-viewer/components/NamespaceFilter.tsx`
- **Create**: `src/webview/event-viewer/components/ResourceTypeFilter.tsx`

## Implementation Notes

**TypeFilter**: Show icon and label for each type with count badge.

**NamespaceFilter**: Extract unique namespaces from events, show with counts.

**ResourceTypeFilter**: Extract unique resource kinds from events.

**Custom Time Range**: For TimeRangeFilter, future enhancement - just placeholder option for now.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-filtering.feature.md`

## Estimated Time

30 minutes

