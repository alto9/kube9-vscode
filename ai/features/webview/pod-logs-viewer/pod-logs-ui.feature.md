---
feature_id: pod-logs-ui
name: Pod Logs Viewer UI Components
description: User interface components and layout for the Pod Logs Viewer webview
spec_id:
  - pod-logs-ui-spec
---

# Pod Logs Viewer UI Components

```gherkin
Feature: Pod Logs Viewer UI Components

Scenario: Toolbar displays pod and container information
  Given a user has Pod Logs Viewer open
  And viewing logs for pod "nginx-abc123" in namespace "production"
  And container "nginx"
  Then the toolbar should display:
    | Pod: nginx-abc123 |
    | Namespace: production |
    | Container: nginx |
  And the pod name should be prominently displayed
  And the container name should be clearly visible

Scenario: Container selector dropdown for multi-container pods
  Given a user is viewing logs for a pod with containers ["app", "sidecar", "init-db"]
  And currently viewing container "app"
  Then the toolbar should show a container selector dropdown
  And the dropdown should show "Container: app" with a down arrow
  When they click the container selector
  Then a dropdown menu should appear with options:
    | app (current) |
    | sidecar |
    | init-db |
    | All Containers |
  When they select "sidecar"
  Then logs should switch to container "sidecar"
  And the dropdown should update to show "Container: sidecar"

Scenario: Container selector hidden for single-container pods
  Given a user is viewing logs for a pod with only one container "app"
  Then the toolbar should show "Container: app" as static text
  And no dropdown arrow should be shown
  And clicking the container name should do nothing

Scenario: Line limit selector dropdown
  Given a user has Pod Logs Viewer open
  Then the toolbar should show a line limit selector with default "1000 lines"
  When they click the line limit selector
  Then a dropdown should appear with options:
    | 50 lines |
    | 100 lines |
    | 500 lines |
    | 1000 lines (current) |
    | 5000 lines |
    | All lines |
    | Custom... |
  When they select "500 lines"
  Then the logs should re-fetch with tail=500
  And the selector should update to "500 lines"

Scenario: Custom line limit input
  Given a user clicks the line limit selector
  And selects "Custom..."
  Then an input box should appear
  When they enter "2500"
  And press Enter
  Then logs should fetch with tail=2500
  And the selector should show "2500 lines"
  When they enter an invalid value like "abc"
  Then an error message should show "Please enter a valid number"

Scenario: Timestamps toggle button
  Given a user has Pod Logs Viewer open with timestamps hidden
  Then the toolbar should show a timestamps toggle button (off state)
  When they click the timestamps toggle
  Then timestamps should appear before each log line
  And the button should change to on state
  When they click the toggle again
  Then timestamps should be hidden
  And the button should change to off state

Scenario: Follow mode toggle button
  Given a user has Pod Logs Viewer open with follow mode on
  Then the toolbar should show "Follow: On" with a pause icon
  And new logs should automatically scroll into view
  When they click the follow toggle
  Then follow mode should turn off
  And the button should show "Follow: Off" with a play icon
  And auto-scrolling should stop
  When they click the toggle again
  Then follow mode should turn back on
  And auto-scrolling should resume

Scenario: Previous container logs checkbox
  Given a user is viewing logs for a pod with a crashed container
  Then the toolbar should show a checkbox "Show previous container logs"
  And the checkbox should be unchecked by default
  When they check the "Show previous container logs" checkbox
  Then logs should re-fetch with previous=true parameter
  And the logs should show logs from before the container crashed
  And a badge should appear: "Viewing previous logs"

Scenario: Previous logs option hidden for running containers
  Given a user is viewing logs for a pod with a running container
  And the container has never crashed
  Then the "Show previous container logs" checkbox should not be shown

Scenario: Main log display area
  Given a user has Pod Logs Viewer open with logs loaded
  Then the main area should display log lines in a monospace font
  And each log line should be on a separate row
  And long lines should wrap to multiple lines without horizontal scrolling
  And vertical scrolling should scroll through log history
  And syntax highlighting should be applied for JSON logs
  And each log entry should take as much vertical space as needed

Scenario: Virtual scrolling for performance
  Given a user has logs with 10,000 lines loaded
  When they scroll through the logs
  Then only visible lines should be rendered in the DOM
  And scrolling should be smooth and performant
  And scroll position should update the visible window dynamically
  And line numbers should update correctly

Scenario: Multi-line log entries display fully
  Given a user has logs containing multi-line entries like JSON or stack traces
  And viewing logs with line:
    """
    {"level":"error","timestamp":"2024-12-29T10:30:45.123Z","message":"Request failed","details":{"url":"https://api.example.com","status":500,"error":"Internal Server Error"}}
    """
  Then the complete JSON should display on multiple wrapped lines
  And no horizontal scrolling should be required
  And each log entry should take as much vertical space as needed
  And the log line height should adjust automatically to content

Scenario: Stack traces display naturally across multiple lines
  Given a user has logs containing a stack trace:
    """
    Error: Failed to process request
        at processRequest (/app/src/handlers/api.js:45:15)
        at async handleRoute (/app/src/router.js:123:5)
        at async Server.<anonymous> (/app/src/server.js:89:3)
    """
  Then the entire stack trace should be visible without scrolling
  And each line of the stack trace should wrap naturally
  And the log viewer should calculate the total height dynamically

Scenario: Log line syntax highlighting for JSON
  Given a user has logs containing JSON formatted lines
  Then JSON lines should be syntax highlighted with colors for:
    | keys | blue |
    | strings | green |
    | numbers | orange |
    | booleans | purple |
    | null | gray |
  And non-JSON lines should display as plain text

Scenario: Log line timestamp display
  Given a user has timestamps enabled
  And viewing logs with timestamp data
  Then each line should show timestamp in format: "2024-12-29T10:30:45.123Z"
  And timestamps should be dimmed (gray color)
  And timestamps should be left-aligned before log content
  And timestamps should align vertically in a column

Scenario: Footer status bar displays line count
  Given a user has Pod Logs Viewer open
  And 523 log lines are loaded
  Then the footer should display "523 lines"
  When more logs stream in and total reaches 1,234
  Then the footer should update to "1,234 lines"

Scenario: Footer shows streaming status
  Given a user has Pod Logs Viewer open with follow mode on
  Then the footer should show streaming indicator: "● Streaming"
  And the indicator should be green
  When follow mode is turned off
  Then the footer should show "⏸ Paused"
  And the indicator should be gray

Scenario: Footer shows connection status
  Given a user has Pod Logs Viewer open and connected
  Then the footer should show "Connected"
  When the connection is lost
  Then the footer should show "Disconnected" in red
  When reconnecting
  Then the footer should show "Connecting..." in yellow

Scenario: Action buttons in toolbar
  Given a user has Pod Logs Viewer open
  Then the toolbar should display action buttons:
    | Refresh | ↻ icon |
    | Clear | 🗑 icon |
    | Copy | 📋 icon |
    | Export | 💾 icon |
    | Search | 🔍 icon |
  And each button should show a tooltip on hover
  And buttons should be appropriately spaced

Scenario: Search bar appears when search button clicked
  Given a user has Pod Logs Viewer open
  When they click the Search button (🔍)
  Then a search input box should appear in the toolbar
  And the search box should be focused
  And a placeholder should show "Search logs..."
  When they type "error"
  Then matching log lines should be highlighted
  And the count should show "12 matches"

Scenario: Responsive layout for smaller windows
  Given a user has Pod Logs Viewer open in a wide window
  And the toolbar shows all elements horizontally
  When they resize the window to be narrow
  Then toolbar elements should wrap or collapse gracefully
  And essential controls should remain visible
  And the log display area should adjust to available space

Scenario: Theme integration
  Given a user has VS Code set to dark theme
  Then the Pod Logs Viewer should use dark theme colors
  And text should be light colored on dark background
  And syntax highlighting should use dark theme colors
  When they switch VS Code to light theme
  Then the Pod Logs Viewer should automatically switch to light theme
  And colors should update to light theme palette

Scenario: Loading state display
  Given a user has just opened Pod Logs Viewer
  And logs are being fetched
  Then the main area should show a loading spinner
  And a message "Loading logs from {pod-name}..." should appear
  And the spinner should be centered in the panel
  When logs finish loading
  Then the spinner should disappear
  And logs should be displayed

Scenario: Empty state display
  Given logs have loaded
  And the pod has produced zero log lines
  Then the main area should show an empty state message
  And the message should read "No logs available"
  And a sub-message should explain "This pod hasn't written any logs yet"

Scenario: Error state display
  Given log fetching has failed
  Then the main area should show an error icon
  And an error message should display the failure reason
  And a "Retry" button should be prominently shown
  And a "Close" button should allow dismissing the panel

Scenario: Accessibility features
  Given a user is using screen reader software
  Then all interactive elements should have proper ARIA labels
  And focus should be keyboard navigable
  And action buttons should be keyboard accessible
  And status updates should be announced to screen readers

Scenario: Copy button copies visible logs
  Given a user has 500 log lines displayed
  When they click the "Copy" button
  Then all visible log lines should be copied to clipboard
  And a toast notification should appear: "Logs copied to clipboard"
  And the copied text should preserve line breaks

Scenario: Clear button clears display
  Given a user has 1000 log lines displayed
  When they click the "Clear" button
  Then all displayed log lines should be removed from view
  And the main area should show "Logs cleared. Click Refresh to reload."
  And the line count in footer should show "0 lines"
  And the clear action should not affect the actual pod logs

Scenario: Export button saves logs to file
  Given a user has logs displayed
  When they click the "Export" button
  Then a file save dialog should open
  And the default filename should be "{pod-name}-{container}-{timestamp}.log"
  When they confirm the save
  Then all visible logs should be written to the file
  And a notification should show "Logs exported successfully"

Scenario: Refresh button reloads logs
  Given a user has Pod Logs Viewer open
  And follow mode is off
  When they click the "Refresh" button
  Then logs should be re-fetched from the beginning
  And a brief loading indicator should appear
  And the log display should update with fresh data
  And scroll position should reset to top
```

## UI Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Toolbar                                                          │
│ Pod: nginx-abc123 | Namespace: production | Container: [nginx▼] │
│ [1000 lines▼] [Timestamps: Off] [Follow: On] [⏸]               │
│ [↻] [🗑] [📋] [💾] [🔍] [☐ Show previous logs]                │
├─────────────────────────────────────────────────────────────────┤
│ Main Log Display Area                                            │
│ 2024-12-29T10:30:45.123Z Starting application...                │
│ 2024-12-29T10:30:45.456Z Connected to database                  │
│ 2024-12-29T10:30:46.789Z {"level":"info","msg":"Server ready"}  │
│ ...                                                              │
│ (Virtual scrolling, thousands of lines possible)                 │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Footer Status Bar                                                │
│ 1,234 lines | ● Streaming | Connected                          │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

- **React Components**: Toolbar, LogDisplay, Footer, Search
- **VS Code Webview**: Theme integration via CSS variables
- **Message Protocol**: User actions sent to extension host
- **State Management**: React state for UI interactions

