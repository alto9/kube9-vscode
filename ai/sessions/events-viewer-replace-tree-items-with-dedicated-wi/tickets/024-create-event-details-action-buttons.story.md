---
story_id: 024-create-event-details-action-buttons
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-actions
spec_id:
  - event-viewer-components-spec
---

# Create Action Buttons in EventDetails

## Objective

Add action buttons to EventDetails component for Copy Message, Go to Resource, and View YAML.

## Context

Users need quick actions on selected event from details pane.

## Acceptance Criteria

- [ ] Add details-actions section to EventDetails component
- [ ] "Copy Message" button: sends copy message to extension with event.message
- [ ] "Go to Resource" button: sends navigate message with resource info
- [ ] "View YAML" button: sends viewYaml message with resource info
- [ ] All buttons use codicon icons (copy, go-to-file, file-code)
- [ ] Buttons are disabled when no event selected
- [ ] Buttons have tooltips
- [ ] TypeScript types for click handlers

## Files Affected

- **Modify**: `src/webview/event-viewer/components/EventDetails.tsx`

## Implementation Notes

**Message Sending**:
```typescript
const handleCopyMessage = () => {
    sendMessage({ type: 'copy', content: event.message });
};

const handleGoToResource = () => {
    sendMessage({
        type: 'navigate',
        resource: {
            namespace: event.involvedObject.namespace,
            kind: event.involvedObject.kind,
            name: event.involvedObject.name
        }
    });
};
```

**Button Layout**: Horizontal row at bottom of details pane.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-actions.feature.md`

## Estimated Time

15 minutes

