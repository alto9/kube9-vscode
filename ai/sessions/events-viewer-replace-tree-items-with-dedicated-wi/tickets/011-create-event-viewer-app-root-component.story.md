---
story_id: 011-create-event-viewer-app-root-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
  - event-viewer-panel
spec_id:
  - event-viewer-components-spec
---

# Create EventViewerApp Root Component

## Objective

Create the root React component (`EventViewerApp`) that manages webview state and renders child components.

## Context

Root component coordinates all UI state, message handling, and child component rendering.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/EventViewerApp.tsx`
- [ ] Define `EventViewerState` interface with all state properties
- [ ] Use `useState` for managing: events, filters, selectedEvent, loading, error, autoRefreshEnabled, clusterContext
- [ ] Implement `sendMessage` callback using `vscode.postMessage()`
- [ ] Implement message listener in `useEffect` for: initialState, events, loading, error, autoRefreshState
- [ ] Send `ready` message on component mount
- [ ] Implement `handleRefresh` callback
- [ ] Implement `handleFilterChange` callback
- [ ] Implement `handleExport` callback
- [ ] Implement `handleToggleAutoRefresh` callback
- [ ] Implement `handleEventSelect` callback
- [ ] Render Toolbar, ThreePaneLayout, and StatusBar components
- [ ] Pass appropriate props to each child component
- [ ] Add TypeScript types for all callbacks and state

## Files Affected

- **Create**: `src/webview/event-viewer/EventViewerApp.tsx`
- **Create**: `src/webview/event-viewer/index.tsx` (entry point)

## Implementation Notes

**State Structure**:
```typescript
interface EventViewerState {
    events: KubernetesEvent[];
    filteredEvents: KubernetesEvent[];
    filters: EventFilters;
    selectedEvent: KubernetesEvent | null;
    loading: boolean;
    error: string | null;
    autoRefreshEnabled: boolean;
    clusterContext: string;
}
```

**Message Handling**:
- Listen for messages from extension
- Update state based on message type
- Send messages back for user actions

**Entry Point** (`index.tsx`):
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { EventViewerApp } from './EventViewerApp';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<EventViewerApp />);
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

25 minutes

