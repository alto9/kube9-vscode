---
story_id: 009-implement-toolbar-component
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: pending
---

# Implement Toolbar Component

## Objective

Create the Toolbar React component that displays pod information, container selector, controls, and action buttons.

## Context

The toolbar is the primary control interface for the log viewer, showing pod/namespace/container info and providing buttons for all major actions.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Toolbar Component section
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Toolbar scenarios

## Files to Create/Modify

- `src/webview/pod-logs/components/Toolbar.tsx` (new)
- `src/webview/pod-logs/components/index.ts` (new - exports)
- `src/webview/pod-logs/App.tsx` (modify - import and render Toolbar)

## Implementation Steps

1. Create `src/webview/pod-logs/components/Toolbar.tsx`
2. Define `ToolbarProps` interface with all handlers
3. Create component with three sections:
   - **Pod info section**: Pod name, namespace, container selector
   - **Controls section**: Line limit, timestamps, follow mode toggles
   - **Actions section**: Refresh, clear, copy, export, search buttons
4. Implement container selector:
   - Show dropdown if multiple containers
   - Show static text if single container
5. Add VS Code codicons for all buttons
6. Wire up onClick handlers to call props callbacks
7. Update `App.tsx` to render Toolbar with props
8. Add basic CSS styling

## Acceptance Criteria

- [ ] Toolbar displays pod name, namespace, container
- [ ] Container selector appears for multi-container pods
- [ ] Line limit dropdown shows 50, 100, 500, 1000, 5000, All
- [ ] Timestamps toggle button works
- [ ] Follow mode toggle button works
- [ ] Action buttons render with correct icons
- [ ] All buttons call handler props when clicked
- [ ] Toolbar uses VS Code theme colors

## Estimated Time

30 minutes

