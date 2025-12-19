---
feature_id: event-viewer-actions
name: Event Viewer Actions
description: User actions in Events Viewer including export, copy, navigation to resources, refresh, and filter management
spec_id:
  - event-viewer-panel-spec
  - event-viewer-protocol-spec
---

# Event Viewer Actions

```gherkin
Feature: Event Viewer Actions

Scenario: Manual refresh events
  Given the Events Viewer is open with events displayed
  When a user clicks the "Refresh" button in the toolbar
  Then events should be immediately re-fetched from the operator
  And a brief "Refreshing..." indicator should appear
  And the table should update with current events
  And existing filters should remain applied
  And the last refresh time should update in the status bar

Scenario: Export all events to JSON
  Given the Events Viewer displays events
  When a user clicks the "Export" button
  And selects "Export as JSON"
  Then a file save dialog should appear
  And the default filename should be "events-{cluster}-{timestamp}.json"
  When they choose a location and save
  Then all currently visible events should be exported as JSON
  And a success notification should appear
  And the file should contain properly formatted JSON array of events

Scenario: Export all events to CSV
  Given the Events Viewer displays events
  When a user clicks the "Export" button
  And selects "Export as CSV"
  Then a file save dialog should appear
  And the default filename should be "events-{cluster}-{timestamp}.csv"
  When they choose a location and save
  Then all currently visible events should be exported as CSV
  And CSV should have headers: Level, Date/Time, Source, Event ID, Category, Message
  And a success notification should appear

Scenario: Export selected events only
  Given the Events Viewer displays events
  And a user has selected multiple rows (Ctrl+click)
  When they click the "Export" button
  Then the export menu should show "Export Selected (5)"
  When they choose export format and location
  Then only the selected events should be exported
  And the count should match the number selected

Scenario: Export respects current filters
  Given the Events Viewer has filters applied
  And only 50 of 500 events are currently visible
  When a user exports events
  Then only the 50 visible (filtered) events should be exported
  And the export should not include filtered-out events
  And a message may indicate "Exported 50 events (filtered view)"

Scenario: Copy single event details to clipboard
  Given the Events Viewer displays events
  When a user right-clicks on an event row
  And selects "Copy Event Details"
  Then the full event details should be copied to clipboard as formatted text
  And a brief "Copied!" notification should appear
  And the format should be readable (key: value pairs)

Scenario: Copy multiple events to clipboard
  Given the Events Viewer has multiple events selected
  When a user right-clicks on one of the selected rows
  And selects "Copy Selected Events"
  Then all selected events should be copied to clipboard
  And events should be separated by blank lines
  And a notification should show count: "Copied 5 events"

Scenario: Copy event message only
  Given the Events Viewer displays event details in bottom pane
  When a user clicks a "Copy Message" button in the details pane
  Then only the event message text should be copied to clipboard
  And a brief "Message copied!" notification should appear

Scenario: Navigate to resource in tree view
  Given the Events Viewer displays an event for a specific Pod
  When a user right-clicks on the event row
  And selects "Go to Resource in Tree"
  Then the cluster tree view should expand and navigate to that Pod
  And the Pod should be highlighted/selected in the tree
  And the tree view should gain focus
  And the Events Viewer should remain open

Scenario: Navigate to resource when resource doesn't exist in tree
  Given the Events Viewer displays an event for a deleted resource
  When a user attempts to navigate to that resource
  Then a notification should appear: "Resource no longer exists or is not visible"
  And the action should fail gracefully

Scenario: Open resource YAML from event
  Given the Events Viewer displays an event for a Deployment
  When a user right-clicks on the event row
  And selects "View Resource YAML"
  Then the YAML editor should open for that Deployment
  And the resource should be fetched from the cluster
  And the YAML should be displayed in a new editor tab

Scenario: Clear all filters action
  Given the Events Viewer has multiple filters applied
  When a user clicks the "Clear Filters" button in the toolbar
  Then all filters should reset to defaults
  And the table should update to show all events (default time range)
  And filter chips/indicators should disappear
  And the status bar should show "0 filters active"

Scenario: Toggle auto-refresh on/off
  Given the Events Viewer is open with auto-refresh enabled
  When a user clicks the "Toggle Auto-refresh" button
  Then auto-refresh should be disabled
  And the button should change appearance to indicate "off" state
  And the status bar should show "Auto-refresh: Off"
  And automatic refreshes should stop
  When they click the button again
  Then auto-refresh should be re-enabled
  And automatic refreshes should resume every 30 seconds

Scenario: Configure auto-refresh interval
  Given the Events Viewer is open
  When a user clicks on the auto-refresh status in the status bar
  Or clicks a settings icon next to the toggle button
  Then a QuickPick should appear with interval options:
    - 15 seconds
    - 30 seconds (default)
    - 60 seconds
    - 2 minutes
    - 5 minutes
  When they select an interval
  Then auto-refresh should use the new interval
  And the status bar should update: "Auto-refresh: On (60s)"

Scenario: Sort table by column
  Given the Events Viewer displays events
  When a user clicks on the "Date/Time" column header
  Then events should sort by timestamp (newest first by default)
  And a sort indicator (↓) should appear in the header
  When they click the same header again
  Then the sort order should reverse (oldest first)
  And the sort indicator should flip (↑)
  And this works for all sortable columns

Scenario: Resize table columns
  Given the Events Viewer displays the event table
  When a user hovers over a column divider in the header
  Then the cursor should change to indicate resizability
  When they drag the divider left or right
  Then the column width should adjust in real-time
  When they release the mouse
  Then the new column width should be saved per cluster
  And the width should be restored when reopening the viewer

Scenario: Collapse/expand details pane
  Given the Events Viewer displays the details pane at the bottom
  When a user clicks the collapse button (^) on the details pane
  Then the details pane should collapse to minimal height
  And the event table should expand to use the space
  And the button should change to expand button (v)
  When they click the expand button
  Then the details pane should expand to previous height

Scenario: Resize details pane
  Given the Events Viewer displays the details pane
  When a user drags the divider between table and details pane
  Then both panes should resize proportionally
  And the resize should be smooth and real-time
  When they release the divider
  Then the new sizes should be saved per cluster

Scenario: Select event to view details
  Given the Events Viewer displays events in the table
  When a user clicks on an event row
  Then that row should be highlighted as selected
  And the details pane should populate with full event information
  And details should include: Reason, Type, Message, Resource, Namespace, Count, Timestamps
  When they click another row
  Then the selection should move
  And details should update for the new event

Scenario: Double-click event to open detailed modal
  Given the Events Viewer displays events
  When a user double-clicks on an event row
  Then a modal or new panel should open with expanded event details
  And the modal should show all available event metadata
  And the modal should have actions: Copy, Export, Go to Resource, Close

Scenario: Keyboard shortcuts for common actions
  Given the Events Viewer is focused
  When a user presses Ctrl+R (or Cmd+R on Mac)
  Then events should refresh
  When they press Ctrl+F (or Cmd+F)
  Then focus should move to the search box
  When they press Ctrl+E (or Cmd+E)
  Then the export dialog should open
  When they press Escape in search box
  Then the search should clear and focus should return to table

Scenario: Filter to specific namespace from event
  Given the Events Viewer displays events from multiple namespaces
  When a user right-clicks on an event from namespace "production"
  And selects "Filter to 'production' namespace"
  Then the Namespace filter should be set to "production"
  And only events from "production" should be displayed

Scenario: Filter to specific resource type from event
  Given the Events Viewer displays events for various resource types
  When a user right-clicks on an event for a Pod
  And selects "Filter to Pods only"
  Then the Resource Type filter should be set to "Pod"
  And only Pod events should be displayed

Scenario: Exclude events similar to selected
  Given the Events Viewer displays many events
  And a user sees repetitive "BackOff" events they want to ignore
  When they right-click on a "BackOff" event
  And select "Exclude events like this"
  Then events with reason "BackOff" should be filtered out
  And an exclusion filter should be added
  And the user can see other events more clearly

Scenario: Pin important events (future enhancement)
  Given the Events Viewer displays events
  # Future enhancement: allow pinning specific events
  # Pinned events could stay at top of list regardless of filters
  # Or could be saved for later reference

Scenario: Event detail actions in bottom pane
  Given the Events Viewer displays event details in bottom pane
  When a user views the details pane
  Then they should see action buttons:
    - Copy Message
    - Copy Full Details
    - Go to Resource
    - View Resource YAML
  And each button should have a clear icon and label
  When they click any button
  Then the corresponding action should execute

Scenario: Bulk actions on selected events
  Given the Events Viewer has multiple events selected
  When a user right-clicks on the selection
  Then a context menu should offer bulk actions:
    - Copy All Selected
    - Export Selected
    - Clear Selection
  When they choose an action
  Then it should apply to all selected events

Scenario: Undo filter action
  Given the Events Viewer has a user applying a filter
  When they realize the filter hid important events
  And they want to quickly undo the last filter change
  Then pressing Ctrl+Z (or Cmd+Z) could undo the last filter
  # Future enhancement consideration

Scenario: Share filtered view (future enhancement)
  Given the Events Viewer has specific filters applied
  # Future: generate a shareable link or command
  # That others could use to see the same filtered view

Scenario: Create alert rule from event pattern (future enhancement)
  Given the Events Viewer shows a concerning event pattern
  # Future: user could create an alert rule
  # That notifies them when similar events occur

Scenario: Accessible action buttons
  Given the Events Viewer displays action buttons
  When a user navigates with keyboard
  Then all buttons should be keyboard accessible
  And Tab key should move between toolbar buttons
  And Enter/Space should activate buttons
  And tooltips should describe actions clearly
  And screen readers should announce button states

Scenario: Action feedback and confirmation
  Given a user performs an action in Events Viewer
  When the action completes successfully
  Then appropriate feedback should be shown:
    - Toast notification for exports/copies
    - Status bar update for filters
    - Visual highlight for navigation
  When an action fails
  Then an error message should explain the failure
  And recovery options should be suggested
```

## Integration Points

- **Clipboard API**: Copy event details and messages
- **VS Code File Dialog**: Export to JSON/CSV
- **Tree View Navigation**: Navigate to resources from events
- **YAML Editor**: Open resource YAML from events
- **Message Protocol**: Communicate actions between webview and extension
- **EventsProvider**: Execute refresh and data fetch operations

## Action Categories

**Data Actions**:
- Refresh events
- Export events (JSON, CSV)
- Copy events to clipboard

**Navigation Actions**:
- Go to resource in tree
- View resource YAML
- Navigate to related resources

**Filter Actions**:
- Clear filters
- Clear individual filter
- Quick filter from context
- Exclude pattern

**View Actions**:
- Toggle auto-refresh
- Configure refresh interval
- Sort columns
- Resize panes
- Collapse/expand panes

**Selection Actions**:
- Select events (single, multiple)
- Bulk operations on selection
- View event details

