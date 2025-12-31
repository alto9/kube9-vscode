---
story_id: 018-add-keyboard-shortcuts-accessibility
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-ui-spec
status: completed
---

# Add Keyboard Shortcuts and Accessibility Features

## Objective

Implement keyboard shortcuts for common actions and add accessibility features (ARIA labels, keyboard navigation).

## Context

Power users need keyboard shortcuts for efficiency. Accessibility features ensure screen reader users can navigate the log viewer.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Keyboard shortcut scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Accessibility section

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add keyboard event listeners)
- `src/webview/pod-logs/components/Toolbar.tsx` (modify - add ARIA labels)
- `src/webview/pod-logs/components/LogDisplay.tsx` (modify - keyboard navigation)

## Implementation Steps

1. Add keyboard event listener in App:
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       // Ctrl+F / Cmd+F: Open search
       if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
         e.preventDefault();
         handleSearchOpen();
       }
       // Ctrl+R / Cmd+R: Refresh
       if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
         e.preventDefault();
         handleRefresh();
       }
       // Ctrl+Shift+C / Cmd+Shift+C: Copy
       if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
         e.preventDefault();
         handleCopy();
       }
     };
     
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);
   ```
2. Add ARIA labels to all buttons:
   ```tsx
   <button aria-label="Refresh logs" onClick={onRefresh}>
     <span className="codicon codicon-refresh"></span>
   </button>
   ```
3. Make buttons keyboard focusable (tabindex)
4. Add ARIA live region for status updates:
   ```tsx
   <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
     {streamStatus === 'connected' ? 'Logs streaming' : 'Logs paused'}
   </div>
   ```
5. Add screen reader announcements for actions:
   - "Logs copied to clipboard"
   - "Logs refreshed"
   - "Search opened"
6. Ensure focus management for search bar

## Acceptance Criteria

- [ ] Ctrl+F/Cmd+F opens search
- [ ] Ctrl+R/Cmd+R refreshes logs
- [ ] Ctrl+Shift+C/Cmd+Shift+C copies logs
- [ ] All buttons have ARIA labels
- [ ] Tab navigation works through all controls
- [ ] Focus is visible for keyboard navigation
- [ ] Status updates announced to screen readers
- [ ] Action results announced (copy, refresh, etc.)

## Estimated Time

25 minutes

