---
story_id: 012-implement-message-protocol-webview
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-panel
spec_id:
  - event-viewer-protocol-spec
---

# Implement Message Protocol in Webview

## Objective

Implement TypeScript types and message handling logic for bidirectional communication between webview and extension.

## Context

Webview and extension communicate via postMessage. Need type-safe message definitions and handlers.

## Acceptance Criteria

- [ ] Create `src/types/Events.ts` if not exists
- [ ] Define `KubernetesEvent` interface
- [ ] Define `EventFilters` interface
- [ ] Define `ExtensionMessage` union type (6 message types)
- [ ] Define `WebviewMessage` union type (10 message types)
- [ ] Export `DEFAULT_EVENT_FILTERS` constant
- [ ] Document each message type with JSDoc comments
- [ ] Ensure type safety for message handlers in EventViewerApp
- [ ] Ensure type safety for message handlers in EventViewerPanel

## Files Affected

- **Create/Modify**: `src/types/Events.ts`

## Implementation Notes

**Message Type Definitions**:
```typescript
// Extension → Webview
type ExtensionMessage =
    | { type: 'initialState'; clusterContext: string; filters: EventFilters; autoRefreshEnabled: boolean }
    | { type: 'events'; events: KubernetesEvent[]; loading: false }
    | { type: 'loading'; loading: boolean }
    | { type: 'error'; error: string; loading: false }
    | { type: 'autoRefreshState'; enabled: boolean }
    | { type: 'autoRefreshInterval'; interval: number };

// Webview → Extension
type WebviewMessage =
    | { type: 'ready' }
    | { type: 'load'; filters?: EventFilters }
    | { type: 'refresh' }
    | { type: 'filter'; filters: EventFilters }
    | { type: 'export'; format: 'json' | 'csv'; events: KubernetesEvent[] }
    | { type: 'copy'; content: string }
    | { type: 'navigate'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'viewYaml'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'toggleAutoRefresh'; enabled: boolean }
    | { type: 'setAutoRefreshInterval'; interval: number };
```

**Event Interface**:
```typescript
export interface KubernetesEvent {
    reason: string;
    type: 'Normal' | 'Warning' | 'Error';
    message: string;
    involvedObject: {
        kind: string;
        namespace: string;
        name: string;
    };
    count: number;
    firstTimestamp: string;
    lastTimestamp: string;
}
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-protocol-spec.spec.md`
- Diagram: `ai/diagrams/webview/events-viewer/event-viewer-message-protocol.diagram.md`

## Estimated Time

20 minutes

