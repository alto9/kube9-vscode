---
story_id: 010-implement-logdisplay-with-virtual-scrolling
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: completed
---

# Implement LogDisplay Component with Virtual Scrolling

## Objective

Create the LogDisplay React component that renders log lines efficiently using virtual scrolling with `react-window`.

## Context

Virtual scrolling is essential for performance when displaying thousands of log lines. Only visible lines are rendered in the DOM.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Log Display Component section
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Virtual scrolling scenario

## Files to Create/Modify

- `src/webview/pod-logs/components/LogDisplay.tsx` (new)
- `src/webview/pod-logs/components/index.ts` (modify - export)
- `src/webview/pod-logs/App.tsx` (modify - render LogDisplay)
- `package.json` (modify - add react-window dependency)

## Implementation Steps

1. Add `react-window` to dependencies: `npm install react-window`
2. Add types: `npm install --save-dev @types/react-window`
3. Create `src/webview/pod-logs/components/LogDisplay.tsx`
4. Define `LogDisplayProps`:
   ```typescript
   interface LogDisplayProps {
     logs: string[];
     showTimestamps: boolean;
     followMode: boolean;
     searchQuery: string;
     onScrollUp: () => void;
   }
   ```
5. Import `FixedSizeList` from `react-window`
6. Create Row component that renders individual log lines
7. Implement auto-scroll when followMode is on:
   ```typescript
   useEffect(() => {
     if (followMode && listRef.current) {
       listRef.current.scrollToItem(logs.length - 1, 'end');
     }
   }, [logs, followMode]);
   ```
8. Detect scroll up to disable follow mode
9. Parse timestamps from log lines if present
10. Highlight search matches
11. Use monospace font and proper styling

## Acceptance Criteria

- [x] LogDisplay renders using react-window FixedSizeList
- [x] Only visible lines are rendered in DOM
- [x] Scrolling is smooth and performant
- [x] Auto-scroll works when followMode is on
- [x] Scrolling up disables follow mode
- [x] Timestamps are parsed and displayed when enabled
- [x] Search matches are highlighted
- [x] Logs use monospace font

## Estimated Time

30 minutes

