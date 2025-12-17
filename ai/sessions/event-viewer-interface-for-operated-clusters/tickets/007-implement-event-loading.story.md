---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
  - event-query-api-spec
story_type: code
estimated_minutes: 30
---

# Implement Event Loading and Display

## Objective

Implement the backend logic to load events from the operator and send them to the webview, plus the frontend logic to receive and display events in the table.

## Acceptance Criteria

- [ ] `loadEvents` message handler implemented in EventViewerPanel
- [ ] Events queried from operator via EventQueryClient
- [ ] Event data sent to webview via postMessage
- [ ] Webview receives and renders events in table
- [ ] Event icons displayed based on type
- [ ] Severity icons displayed
- [ ] Relative timestamps calculated and displayed
- [ ] Empty state shown when no events
- [ ] Pagination info updated correctly
- [ ] Error handling for query failures

## Implementation Steps

### 1. Implement loadEvents handler in EventViewerPanel

**File**: `src/webview/EventViewerPanel.ts`

Update the `handleWebviewMessage` method to implement the `loadEvents` case:

```typescript
case 'loadEvents':
    await EventViewerPanel.loadEvents(
        panel,
        contextName,
        message.data as any
    );
    break;
```

Add new `loadEvents` method:

```typescript
/**
 * Load events from operator and send to webview.
 * 
 * @param panel - The webview panel
 * @param contextName - Context name
 * @param requestData - Request data from webview
 */
private static async loadEvents(
    panel: vscode.WebviewPanel,
    contextName: string,
    requestData: {
        filters: any;
        page: number;
        perPage: number;
        sortBy?: string;
        sortDirection?: 'asc' | 'desc';
    }
): Promise<void> {
    const panelInfo = EventViewerPanel.openPanels.get(contextName);
    if (!panelInfo) {
        return;
    }

    panel.webview.postMessage({ type: 'loading', data: { isLoading: true } });

    try {
        // Build filter object
        const filters: any = {};
        if (requestData.filters.type) {
            filters.type = [requestData.filters.type];
        }
        if (requestData.filters.severity) {
            filters.severity = [requestData.filters.severity];
        }
        if (requestData.filters.timeRange) {
            filters.since = requestData.filters.timeRange;
        }
        if (requestData.filters.searchText) {
            filters.searchText = requestData.filters.searchText;
        }

        // Query events from operator
        const response = await panelInfo.queryClient.listEvents(
            contextName,
            filters,
            requestData.page,
            requestData.perPage,
            requestData.sortBy,
            requestData.sortDirection
        );

        // Send event data to webview
        panel.webview.postMessage({
            type: 'eventData',
            data: response
        });
    } catch (error: any) {
        console.error('Error loading events:', error);
        panel.webview.postMessage({
            type: 'error',
            data: { error: error.message }
        });
    } finally {
        panel.webview.postMessage({ type: 'loading', data: { isLoading: false } });
    }
}
```

### 2. Add event rendering logic to webview

**File**: `src/webview/EventViewerPanel.ts`

In the `getEventTableHtml` method's `<script>` section, add event rendering logic after the message event listener:

```javascript
// Update the message listener case for eventData:
case 'eventData':
    renderEvents(message.data);
    break;

// Add these functions before the closing script tag:

function getEventTypeIcon(type) {
    const icons = {
        'cluster': '🌐',
        'operator': '🔧',
        'insight': '💡',
        'assessment': '📊',
        'workload': '📦',
        'system': '⚙️'
    };
    return icons[type] || '📄';
}

function getSeverityIcon(severity) {
    const icons = {
        'critical': '🚨',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[severity] || 'ℹ️';
}

function getRelativeTime(timestamp) {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'just now';
    } else if (diffMins < 60) {
        return \`\${diffMins}m ago\`;
    } else if (diffHours < 24) {
        return \`\${diffHours}h ago\`;
    } else {
        return \`\${diffDays}d ago\`;
    }
}

function renderEvents(data) {
    const { events, pagination } = data;

    if (!events || events.length === 0) {
        showEmpty();
        return;
    }

    showTable();

    // Render event rows
    const tbody = document.getElementById('eventTableBody');
    tbody.innerHTML = '';

    events.forEach(event => {
        const row = document.createElement('tr');
        row.className = 'event-row';
        row.dataset.eventId = event.id;
        row.onclick = () => handleEventClick(event.id);

        const typeIcon = getEventTypeIcon(event.type);
        const severityIcon = getSeverityIcon(event.severity);
        const relativeTime = getRelativeTime(event.timestamp);
        const resource = event.objectNamespace && event.objectName
            ? \`\${event.objectNamespace}/\${event.objectName}\`
            : (event.objectKind || 'Cluster');

        row.innerHTML = \`
            <td>
                <span class="event-icon">\${typeIcon}</span>
                <span>\${event.type}</span>
            </td>
            <td>
                <span class="event-icon">\${severityIcon}</span>
                <span>\${event.severity}</span>
            </td>
            <td>\${event.description}</td>
            <td>\${resource}</td>
            <td>\${relativeTime}</td>
        \`;

        tbody.appendChild(row);
    });

    // Update pagination
    updatePagination(pagination);
}

function updatePagination(pagination) {
    const { currentPage, totalPages, totalCount, perPage } = pagination;
    const startIdx = (currentPage - 1) * perPage + 1;
    const endIdx = Math.min(currentPage * perPage, totalCount);

    document.getElementById('pageInfo').textContent = \`Page \${currentPage} of \${totalPages}\`;
    document.getElementById('resultCount').textContent = \`Showing \${startIdx}-\${endIdx} of \${totalCount}\`;

    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
}

function handleEventClick(eventId) {
    // Event expansion will be implemented in next story
    console.log('Event clicked:', eventId);
}
```

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add loadEvents method, update message handler, add rendering logic to HTML

## Testing

Manual test (with operated cluster that has operator with event support):
1. Click "Events" tree item
2. Verify loading state shows briefly
3. Verify events load and display in table
4. Verify each event row shows:
   - Type icon and label
   - Severity icon and label
   - Description
   - Resource (namespace/name or kind)
   - Relative timestamp
5. Apply a filter (e.g., select "Error" severity)
6. Verify table refreshes with filtered events
7. Click "Next Page" button
8. Verify page 2 loads
9. Verify pagination info updates ("Page 2 of X", "Showing 21-40 of Y")
10. Click a column header to sort
11. Verify events re-sort
12. Test with cluster that has no events (verify empty state)

## Dependencies

- Depends on Story 002 (EventQueryClient)
- Depends on Story 003 (EventViewerPanel)
- Depends on Story 006 (Event table HTML)
- Requires operator with event query support

## Notes

- This implements the core event loading and display functionality
- Event expansion (clicking a row) is stubbed out for next story
- Relative timestamps are calculated client-side
- Empty state is shown when no events match filters
- Error handling shows empty state with error message
- Pagination is fully functional
- All filters are properly passed to the operator query

