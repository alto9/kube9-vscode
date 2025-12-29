---
story_id: 016-add-loading-empty-error-states
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: pending
---

# Add Loading, Empty, and Error States

## Objective

Implement loading spinner, empty state message, and error state displays for the log viewer.

## Context

The log viewer needs proper states for when logs are loading, when no logs exist, and when errors occur.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - Loading, empty, error state scenarios
- `ai/features/webview/pod-logs-viewer/pod-logs-panel.feature.md` - State display scenarios

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add loading/error states)
- `src/webview/pod-logs/components/StateDisplay.tsx` (new - state components)
- `src/webview/pod-logs/styles.css` (modify - state styling)

## Implementation Steps

1. Create `StateDisplay.tsx` with three state components:
   ```tsx
   export const LoadingState: React.FC = () => (
     <div className="state-display loading">
       <div className="spinner" />
       <p>Loading logs...</p>
     </div>
   );
   
   export const EmptyState: React.FC = () => (
     <div className="state-display empty">
       <p>No logs available</p>
       <p className="sub-message">This pod hasn't written any logs yet</p>
     </div>
   );
   
   export const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
     <div className="state-display error">
       <span className="codicon codicon-error"></span>
       <p>{error}</p>
       <button onClick={onRetry}>Retry</button>
     </div>
   );
   ```
2. In App, add state tracking:
   ```typescript
   const [viewState, setViewState] = useState<'loading' | 'loaded' | 'empty' | 'error'>('loading');
   const [errorMessage, setErrorMessage] = useState<string>('');
   ```
3. Handle state transitions in message handler:
   - 'streamStatus' error → set viewState to 'error'
   - First 'logData' with data → set to 'loaded'
   - Stream closes with 0 logs → set to 'empty'
4. Conditionally render states in App:
   ```tsx
   {viewState === 'loading' && <LoadingState />}
   {viewState === 'empty' && <EmptyState />}
   {viewState === 'error' && <ErrorState error={errorMessage} onRetry={handleRetry} />}
   {viewState === 'loaded' && <LogDisplay {...props} />}
   ```
5. Add CSS for loading spinner and state displays

## Acceptance Criteria

- [ ] Loading spinner appears when panel first opens
- [ ] Empty state shows when pod has no logs
- [ ] Error state shows when stream fails
- [ ] Error message includes failure reason
- [ ] Retry button works in error state
- [ ] States are styled appropriately
- [ ] Transitions between states work smoothly

## Estimated Time

25 minutes

