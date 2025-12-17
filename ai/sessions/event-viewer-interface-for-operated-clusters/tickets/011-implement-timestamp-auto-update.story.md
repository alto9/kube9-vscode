---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 10
---

# Implement Relative Timestamp Auto-Update

## Objective

Implement automatic updating of relative timestamps (e.g., "2m ago" → "3m ago") every 60 seconds to keep the display current without reloading events.

## Acceptance Criteria

- [ ] Relative timestamps update every 60 seconds
- [ ] Updates happen automatically without user action
- [ ] Only visible timestamps are updated (not expanded details)
- [ ] Interval is cleared when panel is disposed
- [ ] Updates work correctly on all pages

## Implementation Steps

### 1. Add timestamp update interval in webview HTML

**File**: `src/webview/EventViewerPanel.ts`

In the `getEventTableHtml` method's `<script>` section, add timestamp update logic at the end:

```javascript
// Auto-update relative timestamps every 60 seconds
let timestampUpdateInterval = null;

function startTimestampUpdates() {
    // Clear any existing interval
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
    }

    // Update every 60 seconds
    timestampUpdateInterval = setInterval(() => {
        updateVisibleTimestamps();
    }, 60000); // 60 seconds
}

function updateVisibleTimestamps() {
    // Only update timestamps in the visible table (not expanded details)
    const rows = document.querySelectorAll('.event-row');
    
    rows.forEach((row, index) => {
        const event = eventsData[index];
        if (!event) return;

        const timeCell = row.querySelector('td:last-child');
        if (timeCell) {
            const relativeTime = getRelativeTime(event.timestamp);
            timeCell.textContent = relativeTime;
        }
    });
}

function stopTimestampUpdates() {
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
        timestampUpdateInterval = null;
    }
}

// Start timestamp updates when events are first rendered
// Update the renderEvents function to start the interval:
function renderEvents(data) {
    const { events, pagination } = data;
    eventsData = events;
    
    // ... existing rendering code ...
    
    // Start timestamp updates after rendering
    startTimestampUpdates();
}

// Stop timestamp updates when window is unloaded
window.addEventListener('beforeunload', () => {
    stopTimestampUpdates();
});
```

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add timestamp update interval logic to webview HTML

## Testing

Manual test:
1. Open Event Viewer with events
2. Note a relative timestamp (e.g., "2m ago")
3. Wait 60 seconds
4. Verify timestamp updates automatically (e.g., to "3m ago")
5. Navigate to page 2
6. Wait 60 seconds
7. Verify timestamps on page 2 also update
8. Expand an event to see exact timestamp
9. Wait 60 seconds
10. Verify:
    - Visible relative timestamp updates
    - Expanded exact timestamp doesn't change (expected)
11. Close Event Viewer panel
12. Verify interval is cleaned up (no console errors)

## Dependencies

- Depends on Story 007 (Event loading and display)

## Notes

- Updates happen every 60 seconds (1 minute)
- Only updates visible timestamps in the table rows
- Expanded event details show exact timestamp which doesn't update
- Interval is properly cleaned up when panel closes
- This provides a better user experience without constant network requests
- If events are older (days/weeks), the update won't be noticeable
- Most useful for recent events (minutes/hours old)

