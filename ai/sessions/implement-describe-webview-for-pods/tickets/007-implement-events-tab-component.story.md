---
story_id: 007-implement-events-tab-component
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 20
---

# Implement Events Tab Component

## Objective

Create the Events tab component that displays Pod events in a timeline format with visual distinction between Normal and Warning events.

## Acceptance Criteria

- [ ] Create `src/webview/pod-describe/components/EventsTab.tsx`
- [ ] Implement EventsTab accepting `events: PodEvent[]` prop
- [ ] Display events in timeline format (most recent first)
- [ ] Each event shows:
  - Type (Normal/Warning) with icon
  - Reason
  - Message
  - Count (if grouped)
  - First and last occurrence timestamps
  - Source component
  - Age
- [ ] Warning events visually distinct (yellow/orange border or background)
- [ ] Normal events styled differently (gray/blue)
- [ ] Handle empty events with message "No events found for this Pod"
- [ ] Format timestamps using relative time (e.g., "5m ago", "2h ago")

## Files Involved

**New Files:**
- `src/webview/pod-describe/components/EventsTab.tsx`

## Implementation Notes

Reference:
- Feature scenarios: `ai/features/webview/pod-describe-webview.feature.md` (lines 280-338)
- Spec CSS: `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 793-825)

Component structure:
```typescript
interface EventsTabProps {
  events: PodEvent[];
}

const EventsTab: React.FC<EventsTabProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>No events found for this Pod</p>
        <p className="hint">Events are retained for ~1 hour by Kubernetes</p>
      </div>
    );
  }

  return (
    <div className="events-tab">
      <div className="events-timeline">
        {events.map((event, index) => (
          <div key={index} className={`event-item event-${event.type.toLowerCase()}`}>
            <div className="event-icon">
              {event.type === 'Warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div className="event-content">
              <div className="event-header">
                <span className="event-reason">{event.reason}</span>
                <span className="event-count">×{event.count}</span>
                <span className="event-age">{event.age}</span>
              </div>
              <div className="event-message">{event.message}</div>
              <div className="event-meta">
                Source: {event.source} | First: {event.firstTimestamp} | Last: {event.lastTimestamp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Dependencies

- Story 006 (PodDescribeApp must exist)

## Testing

- [ ] TypeScript compilation succeeds
- [ ] Component renders with valid data
- [ ] Warning events visually distinct from Normal events
- [ ] Empty state displays correctly
- [ ] Timeline ordering is correct (most recent first)

