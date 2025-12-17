---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 10
---

# Implement Refresh Handler

## Objective

Implement the refresh button functionality that reloads events from the operator while maintaining current filters and page position.

## Acceptance Criteria

- [ ] Clicking refresh button reloads events
- [ ] Current filters are maintained
- [ ] Current page is maintained
- [ ] Current sort order is maintained
- [ ] Loading state shown during refresh
- [ ] Table updates with latest events
- [ ] Works from any page

## Implementation Steps

### 1. Implement refresh handler in EventViewerPanel

**File**: `src/webview/EventViewerPanel.ts`

Update the `handleWebviewMessage` method to implement the `refresh` case:

```typescript
case 'refresh':
    // Refresh simply calls loadEvents with the same parameters
    // The webview will send the current filters/page/sort state
    await EventViewerPanel.loadEvents(
        panel,
        contextName,
        message.data as any
    );
    break;
```

### 2. Update refresh button in webview HTML

**File**: `src/webview/EventViewerPanel.ts`

In the `getEventTableHtml` method's `<script>` section, update the `handleRefresh` function:

```javascript
function handleRefresh() {
    // Send current state to load latest events
    vscode.postMessage({
        type: 'loadEvents',
        data: {
            filters: currentState.filters,
            page: currentState.page,
            perPage: 20,
            sortBy: currentState.sortBy,
            sortDirection: currentState.sortDirection
        }
    });
}
```

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Update refresh message handler and webview JS

## Testing

Manual test:
1. Open Event Viewer
2. Apply some filters (e.g., type=insight, severity=warning)
3. Navigate to page 2
4. Sort by severity
5. Click refresh button
6. Verify:
   - Loading state shows briefly
   - Events reload
   - Filters still applied (same events shown)
   - Still on page 2
   - Sort order maintained
7. Generate new events in operator (if possible)
8. Click refresh
9. Verify new events appear in table

## Dependencies

- Depends on Story 007 (Event loading)
- Refresh reuses existing loadEvents logic

## Notes

- Refresh maintains all current state (filters, page, sort)
- This is useful for checking for new events without navigating away
- The refresh button is always visible in the header
- No need for auto-refresh initially (can be added as future enhancement)
- Refresh is a simple operation - just requery with current parameters

