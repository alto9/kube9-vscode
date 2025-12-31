---
story_id: 012-implement-follow-mode-toggle
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Follow Mode Toggle and Auto-Scrolling

## Objective

Implement the follow mode toggle button that controls auto-scrolling behavior when new logs arrive.

## Context

Follow mode keeps the log display scrolled to the bottom as new logs stream in. Users can toggle it off to review older logs, and it auto-disables when they scroll up manually.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Follow mode scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - LogDisplay auto-scroll logic

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add toggle handler)
- `src/webview/pod-logs/components/LogDisplay.tsx` (modify - detect scroll up)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle toggle message)

## Implementation Steps

1. Add `handleToggleFollow` in App:
   ```typescript
   const handleToggleFollow = () => {
     const newFollowMode = !preferences.followMode;
     setPreferences({ ...preferences, followMode: newFollowMode });
     vscode.postMessage({ type: 'toggleFollow', enabled: newFollowMode });
   };
   ```
2. In LogDisplay, detect manual scroll up:
   ```typescript
   const handleScroll = ({ scrollOffset }: any) => {
     const scrollHeight = containerRef.current?.scrollHeight || 0;
     const clientHeight = containerRef.current?.clientHeight || 0;
     const isAtBottom = scrollOffset + clientHeight >= scrollHeight - 50;
     
     if (!isAtBottom && followMode) {
       onScrollUp(); // Disable follow mode
     }
   };
   ```
3. Wire `onScrollUp` in App to disable follow mode:
   ```typescript
   const handleScrollUp = () => {
     setPreferences({ ...preferences, followMode: false });
     vscode.postMessage({ type: 'toggleFollow', enabled: false });
   };
   ```
4. In extension, handle 'toggleFollow' message:
   - Update preferences
   - Restart stream with new follow setting
5. Ensure auto-scroll works in LogDisplay when followMode is true

## Acceptance Criteria

- [ ] Follow mode toggle button works
- [ ] When on: logs auto-scroll to bottom as they arrive
- [ ] When off: auto-scrolling stops, manual scroll position preserved
- [ ] Scrolling up automatically disables follow mode
- [ ] Follow mode state persists per cluster
- [ ] Button shows correct state (On/Off)

## Estimated Time

25 minutes

