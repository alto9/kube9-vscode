---
story_id: 009-implement-footer-component
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: completed
---

# Implement Footer Component

## Objective

Create the Footer React component that displays line count and streaming status.

## Context

The footer provides real-time status information about the log display and connection state.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Footer Component section
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Footer scenarios

## Files to Create/Modify

- `src/webview/pod-logs/components/Footer.tsx` (new)
- `src/webview/pod-logs/components/index.ts` (modify - export)
- `src/webview/pod-logs/App.tsx` (modify - render Footer)

## Implementation Steps

1. Create `src/webview/pod-logs/components/Footer.tsx`
2. Define `FooterProps`:
   ```typescript
   interface FooterProps {
     lineCount: number;
     streamStatus: 'connected' | 'disconnected' | 'error';
   }
   ```
3. Create component with two sections:
   - Left: Line count with formatting (e.g., "1,234 lines")
   - Right: Stream status with icon and color
4. Add status icons and colors:
   - connected: ● green "Streaming"
   - disconnected: ⏸ gray "Paused"
   - error: ⚠ red "Error"
5. Use `toLocaleString()` for line count formatting
6. Apply VS Code status bar colors
7. Update App.tsx to render Footer

## Acceptance Criteria

- [ ] Footer displays line count with comma formatting
- [ ] Footer shows streaming status with appropriate icon
- [ ] Status colors: green (connected), gray (paused), red (error)
- [ ] Footer uses VS Code statusBar theme colors
- [ ] Footer updates dynamically as state changes

## Estimated Time

15 minutes

