---
diagram_id: error-handling-flow
name: Error Handling Flow
description: Overall flow of error handling from detection through user notification
type: flows
spec_id:
  - error-handler-utility
feature_id:
  - connection-errors
  - rbac-permission-errors
  - resource-not-found-errors
  - api-errors
  - timeout-errors
  - error-ux-improvements
---

# Error Handling Flow

This diagram shows the complete flow of error handling from initial error detection through logging, categorization, and user notification.

```json
{
  "nodes": [
    {
      "id": "error-occurs",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Error Occurs",
        "description": "Exception thrown during operation"
      }
    },
    {
      "id": "catch-error",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Catch Error",
        "description": "Try-catch block captures error"
      }
    },
    {
      "id": "categorize",
      "type": "default",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "Categorize Error",
        "description": "Determine error type (Connection, RBAC, Not Found, API, Timeout)"
      }
    },
    {
      "id": "specific-handler",
      "type": "default",
      "position": { "x": 100, "y": 400 },
      "data": {
        "label": "Specific Error Handler",
        "description": "Route to appropriate handler based on type"
      }
    },
    {
      "id": "build-details",
      "type": "default",
      "position": { "x": 100, "y": 500 },
      "data": {
        "label": "Build Error Details",
        "description": "Create ErrorDetails object with message, context, actions"
      }
    },
    {
      "id": "main-handler",
      "type": "default",
      "position": { "x": 100, "y": 600 },
      "data": {
        "label": "Main Error Handler",
        "description": "ErrorHandler.handleError()"
      }
    },
    {
      "id": "log-output",
      "type": "default",
      "position": { "x": 350, "y": 650 },
      "data": {
        "label": "Log to Output Panel",
        "description": "Write detailed logs"
      }
    },
    {
      "id": "track-metrics",
      "type": "default",
      "position": { "x": 350, "y": 750 },
      "data": {
        "label": "Track Metrics",
        "description": "Record error count by type"
      }
    },
    {
      "id": "check-throttle",
      "type": "default",
      "position": { "x": 100, "y": 750 },
      "data": {
        "label": "Check Throttle",
        "description": "Should error be throttled?"
      }
    },
    {
      "id": "throttled",
      "type": "default",
      "position": { "x": -150, "y": 850 },
      "data": {
        "label": "Throttled",
        "description": "Skip notification, only log"
      }
    },
    {
      "id": "display-error",
      "type": "default",
      "position": { "x": 100, "y": 900 },
      "data": {
        "label": "Display Error",
        "description": "Show notification to user"
      }
    },
    {
      "id": "format-message",
      "type": "default",
      "position": { "x": 100, "y": 1000 },
      "data": {
        "label": "Format Message",
        "description": "Create user-friendly message with context"
      }
    },
    {
      "id": "add-actions",
      "type": "default",
      "position": { "x": 100, "y": 1100 },
      "data": {
        "label": "Add Action Buttons",
        "description": "Retry, View Logs, Copy Details, etc."
      }
    },
    {
      "id": "show-notification",
      "type": "default",
      "position": { "x": 100, "y": 1200 },
      "data": {
        "label": "Show Notification",
        "description": "vscode.window.showErrorMessage()"
      }
    },
    {
      "id": "user-action",
      "type": "default",
      "position": { "x": 100, "y": 1300 },
      "data": {
        "label": "User Clicks Action",
        "description": "User selects an action button"
      }
    },
    {
      "id": "handle-action",
      "type": "default",
      "position": { "x": 100, "y": 1400 },
      "data": {
        "label": "Handle Action",
        "description": "Execute selected action callback"
      }
    },
    {
      "id": "retry",
      "type": "default",
      "position": { "x": -150, "y": 1500 },
      "data": {
        "label": "Retry Operation",
        "description": "Attempt operation again"
      }
    },
    {
      "id": "view-logs",
      "type": "default",
      "position": { "x": 100, "y": 1500 },
      "data": {
        "label": "View Logs",
        "description": "Open Output Panel"
      }
    },
    {
      "id": "copy-details",
      "type": "default",
      "position": { "x": 350, "y": 1500 },
      "data": {
        "label": "Copy Details",
        "description": "Copy to clipboard"
      }
    },
    {
      "id": "report-issue",
      "type": "default",
      "position": { "x": 600, "y": 1500 },
      "data": {
        "label": "Report Issue",
        "description": "Open GitHub issues"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "error-occurs",
      "target": "catch-error",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "catch-error",
      "target": "categorize",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "categorize",
      "target": "specific-handler",
      "label": "Route by type",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "specific-handler",
      "target": "build-details",
      "label": "Create ErrorDetails",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "build-details",
      "target": "main-handler",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "main-handler",
      "target": "log-output",
      "label": "Log details",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "log-output",
      "target": "track-metrics",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "main-handler",
      "target": "check-throttle",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "check-throttle",
      "target": "throttled",
      "label": "Yes",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "check-throttle",
      "target": "display-error",
      "label": "No",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "display-error",
      "target": "format-message",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "format-message",
      "target": "add-actions",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "add-actions",
      "target": "show-notification",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "show-notification",
      "target": "user-action",
      "label": "Wait for user",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "user-action",
      "target": "handle-action",
      "label": "Button clicked",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "handle-action",
      "target": "retry",
      "label": "Retry",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "handle-action",
      "target": "view-logs",
      "label": "View Logs",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "handle-action",
      "target": "copy-details",
      "label": "Copy Details",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "handle-action",
      "target": "report-issue",
      "label": "Report Issue",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "retry",
      "target": "error-occurs",
      "label": "Loop back",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Flow Description

### Detection Phase
1. **Error Occurs**: Exception is thrown during a Kubernetes operation
2. **Catch Error**: Try-catch block captures the error
3. **Categorize Error**: Determine error type based on error codes, status codes, and patterns

### Handler Routing Phase
4. **Specific Error Handler**: Route to appropriate handler (ConnectionErrorHandler, RBACErrorHandler, etc.)
5. **Build Error Details**: Create `ErrorDetails` object with:
   - Type and severity
   - User-friendly message
   - Technical details
   - Context (cluster, namespace, resource)
   - Suggested actions
   - Action buttons

### Processing Phase
6. **Main Error Handler**: Central `ErrorHandler.handleError()` method processes the error
7. **Log to Output Panel**: Write detailed logs for debugging
8. **Track Metrics**: Record error count by type for analytics

### Throttling Phase
9. **Check Throttle**: Determine if error should be throttled (same error within 5 seconds)
10. **Throttled**: If yes, skip notification but keep logs

### Display Phase
11. **Display Error**: Show error to user
12. **Format Message**: Create user-friendly message with context
13. **Add Action Buttons**: Include Retry, View Logs, Copy Details, Report Issue, etc.
14. **Show Notification**: Display using VS Code's error/warning/info message API

### User Interaction Phase
15. **User Clicks Action**: User selects an action button
16. **Handle Action**: Execute the selected action callback
17. **Action Results**: 
    - **Retry**: Loop back to attempt operation again
    - **View Logs**: Open Output Panel
    - **Copy Details**: Copy error information to clipboard
    - **Report Issue**: Open GitHub issues page with pre-filled template

## Key Design Decisions

- **Centralized handling**: All errors flow through `ErrorHandler.getInstance()`
- **Specific handlers**: Different error types have specialized handlers
- **Throttling**: Prevents notification spam for repeated errors
- **Always log**: Even throttled errors are logged to Output Panel
- **Actionable**: Every error includes at least one action button
- **Context-aware**: Errors include cluster, namespace, resource information

