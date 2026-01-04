---
feature_id: event-viewer-ui
name: Event Viewer UI Components
description: Windows EventViewer-inspired UI with three-pane layout, virtual scrolling, color coding, and theme integration
spec_id:
  - event-viewer-components-spec
---

# Event Viewer UI Components

```gherkin
Feature: Event Viewer UI Components

Scenario: Three-pane layout structure
  Given a user opens the Events Viewer
  When the UI is rendered
  Then the layout should have three distinct panes
  And the left pane should contain filter controls
  And the main center pane should contain the event table
  And the bottom pane should contain event details
  And all panes should be resizable with drag handles
  And pane sizes should be remembered per cluster

Scenario: Left pane displays filter controls
  Given the Events Viewer is open
  When a user looks at the left pane
  Then they should see filter sections organized hierarchically
  And sections should include: Type, Time Range, Namespace, Resource Type
  And each section should be collapsible
  And active filters should be visually highlighted
  And filter counts should show number of events matching each filter

Scenario: Main pane displays event table with columns
  Given the Events Viewer is open with events loaded
  When a user looks at the main table pane
  Then they should see a table with columns: Level, Date/Time, Source, Event ID, Category
  And the Level column should display event type with icon (Normal, Warning, Error)
  And the Date/Time column should show timestamp in readable format
  And the Source column should show the involved object (namespace/kind/name)
  And the Event ID column should show the event reason
  And the Category column should show the event count if > 1

Scenario: Event table columns are sortable
  Given the Events Viewer displays events in the table
  When a user clicks on a column header
  Then the table should sort by that column
  And a sort indicator (↑ or ↓) should appear in the header
  When they click the same header again
  Then the sort order should reverse
  And the sort indicator should flip
  And sorting should work for all columns

Scenario: Event table rows are color-coded by type
  Given the Events Viewer displays events
  When a user views the table
  Then Normal events should have a neutral background color
  And Warning events should have a yellow/orange tinted background
  And Error events should have a red tinted background
  And colors should use VS Code theme variables for consistency
  And text should remain readable in all themes (light/dark)

Scenario: Event table uses virtual scrolling for performance
  Given the Events Viewer displays 500+ events
  When a user scrolls through the table
  Then only visible rows should be rendered in the DOM
  And scrolling should remain smooth and responsive
  And scroll position should be accurate
  And memory usage should remain low regardless of total event count
  And virtual scrolling should support keyboard navigation

Scenario: Event table row selection
  Given the Events Viewer displays events
  When a user clicks on a row in the table
  Then that row should be highlighted as selected
  And the event details should appear in the bottom pane
  And clicking another row should change the selection
  And keyboard navigation (arrow keys) should change selection

Scenario: Event table row hover state
  Given the Events Viewer displays events
  When a user hovers over a row in the table
  Then the row should have a hover background color
  And a tooltip may appear with additional event information
  And the hover state should be visually distinct from selection

Scenario: Bottom pane displays selected event details
  Given a user has selected an event in the table
  When they look at the bottom pane
  Then they should see detailed event information
  And details should include: Reason, Type, Message, Namespace, Resource, Count, First/Last Timestamp
  And details should be formatted for readability with sections
  And long messages should wrap or scroll
  And the pane should be collapsible to maximize table space

Scenario: Bottom pane is resizable
  Given the Events Viewer is open with an event selected
  When a user drags the divider between table and details panes
  Then the details pane height should adjust
  And the table pane height should adjust inversely
  And the resize should be smooth
  And the size should be remembered per cluster

Scenario: Bottom pane can be collapsed
  Given the Events Viewer has the details pane visible
  When a user clicks the collapse button on the details pane
  Then the details pane should collapse to just a title bar
  And the table should expand to use the full vertical space
  When they click the expand button
  Then the details pane should expand back to its previous size

Scenario: Table displays loading state during fetch
  Given the Events Viewer is fetching events
  When a user looks at the table
  Then they should see a loading spinner overlay
  And a message "Loading events..." should be displayed
  And the previous events (if any) should remain dimmed in background
  When loading completes
  Then the spinner should disappear
  And new events should be displayed

Scenario: Table displays empty state when no events
  Given the Events Viewer finishes loading
  And zero events match the current filters
  When a user looks at the table
  Then they should see an empty state illustration or icon
  And a message "No events found" should be displayed
  And filter information should be shown (e.g., "No events in the last 24 hours")
  And suggestions should be provided (e.g., "Try adjusting filters")

Scenario: Table displays error state when fetch fails
  Given the Events Viewer attempts to fetch events
  And the fetch operation fails
  When a user looks at the table
  Then they should see an error icon
  And an error message should be displayed
  And the message should include troubleshooting hints
  And a "Retry" button should be available
  When they click "Retry"
  Then the fetch should be attempted again

Scenario: Toolbar at top of main pane
  Given the Events Viewer is open
  When a user looks at the top of the main pane
  Then they should see a toolbar with action buttons
  And buttons should include: Refresh, Toggle Auto-refresh, Export, Clear Filters
  And buttons should have icons and tooltips
  And active states should be visually indicated (e.g., auto-refresh on/off)
  And buttons should be keyboard accessible

Scenario: Search box in toolbar for quick filtering
  Given the Events Viewer is open
  When a user looks at the toolbar
  Then they should see a search input box
  And the placeholder should say "Search events..."
  When they type in the search box
  Then events should be filtered in real-time as they type
  And matching text in event messages should be highlighted
  And the search should be case-insensitive

Scenario: Status bar at bottom shows event count and refresh status
  Given the Events Viewer is open with events loaded
  When a user looks at the bottom of the panel
  Then they should see a status bar
  And the status bar should show total event count (e.g., "247 events")
  And the status bar should show applied filter count (e.g., "2 filters active")
  And the status bar should show auto-refresh status (e.g., "Auto-refresh: On (30s)")
  And the status bar should show last refresh time (e.g., "Updated: 5 seconds ago")

Scenario: Theme integration with VS Code
  Given a user has VS Code set to dark theme
  When they open the Events Viewer
  Then the UI should use dark theme colors
  And backgrounds, text, and borders should use VS Code CSS variables
  And event type colors should be appropriate for dark backgrounds
  When they switch to light theme
  Then the Events Viewer should immediately update to light theme
  And all colors should remain readable

Scenario: Level column displays icons for event types
  Given the Events Viewer displays events
  When a user looks at the Level column
  Then Normal events should show a green checkmark or info icon
  And Warning events should show a yellow warning triangle icon
  And Error events should show a red error circle icon
  And icons should use VS Code ThemeIcon for theme compatibility

Scenario: Date/Time column shows relative time with absolute tooltip
  Given the Events Viewer displays events
  When a user looks at the Date/Time column
  Then recent events should show relative time (e.g., "2 minutes ago")
  And older events should show relative time (e.g., "3 hours ago", "2 days ago")
  When they hover over a timestamp
  Then a tooltip should show the absolute timestamp (ISO format)

Scenario: Source column displays resource in namespace/kind/name format
  Given the Events Viewer displays events
  When a user looks at the Source column
  Then each row should show format: "namespace/kind/name"
  And the resource name should be prominent
  And long names should be truncated with ellipsis
  When they hover over a truncated name
  Then a tooltip should show the full resource name

Scenario: Event ID column shows reason with count badge
  Given the Events Viewer displays events
  When a user looks at the Event ID column
  Then the event reason should be displayed (e.g., "Created", "Failed", "BackOff")
  And if the event count is > 1, a badge should show the count
  And the badge should be visually distinct (e.g., small circle with number)

Scenario: Keyboard navigation through table
  Given the Events Viewer table has focus
  When a user presses the down arrow key
  Then the selection should move to the next row
  And the details pane should update with the new event
  And the table should scroll to keep the selection visible
  When they press the up arrow key
  Then the selection should move to the previous row
  When they press Page Down
  Then the selection should jump down by one page
  When they press Page Up
  Then the selection should jump up by one page
  When they press Home
  Then the selection should move to the first row
  When they press End
  Then the selection should move to the last row

Scenario: Table supports multi-row selection with Ctrl/Cmd
  Given the Events Viewer table is displayed
  When a user clicks a row while holding Ctrl (or Cmd on Mac)
  Then that row should be added to the selection
  And multiple rows should be visually selected
  And the details pane should show summary or first selected event
  And bulk actions (like export) should apply to all selected rows

Scenario: Table context menu on right-click
  Given the Events Viewer table displays events
  When a user right-clicks on a row
  Then a context menu should appear
  And menu options should include: "Copy Event Details", "Export Selected", "Go to Resource"
  When they select an option
  Then the corresponding action should be executed

Scenario: Pane dividers are draggable with visual feedback
  Given the Events Viewer has multiple panes
  When a user hovers over a pane divider
  Then the cursor should change to indicate draggability (resize cursor)
  When they drag the divider
  Then both adjacent panes should resize in real-time
  And a visual indicator line may show during drag
  When they release the mouse
  Then the panes should remain at the new sizes
  And sizes should be saved for the current cluster

Scenario: Responsive layout for narrow windows
  Given the Events Viewer is open
  When the window width is reduced below a threshold
  Then the left filter pane may auto-collapse to an icon bar
  And a button should appear to expand filters as an overlay
  And the table should take full width
  And columns may be hidden based on priority (keep Level, Date/Time, Source)

Scenario: Smooth transitions and animations
  Given the Events Viewer UI is rendered
  When panes are resized, collapsed, or expanded
  Then transitions should be smooth (CSS transitions)
  And animations should not exceed 300ms
  And animations should respect user's reduced motion preferences
  When events are loaded or refreshed
  Then the table should update smoothly without jarring flickers

Scenario: Accessibility support for screen readers
  Given the Events Viewer is open
  When a screen reader user navigates the interface
  Then all interactive elements should have proper ARIA labels
  And table should use proper table semantics (thead, tbody, th, td)
  And filter controls should announce their states
  And keyboard focus should be visible and logical
  And event details should be announced when selection changes

Scenario: High DPI display support
  Given the Events Viewer is open on a high DPI display
  Then all UI elements should render crisply
  And icons should use vector graphics (SVG) when possible
  And text should be sharp and readable
  And layout should scale appropriately with display scaling

Scenario: Loading indicator for individual operations
  Given the Events Viewer is performing an operation (refresh, export, etc.)
  When a user looks at the relevant UI area
  Then a loading indicator should appear specific to that operation
  And the indicator should not block the entire UI unnecessarily
  And other operations should remain available if not conflicting

Scenario: Table rows render without overlapping
  Given the Events Viewer displays multiple events
  When events are rendered in the virtual list
  Then each row should have sufficient height for its content
  And rows should not overlap when scrolling
  And row height should account for padding and borders (42px total)
  And hover effects should work correctly on each row
  And row selection should be visually clear without overlap

Scenario: Resizing details pane does not cause table scrolling
  Given the Events Viewer is open with events loaded
  When a user drags the horizontal separator between table and details
  Then the table should resize smoothly
  And the table scroll position should remain stable
  And no wild scrolling behavior should occur during resize
  And resize updates should be throttled using requestAnimationFrame
  And the final resize should be applied accurately when drag ends
```

## Integration Points

- **VS Code Webview API**: Renders the React-based UI within VS Code
- **VS Code Theming**: Uses CSS variables for theme compatibility
- **React**: UI framework for component-based architecture
- **Virtual Scrolling Library**: Handles efficient rendering of large event lists
- **Extension Message Protocol**: Communicates with extension host for data

## UI Component Hierarchy

```
EventViewerApp (root)
├── Toolbar
│   ├── RefreshButton
│   ├── AutoRefreshToggle
│   ├── ExportButton
│   ├── ClearFiltersButton
│   └── SearchBox
├── ThreePaneLayout
│   ├── FilterPane (left, resizable, collapsible)
│   │   ├── TypeFilter
│   │   ├── TimeRangeFilter
│   │   ├── NamespaceFilter
│   │   └── ResourceTypeFilter
│   ├── EventTable (main, center)
│   │   ├── TableHeader (sortable columns)
│   │   ├── VirtualScrollContainer
│   │   └── EventRow[] (virtualized)
│   └── EventDetails (bottom, resizable, collapsible)
│       ├── EventDetailsHeader
│       ├── EventDetailsContent
│       └── CollapseButton
└── StatusBar
    ├── EventCount
    ├── FilterCount
    ├── AutoRefreshStatus
    └── LastRefreshTime
```

