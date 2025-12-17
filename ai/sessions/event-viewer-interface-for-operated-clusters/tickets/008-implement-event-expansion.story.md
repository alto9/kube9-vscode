---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 25
---

# Implement Event Row Expansion

## Objective

Implement the ability to expand event rows to show detailed information including event ID, exact timestamp, affected object details, metadata JSON, and action buttons.

## Acceptance Criteria

- [ ] Clicking an event row expands it
- [ ] Expanded view shows full event details
- [ ] Event ID displayed
- [ ] Exact timestamp displayed (not relative)
- [ ] Affected object details shown (Kind, Name, Namespace)
- [ ] Metadata displayed as formatted JSON
- [ ] "View Object" button shown if object exists
- [ ] "Copy Event ID" button shown
- [ ] Clicking row again collapses it
- [ ] Only one event expanded at a time

## Implementation Steps

### 1. Add expansion styles to HTML

**File**: `src/webview/EventViewerPanel.ts`

In the `getEventTableHtml` method's `<style>` section, add these styles:

```css
.event-details {
    background-color: var(--vscode-editorWidget-background);
    border-left: 3px solid var(--vscode-focusBorder);
}
.event-details td {
    padding: 20px;
}
.detail-row {
    margin: 8px 0;
}
.detail-label {
    font-weight: 600;
    display: inline-block;
    min-width: 150px;
}
.detail-value {
    font-family: var(--vscode-editor-font-family);
}
.metadata-json {
    background-color: var(--vscode-editor-background);
    padding: 10px;
    border-radius: 3px;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    margin-top: 5px;
}
.action-buttons {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}
.action-button {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 2px;
    font-size: 13px;
}
.action-button:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
}
```

### 2. Update handleEventClick function

**File**: `src/webview/EventViewerPanel.ts`

In the `getEventTableHtml` method's `<script>` section, replace the `handleEventClick` function:

```javascript
let expandedEventId = null;
let eventsData = [];

// Update renderEvents to store events data:
function renderEvents(data) {
    const { events, pagination } = data;
    eventsData = events; // Store for expansion
    
    // ... rest of renderEvents code stays the same ...
}

function handleEventClick(eventId) {
    // If clicking the same event, collapse it
    if (expandedEventId === eventId) {
        collapseEvent(eventId);
        expandedEventId = null;
        return;
    }

    // Collapse any previously expanded event
    if (expandedEventId) {
        collapseEvent(expandedEventId);
    }

    // Expand the clicked event
    expandEvent(eventId);
    expandedEventId = eventId;
}

function expandEvent(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;

    const row = document.querySelector(\`tr[data-event-id="\${eventId}"]\`);
    if (!row) return;

    // Create expanded details row
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'event-details';
    detailsRow.dataset.expandedFor = eventId;

    const detailsCell = document.createElement('td');
    detailsCell.colSpan = 5;

    // Format exact timestamp
    const exactTime = new Date(event.timestamp).toLocaleString();

    // Format object info
    const objectInfo = event.objectKind
        ? \`
            <div class="detail-row">
                <span class="detail-label">Kind:</span>
                <span class="detail-value">\${event.objectKind}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">\${event.objectName || 'N/A'}</span>
            </div>
            \${event.objectNamespace ? \`
            <div class="detail-row">
                <span class="detail-label">Namespace:</span>
                <span class="detail-value">\${event.objectNamespace}</span>
            </div>
            \` : ''}
        \`
        : '<div class="detail-row"><span class="detail-label">Affected Object:</span><span class="detail-value">Cluster-wide</span></div>';

    // Format metadata JSON
    const metadataHtml = event.metadata
        ? \`
            <div class="detail-row">
                <span class="detail-label">Additional Details:</span>
                <div class="metadata-json"><pre>\${JSON.stringify(event.metadata, null, 2)}</pre></div>
            </div>
        \`
        : '';

    // Action buttons
    const viewObjectButton = event.objectKind && event.objectName
        ? \`<button class="action-button" onclick="handleViewObject('\${event.objectKind}', '\${event.objectName}', '\${event.objectNamespace || ''}')">View Object</button>\`
        : '';

    detailsCell.innerHTML = \`
        <div style="padding: 10px;">
            <div class="detail-row">
                <span class="detail-label">Event ID:</span>
                <span class="detail-value">\${event.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">\${event.type}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Severity:</span>
                <span class="detail-value">\${event.severity}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Timestamp:</span>
                <span class="detail-value">\${exactTime}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">\${event.description}</span>
            </div>
            <div style="margin-top: 20px;">
                <strong>Affected Object:</strong>
                \${objectInfo}
            </div>
            \${metadataHtml}
            <div class="action-buttons">
                \${viewObjectButton}
                <button class="action-button" onclick="handleCopyEventId('\${event.id}')">Copy Event ID</button>
            </div>
        </div>
    `;

    detailsRow.appendChild(detailsCell);
    row.after(detailsRow);
}

function collapseEvent(eventId) {
    const detailsRow = document.querySelector(\`tr[data-expanded-for="\${eventId}"]\`);
    if (detailsRow) {
        detailsRow.remove();
    }
}

function handleCopyEventId(eventId) {
    // Copy to clipboard
    navigator.clipboard.writeText(eventId).then(() => {
        // Show temporary success message (you could add a toast notification here)
        console.log('Event ID copied:', eventId);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function handleViewObject(kind, name, namespace) {
    vscode.postMessage({
        type: 'viewObject',
        data: { kind, name, namespace }
    });
}
```

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add expansion styles and logic to HTML

## Testing

Manual test:
1. Open Event Viewer with events
2. Click an event row
3. Verify row expands showing:
   - Event ID
   - Type and Severity
   - Exact timestamp (not relative)
   - Full description
   - Affected object details (Kind, Name, Namespace)
   - Metadata JSON (if exists)
   - "View Object" button (if object exists)
   - "Copy Event ID" button
4. Click "Copy Event ID" button
5. Verify event ID is copied to clipboard (paste to verify)
6. Click another event row
7. Verify first event collapses and second expands
8. Click expanded event again
9. Verify event collapses
10. Test with events that have no object (cluster-wide events)
11. Verify "View Object" button not shown
12. Test with events that have metadata
13. Verify JSON is formatted nicely

## Dependencies

- Depends on Story 007 (Event loading)
- "View Object" action handler will be implemented in next story

## Notes

- Only one event can be expanded at a time
- Clicking an expanded event collapses it
- Event expansion is purely client-side (no additional queries)
- Metadata JSON is formatted with pretty-print
- "View Object" button only shown for events with object references
- Copy Event ID uses clipboard API
- The expanded row has distinct styling to stand out

