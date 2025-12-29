---
feature_id: pod-logs-actions
name: Pod Logs Viewer User Actions
description: Interactive user actions in the Pod Logs Viewer including search, filtering, copy, export, and streaming control
spec_id:
  - pod-logs-panel-spec
  - pod-logs-ui-spec
---

# Pod Logs Viewer User Actions

```gherkin
Feature: Pod Logs Viewer User Actions

Scenario: Search within logs
  Given a user has Pod Logs Viewer open with 500 log lines
  When they click the Search button
  And type "error" in the search input
  Then all log lines containing "error" should be highlighted
  And the search box should show "23 matches"
  And the first match should be scrolled into view
  When they press Enter or click "Next"
  Then the next match should be highlighted and scrolled into view
  When they press Shift+Enter or click "Previous"
  Then the previous match should be highlighted and scrolled into view

Scenario: Case-sensitive search toggle
  Given a user has the search box open
  And they have typed "Error"
  Then matches should be case-insensitive by default (matches "error", "Error", "ERROR")
  When they click the "Case sensitive" toggle button (Aa icon)
  Then matches should become case-sensitive (only matches "Error")
  And the match count should update accordingly

Scenario: Regular expression search
  Given a user has the search box open
  When they click the "Use regular expression" toggle button (.*  icon)
  And type "error|warning|critical"
  Then all lines matching the regex pattern should be highlighted
  And the match count should show total matches

Scenario: Clear search
  Given a user has an active search with highlights
  When they click the X button in the search box
  Then the search input should be cleared
  And all highlights should be removed
  And the search box should close
  And the log view should return to normal

Scenario: Copy all visible logs to clipboard
  Given a user has Pod Logs Viewer open with 200 log lines visible
  When they click the Copy button (📋)
  Then all visible log lines should be copied to clipboard
  And timestamps should be included if timestamps are enabled
  And a notification should appear "200 lines copied to clipboard"

Scenario: Copy selected logs to clipboard
  Given a user has Pod Logs Viewer open
  When they select text from line 50 to line 75 with mouse
  And press Ctrl+C (Cmd+C on Mac)
  Then the selected text should be copied to clipboard
  And line breaks should be preserved

Scenario: Export logs to file with default filename
  Given a user is viewing logs for pod "nginx-abc123", container "nginx"
  When they click the Export button (💾)
  Then a file save dialog should open
  And the default filename should be "nginx-abc123-nginx-2024-12-29-103045.log"
  When they accept the default and save
  Then all visible logs should be written to the file
  And a notification should show "Logs exported to {filepath}"

Scenario: Export logs with custom filename
  Given a user clicks the Export button
  When the save dialog opens
  And they change the filename to "my-debug-logs.txt"
  And save the file
  Then logs should be exported to "my-debug-logs.txt"
  And the file should contain all visible log lines with timestamps (if enabled)

Scenario: Refresh logs manually
  Given a user has Pod Logs Viewer open
  And follow mode is turned off
  And logs were last fetched 5 minutes ago
  When they click the Refresh button (↻)
  Then a loading indicator should briefly appear
  And logs should be re-fetched from the Kubernetes API
  And the log display should update with the latest logs
  And the scroll position should reset to bottom (or top based on settings)
  And a notification should show "Logs refreshed"

Scenario: Clear log display
  Given a user has 1500 log lines displayed
  When they click the Clear button (🗑)
  Then a confirmation dialog should appear: "Clear displayed logs? This will not affect pod logs."
  When they click "Clear"
  Then all log lines should be removed from the display
  And the main area should show "Logs cleared. Click Refresh to reload."
  And the line count should show "0 lines"
  And the actual pod logs in Kubernetes should remain unchanged

Scenario: Cancel clear action
  Given a user clicks the Clear button
  When the confirmation dialog appears
  And they click "Cancel"
  Then the logs should remain displayed
  And no changes should occur

Scenario: Toggle follow mode on
  Given a user has Pod Logs Viewer open with follow mode off
  And logs are not auto-scrolling
  When they click the Follow toggle button
  Then follow mode should turn on
  And the button should show "Follow: On"
  And new log lines should automatically scroll into view
  And the log display should stay scrolled to the bottom

Scenario: Toggle follow mode off
  Given follow mode is on
  And new logs are auto-scrolling
  When they click the Follow toggle button
  Then follow mode should turn off
  And auto-scrolling should stop
  And the user's scroll position should be preserved
  And new logs should continue loading but not auto-scroll

Scenario: Follow mode automatically turns off when user scrolls up
  Given follow mode is on
  And logs are auto-scrolling
  When the user manually scrolls up
  Then follow mode should automatically turn off
  And the button should update to "Follow: Off"
  And a notification should briefly show "Follow mode disabled"

Scenario: Toggle timestamps on
  Given timestamps are currently hidden
  When the user clicks the Timestamps toggle
  Then timestamps should appear before each log line
  And the timestamp format should be "2024-12-29T10:30:45.123Z"
  And timestamps should be dimmed (gray color)
  And the toggle button should show "Timestamps: On"

Scenario: Toggle timestamps off
  Given timestamps are currently shown
  When the user clicks the Timestamps toggle
  Then timestamps should be hidden from all log lines
  And only the log content should be visible
  And the toggle button should show "Timestamps: Off"
  And the display should reflow to use the extra space

Scenario: Change line limit to 100
  Given the current line limit is 1000
  When the user clicks the line limit dropdown
  And selects "100 lines"
  Then logs should be re-fetched with tail=100
  And only the last 100 lines should be displayed
  And the footer should show "100 lines"
  And the dropdown should update to "100 lines"

Scenario: Change line limit to "All lines"
  Given the current line limit is 500
  When the user selects "All lines" from the dropdown
  Then logs should be fetched without a tail limit
  And all available log lines should be displayed
  And the footer should show total line count
  And a warning should appear if logs exceed 10,000 lines: "Large log volume may affect performance"

Scenario: Switch container in multi-container pod
  Given a user is viewing logs for pod "app" with containers ["nginx", "sidecar"]
  And currently viewing "nginx" logs
  When they click the container selector dropdown
  And select "sidecar"
  Then the log display should clear and show loading
  And logs should be fetched for the "sidecar" container
  And the container selector should update to "Container: sidecar"
  And the panel should retain the same scroll settings and follow mode

Scenario: View all containers simultaneously
  Given a user is viewing logs for a multi-container pod
  When they select "All Containers" from the container selector
  Then logs from all containers should be displayed
  And each log line should be prefixed with the container name: "[nginx] log content"
  And logs should be interleaved in chronological order
  And the container selector should show "Container: All Containers"

Scenario: Enable previous container logs for crashed pod
  Given a user is viewing logs for a crashed pod
  And the "Show previous container logs" checkbox is visible
  When they check the checkbox
  Then logs should be re-fetched with previous=true
  And the log display should show logs from before the container crashed
  And a badge should appear at the top: "⚠ Viewing previous container logs"
  And the logs should clearly indicate they are from the previous run

Scenario: Disable previous container logs
  Given previous container logs are currently shown
  When the user unchecks the "Show previous container logs" checkbox
  Then logs should switch back to current container logs
  And the badge "⚠ Viewing previous container logs" should disappear
  And current logs should be fetched and displayed

Scenario: Keyboard shortcut for search
  Given a user has Pod Logs Viewer focused
  When they press Ctrl+F (Cmd+F on Mac)
  Then the search box should open
  And the search input should be focused
  And ready to accept text input

Scenario: Keyboard shortcut for refresh
  Given a user has Pod Logs Viewer focused
  When they press Ctrl+R (Cmd+R on Mac)
  Then logs should refresh immediately
  And a brief "Refreshing..." indicator should appear

Scenario: Keyboard shortcut for copy
  Given a user has Pod Logs Viewer focused
  When they press Ctrl+Shift+C (Cmd+Shift+C on Mac)
  Then all visible logs should be copied to clipboard
  And a notification should confirm the copy action

Scenario: Scroll to top button appears when scrolled down
  Given a user has 5000 log lines loaded
  And they have scrolled down to line 3000
  Then a "Scroll to Top" button should appear in the bottom-right corner
  When they click the "Scroll to Top" button
  Then the view should smoothly scroll to the first log line
  And the button should disappear when reaching the top

Scenario: Scroll to bottom button appears when scrolled up
  Given a user has scrolled up away from the bottom
  And follow mode is off
  Then a "Scroll to Bottom" button should appear in the bottom-right corner
  When they click "Scroll to Bottom"
  Then the view should scroll to the last log line
  And follow mode should automatically turn on
  And the button should disappear

Scenario: Context menu on log line for quick actions
  Given a user has Pod Logs Viewer open
  When they right-click on a specific log line
  Then a context menu should appear with options:
    | Copy Line |
    | Copy Line with Timestamp |
    | Filter to This Level (if log level detected) |
    | Search for This Text |
  When they select "Copy Line"
  Then that log line should be copied to clipboard

Scenario: Double-click to select and copy log line
  Given a user has Pod Logs Viewer open
  When they double-click a log line
  Then the entire line should be selected
  And they can press Ctrl+C to copy it

Scenario: Auto-reconnect on connection loss
  Given a user has Pod Logs Viewer streaming logs
  When the connection to the Kubernetes API is lost
  Then the footer should show "Disconnected" in red
  And streaming should stop
  And the system should automatically attempt to reconnect
  And a notification should show "Connection lost. Reconnecting..."
  When the connection is restored
  Then streaming should resume automatically
  And the footer should show "Connected" in green
  And a notification should show "Reconnected successfully"

Scenario: Retry after error
  Given logs failed to load due to an error
  And an error message is displayed
  When the user clicks the "Retry" button
  Then the error message should be replaced with a loading indicator
  And the logs should be re-fetched from the Kubernetes API
  When the fetch succeeds
  Then logs should display normally

Scenario: Persist user preferences per cluster
  Given a user has set preferences in cluster "production":
    | follow mode | off |
    | timestamps | on |
    | line limit | 500 |
  When they close and reopen the log viewer for "production"
  Then follow mode should be off
  And timestamps should be on
  And line limit should be 500
  When they open logs for cluster "staging"
  Then preferences should be default (follow: on, timestamps: off, line limit: 1000)
  And each cluster should maintain independent preferences
```

## Action Message Protocol

User actions in the webview send messages to the extension host:

- **search**: `{ type: 'search', query: string, options: { caseSensitive, regex } }`
- **copy**: `{ type: 'copy', lines: string[] }`
- **export**: `{ type: 'export', filepath: string, lines: string[] }`
- **refresh**: `{ type: 'refresh', options: { tail, timestamps, previous } }`
- **clear**: `{ type: 'clear' }`
- **toggleFollow**: `{ type: 'toggleFollow', enabled: boolean }`
- **toggleTimestamps**: `{ type: 'toggleTimestamps', enabled: boolean }`
- **setLineLimit**: `{ type: 'setLineLimit', limit: number | 'all' }`
- **switchContainer**: `{ type: 'switchContainer', container: string | 'all' }`
- **setPrevious**: `{ type: 'setPrevious', enabled: boolean }`

## Integration Points

- **LogsProvider**: Executes actions by interacting with Kubernetes API
- **VS Code API**: File save dialogs, clipboard operations
- **Extension State**: Persists user preferences per cluster
- **Message Protocol**: Webview ↔ Extension communication

