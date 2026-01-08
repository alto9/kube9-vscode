---
story_id: 012-create-events-tab
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Create Events Tab Component

## Objective

Create React component for the Events tab showing namespace events in timeline format.

## Acceptance Criteria

- EventsTab component displays events in timeline view
- Events ordered by most recent first (lastTimestamp descending)
- Each event shows: type indicator, reason, message, count, age, source
- Normal events have blue/gray indicator
- Warning events have yellow/orange indicator and are visually prominent
- Event count displayed when >1
- Source component shown in secondary color
- Filter option to show only warnings
- Empty state message when no events found
- Handles event grouping (same events shown once with aggregated count)

## Files to Create/Modify

- `media/describe/NamespaceDescribeApp.tsx` - Add EventsTab component
- Or create separate `media/describe/components/EventsTab.tsx` if preferred

## Implementation Notes

Component structure:
```tsx
const EventsTab: React.FC<{events: NamespaceEvent[]}> = ({events}) => {
  const [showOnlyWarnings, setShowOnlyWarnings] = useState(false);
  
  if (events.length === 0) {
    return <EmptyState message="No events found for this Namespace" />;
  }
  
  const filteredEvents = showOnlyWarnings 
    ? events.filter(e => e.type === 'Warning')
    : events;
  
  return (
    <div className="events-tab">
      <div className="events-controls">
        <label>
          <input 
            type="checkbox" 
            checked={showOnlyWarnings}
            onChange={e => setShowOnlyWarnings(e.target.checked)}
          />
          Show only warnings
        </label>
      </div>
      
      <div className="events-timeline">
        {filteredEvents.map((event, idx) => (
          <EventItem
            key={idx}
            type={event.type}
            reason={event.reason}
            message={event.message}
            count={event.count}
            age={event.age}
            source={event.source}
          />
        ))}
      </div>
    </div>
  );
};
```

EventItem should display:
- Type indicator (icon + color)
- Reason (bold)
- Message (normal)
- Count badge (if count > 1)
- Age (e.g., "2h ago")
- Source (in small, muted text)

## Estimated Time

25 minutes

## Dependencies

- Story 007 (requires NamespaceDescribeApp base)

