---
story_id: 006-create-react-pod-describe-app
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 25
---

# Create React PodDescribeApp Component

## Objective

Create the root React component for the Pod Describe webview that manages state and renders the appropriate content based on loading/error/success states.

## Acceptance Criteria

- [ ] Create `src/webview/pod-describe/PodDescribeApp.tsx`
- [ ] Create `src/webview/pod-describe/index.tsx` as entry point
- [ ] Implement PodDescribeApp functional component
- [ ] Add state management for `podData`, `error`, `loading`, `activeTab`
- [ ] Set up message listener for extension-to-webview messages
- [ ] Handle `updatePodData` message to populate podData state
- [ ] Handle `showError` message to display error state
- [ ] Implement tab switching logic (activeTab state)
- [ ] Render loading spinner when data not yet loaded
- [ ] Render error display when error exists
- [ ] Render header with pod name and status badge
- [ ] Render tab navigation with active state
- [ ] Render tab content based on activeTab
- [ ] Handle refresh button click (send refresh message to extension)
- [ ] Handle view YAML button click (send viewYaml message to extension)

## Files Involved

**New Files:**
- `src/webview/pod-describe/PodDescribeApp.tsx`
- `src/webview/pod-describe/index.tsx`
- `src/webview/pod-describe/types.ts` (for VSCodeAPI type)

## Implementation Notes

Reference:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 495-571)

Component structure:
```typescript
const PodDescribeApp: React.FC<{ vscode: VSCodeAPI }> = ({ vscode }) => {
  const [podData, setPodData] = useState<PodDescribeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'conditions' | 'events'>('overview');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'updatePodData':
          setPodData(message.data);
          setError(null);
          break;
        case 'showError':
          setError(message.data.message);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ... render logic
};
```

Follow pattern from `src/webview/event-viewer/EventViewerApp.tsx`.

## Dependencies

- Story 005 (HTML/CSS structure must exist)

## Testing

- [ ] TypeScript compilation succeeds
- [ ] No linter errors
- [ ] Component renders without crashing
- [ ] Message listener set up correctly
- [ ] Tab switching updates activeTab state

