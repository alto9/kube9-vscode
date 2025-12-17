---
diagram_id: event-viewer-flow
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
  - event-query-api-spec
type: flows
---

# Event Viewer Flow Diagram

This diagram illustrates the complete user interaction flow for viewing cluster events through the Event Viewer webview.

```json
{
  "nodes": [
    {
      "id": "user-click",
      "type": "input",
      "data": {
        "label": "User Clicks\n'Events' Tree Item"
      },
      "position": { "x": 250, "y": 0 }
    },
    {
      "id": "check-operator-status",
      "type": "decision",
      "data": {
        "label": "Operator\nInstalled?"
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "show-cta",
      "type": "default",
      "data": {
        "label": "Show Call-to-Action\nWebview"
      },
      "position": { "x": 450, "y": 100 }
    },
    {
      "id": "cta-display",
      "type": "default",
      "data": {
        "label": "Display:\n- Operator required\n- Feature benefits\n- Install button\n- Learn more link"
      },
      "position": { "x": 450, "y": 200 }
    },
    {
      "id": "user-action-cta",
      "type": "decision",
      "data": {
        "label": "User Action?"
      },
      "position": { "x": 450, "y": 300 }
    },
    {
      "id": "open-docs",
      "type": "default",
      "data": {
        "label": "Open Installation\nDocs in Browser"
      },
      "position": { "x": 650, "y": 300 }
    },
    {
      "id": "create-webview",
      "type": "default",
      "data": {
        "label": "Create/Reveal\nEvent Viewer Webview"
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "init-webview",
      "type": "default",
      "data": {
        "label": "Initialize Webview\n- Set title\n- Load HTML/CSS/JS\n- Set up message handler"
      },
      "position": { "x": 250, "y": 300 }
    },
    {
      "id": "show-loading",
      "type": "default",
      "data": {
        "label": "Show Loading State"
      },
      "position": { "x": 250, "y": 400 }
    },
    {
      "id": "query-events",
      "type": "default",
      "data": {
        "label": "Query Events\nfrom Operator\n(kubectl exec)"
      },
      "position": { "x": 250, "y": 500 }
    },
    {
      "id": "build-query",
      "type": "default",
      "data": {
        "label": "Build Query:\n- Default filters\n- Page 1\n- 20 per page\n- Sort by time desc"
      },
      "position": { "x": 250, "y": 600 }
    },
    {
      "id": "exec-kubectl",
      "type": "default",
      "data": {
        "label": "Execute:\nkubectl exec -n kube9-system\ndeploy/kube9-operator --\nkube9-operator query events list"
      },
      "position": { "x": 250, "y": 700 }
    },
    {
      "id": "query-success",
      "type": "decision",
      "data": {
        "label": "Query\nSuccess?"
      },
      "position": { "x": 250, "y": 800 }
    },
    {
      "id": "show-error",
      "type": "default",
      "data": {
        "label": "Show Error Message\n- Error details\n- Retry button"
      },
      "position": { "x": 450, "y": 800 }
    },
    {
      "id": "parse-response",
      "type": "default",
      "data": {
        "label": "Parse JSON Response\n- Events array\n- Pagination info"
      },
      "position": { "x": 250, "y": 900 }
    },
    {
      "id": "check-empty",
      "type": "decision",
      "data": {
        "label": "Any Events?"
      },
      "position": { "x": 250, "y": 1000 }
    },
    {
      "id": "show-empty-state",
      "type": "default",
      "data": {
        "label": "Show Empty State\n'No events found'"
      },
      "position": { "x": 450, "y": 1000 }
    },
    {
      "id": "display-table",
      "type": "default",
      "data": {
        "label": "Display Event Table\n- Type, Severity, Desc\n- Resource, Timestamp\n- Sort indicators"
      },
      "position": { "x": 250, "y": 1100 }
    },
    {
      "id": "display-filters",
      "type": "default",
      "data": {
        "label": "Display Filters\n- Type dropdown\n- Severity dropdown\n- Time range\n- Search box"
      },
      "position": { "x": 250, "y": 1200 }
    },
    {
      "id": "display-pagination",
      "type": "default",
      "data": {
        "label": "Display Pagination\n- Page X of Y\n- Prev/Next buttons\n- Result count"
      },
      "position": { "x": 250, "y": 1300 }
    },
    {
      "id": "wait-interaction",
      "type": "default",
      "data": {
        "label": "Wait for User\nInteraction"
      },
      "position": { "x": 250, "y": 1400 }
    },
    {
      "id": "user-interaction",
      "type": "decision",
      "data": {
        "label": "User Action?"
      },
      "position": { "x": 250, "y": 1500 }
    },
    {
      "id": "apply-filter",
      "type": "default",
      "data": {
        "label": "Apply Filter"
      },
      "position": { "x": 50, "y": 1600 }
    },
    {
      "id": "change-page",
      "type": "default",
      "data": {
        "label": "Change Page"
      },
      "position": { "x": 150, "y": 1600 }
    },
    {
      "id": "expand-event",
      "type": "default",
      "data": {
        "label": "Expand Event\nDetails"
      },
      "position": { "x": 250, "y": 1600 }
    },
    {
      "id": "sort-column",
      "type": "default",
      "data": {
        "label": "Sort by Column"
      },
      "position": { "x": 350, "y": 1600 }
    },
    {
      "id": "refresh",
      "type": "default",
      "data": {
        "label": "Refresh Events"
      },
      "position": { "x": 450, "y": 1600 }
    },
    {
      "id": "show-details",
      "type": "default",
      "data": {
        "label": "Show Expanded Details\n- Full description\n- Event ID\n- Metadata JSON\n- Actions"
      },
      "position": { "x": 250, "y": 1700 }
    },
    {
      "id": "user-action-details",
      "type": "decision",
      "data": {
        "label": "Details Action?"
      },
      "position": { "x": 250, "y": 1800 }
    },
    {
      "id": "view-object",
      "type": "default",
      "data": {
        "label": "View Object\nin Tree View"
      },
      "position": { "x": 450, "y": 1800 }
    },
    {
      "id": "copy-id",
      "type": "default",
      "data": {
        "label": "Copy Event ID\nto Clipboard"
      },
      "position": { "x": 450, "y": 1900 }
    },
    {
      "id": "requery",
      "type": "default",
      "data": {
        "label": "Re-query Events\nwith New Parameters"
      },
      "position": { "x": 50, "y": 1700 }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user-click",
      "target": "check-operator-status",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "check-operator-status",
      "target": "show-cta",
      "label": "No (basic)",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "check-operator-status",
      "target": "create-webview",
      "label": "Yes (operated/enabled)",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "show-cta",
      "target": "cta-display",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "cta-display",
      "target": "user-action-cta",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "user-action-cta",
      "target": "open-docs",
      "label": "Install Operator",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "create-webview",
      "target": "init-webview",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "init-webview",
      "target": "show-loading",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "show-loading",
      "target": "query-events",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "query-events",
      "target": "build-query",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "build-query",
      "target": "exec-kubectl",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "exec-kubectl",
      "target": "query-success",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "query-success",
      "target": "show-error",
      "label": "Error",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "query-success",
      "target": "parse-response",
      "label": "Success",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "show-error",
      "target": "wait-interaction",
      "label": "User can retry",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "parse-response",
      "target": "check-empty",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "check-empty",
      "target": "show-empty-state",
      "label": "No",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "check-empty",
      "target": "display-table",
      "label": "Yes",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "show-empty-state",
      "target": "wait-interaction",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "display-table",
      "target": "display-filters",
      "type": "smoothstep"
    },
    {
      "id": "e21",
      "source": "display-filters",
      "target": "display-pagination",
      "type": "smoothstep"
    },
    {
      "id": "e22",
      "source": "display-pagination",
      "target": "wait-interaction",
      "type": "smoothstep"
    },
    {
      "id": "e23",
      "source": "wait-interaction",
      "target": "user-interaction",
      "type": "smoothstep"
    },
    {
      "id": "e24",
      "source": "user-interaction",
      "target": "apply-filter",
      "label": "Filter/Search",
      "type": "smoothstep"
    },
    {
      "id": "e25",
      "source": "user-interaction",
      "target": "change-page",
      "label": "Next/Previous",
      "type": "smoothstep"
    },
    {
      "id": "e26",
      "source": "user-interaction",
      "target": "expand-event",
      "label": "Click Event Row",
      "type": "smoothstep"
    },
    {
      "id": "e27",
      "source": "user-interaction",
      "target": "sort-column",
      "label": "Click Column",
      "type": "smoothstep"
    },
    {
      "id": "e28",
      "source": "user-interaction",
      "target": "refresh",
      "label": "Refresh Button",
      "type": "smoothstep"
    },
    {
      "id": "e29",
      "source": "apply-filter",
      "target": "requery",
      "type": "smoothstep"
    },
    {
      "id": "e30",
      "source": "change-page",
      "target": "requery",
      "type": "smoothstep"
    },
    {
      "id": "e31",
      "source": "sort-column",
      "target": "requery",
      "type": "smoothstep"
    },
    {
      "id": "e32",
      "source": "refresh",
      "target": "query-events",
      "type": "smoothstep"
    },
    {
      "id": "e33",
      "source": "requery",
      "target": "show-loading",
      "type": "smoothstep"
    },
    {
      "id": "e34",
      "source": "expand-event",
      "target": "show-details",
      "type": "smoothstep"
    },
    {
      "id": "e35",
      "source": "show-details",
      "target": "user-action-details",
      "type": "smoothstep"
    },
    {
      "id": "e36",
      "source": "user-action-details",
      "target": "view-object",
      "label": "View Object",
      "type": "smoothstep"
    },
    {
      "id": "e37",
      "source": "user-action-details",
      "target": "copy-id",
      "label": "Copy Event ID",
      "type": "smoothstep"
    },
    {
      "id": "e38",
      "source": "user-action-details",
      "target": "wait-interaction",
      "label": "Collapse",
      "type": "smoothstep"
    },
    {
      "id": "e39",
      "source": "view-object",
      "target": "wait-interaction",
      "type": "smoothstep"
    },
    {
      "id": "e40",
      "source": "copy-id",
      "target": "wait-interaction",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Description

### Initial Flow

1. **User Initiates**: User clicks "Events" tree item under a cluster context
2. **Operator Check**: Extension checks if operator is installed in cluster
3. **Branch Based on Status**:
   - If operator not installed → Show call-to-action
   - If operator installed → Open Event Viewer

### Call-to-Action Path (Non-Operated)

4. **Show CTA**: Display webview with call-to-action message
5. **CTA Content**: Explain operator requirement, benefits, and installation option
6. **User Action**: User can click "Install Operator" to open docs

### Event Viewer Path (Operated)

4. **Create Webview**: Create or reveal existing Event Viewer webview panel
5. **Initialize**: Set up webview HTML, CSS, JavaScript, and message handlers
6. **Show Loading**: Display loading state while querying
7. **Query Events**: Build and execute kubectl exec query to operator CLI
8. **Build Query**: Construct query with filters, pagination, sorting
9. **Execute kubectl**: Run `kubectl exec` to operator pod
10. **Query Result**: Check if query succeeded or failed
11. **Parse Response**: Parse JSON response with events and pagination info
12. **Check Empty**: Determine if any events were returned
13. **Display UI**: Show event table, filters, and pagination
14. **Wait for Interaction**: Enter interactive state

### User Interactions

15. **Filter/Search**: User applies filters or search
    - Re-query events with new parameters
    - Reset to page 1
16. **Pagination**: User clicks Next/Previous
    - Re-query events with new page number
17. **Sort**: User clicks column header
    - Re-query events with new sort order
18. **Expand Event**: User clicks event row
    - Show expanded details inline
    - Display event ID, metadata, actions
19. **Refresh**: User clicks refresh button
    - Re-query events from scratch
    - Maintain current filters and page

### Event Detail Actions

20. **View Object**: User clicks "View Object" in expanded event
    - Navigate to object in tree view
    - Or open appropriate detail view
21. **Copy Event ID**: User clicks "Copy Event ID"
    - Copy event ID to clipboard
    - Show confirmation toast

### Error Handling

- **Query Error**: Show error message with retry button
- **Empty Results**: Show empty state message
- **Timeout**: Show timeout error with explanation

## Key Decision Points

- **Operator Status**: Determines whether to show CTA or event viewer
- **Query Success**: Determines whether to show error or events
- **Empty Results**: Determines whether to show empty state or table
- **User Interactions**: Determines which action to take (filter, page, expand, etc.)

## Data Flow

```
User → Tree Item Click → Extension
Extension → Check Operator Status
Extension → Create Webview
Extension → kubectl exec → Operator CLI
Operator CLI → Query Events → SQLite DB
Operator CLI → JSON Response → Extension
Extension → Post Message → Webview
Webview → Display Events → User
User → Interaction → Webview
Webview → Post Message → Extension
Extension → Query with New Params → Operator CLI
... (loop continues)
```

## Performance Considerations

- **Lazy Loading**: Only query events when webview is opened
- **Pagination**: Limit results to 20 per page (configurable, max 100)
- **Caching**: Consider caching current page results
- **Debouncing**: Debounce search input to avoid excessive queries
- **Timeout**: Set 30-second timeout for kubectl exec

## Error Recovery

- **Network Errors**: Show retry button, fall back to cached data
- **Timeout Errors**: Show timeout message, suggest checking operator health
- **Parse Errors**: Log error, show generic error message
- **Empty Results**: Show friendly empty state with suggestions

