---
feature_id: event-viewer-filtering
name: Event Viewer Filtering
description: Comprehensive filtering capabilities for events including type, time range, namespace, resource type, and text search
spec_id:
  - event-viewer-components-spec
  - event-viewer-protocol-spec
---

# Event Viewer Filtering

```gherkin
Feature: Event Viewer Filtering

Scenario: Filter events by type (Normal, Warning, Error)
  Given the Events Viewer is open with events displayed
  When a user selects "Warning" in the Type filter
  Then only Warning events should be displayed in the table
  And the event count should update to show filtered count
  And the filter should be visually indicated as active
  When they select "All" in the Type filter
  Then all event types should be displayed again

Scenario: Multiple type selection
  Given the Events Viewer is open with events displayed
  When a user selects both "Warning" and "Error" in the Type filter
  Then only Warning and Error events should be displayed
  And Normal events should be hidden
  And the filter count should show "2 filters active"

Scenario: Filter events by time range with quick options
  Given the Events Viewer is open with events displayed
  When a user selects "Last 1 hour" in the Time Range filter
  Then only events from the past hour should be displayed
  And older events should be filtered out
  And the status bar should indicate the time filter
  When they select "Last 24 hours"
  Then events from the past 24 hours should be displayed
  When they select "Last 7 days"
  Then events from the past 7 days should be displayed
  When they select "All"
  Then all events (up to limit) should be displayed

Scenario: Custom time range selection
  Given the Events Viewer is open
  When a user selects "Custom Range" in the Time Range filter
  Then a date/time picker should appear
  And they should be able to select start date and time
  And they should be able to select end date and time
  When they apply the custom range
  Then only events within that range should be displayed
  And the filter should show "Custom: [start] to [end]"

Scenario: Filter events by namespace
  Given the Events Viewer is open with events from multiple namespaces
  When a user opens the Namespace filter dropdown
  Then they should see a list of all namespaces with events
  And each namespace should show event count in parentheses
  And "All Namespaces" should be the first option
  When they select "default"
  Then only events from the "default" namespace should be displayed
  And the filter should be visually indicated as active

Scenario: Multiple namespace selection
  Given the Events Viewer is open
  When a user selects multiple namespaces using checkboxes
  And selects "production" and "staging"
  Then events from both "production" and "staging" should be displayed
  And events from other namespaces should be hidden
  And the filter should show "2 namespaces selected"

Scenario: Filter events by resource type
  Given the Events Viewer is open with events from various resources
  When a user opens the Resource Type filter
  Then they should see options like "Pod", "Deployment", "Service", etc.
  And each resource type should show event count
  When they select "Pod"
  Then only events related to Pods should be displayed
  And events for other resource types should be hidden

Scenario: Multiple resource type selection
  Given the Events Viewer is open
  When a user selects "Pod" and "Deployment" in Resource Type filter
  Then events for both Pods and Deployments should be displayed
  And events for other resource types should be hidden

Scenario: Real-time text search in events
  Given the Events Viewer is open with events displayed
  When a user types "BackOff" in the search box
  Then the table should immediately filter to show only events containing "BackOff"
  And matching text should be highlighted in the table
  And the search should be case-insensitive
  When they clear the search box
  Then all events (respecting other filters) should be displayed

Scenario: Search across event fields
  Given the Events Viewer is open
  When a user enters a search term
  Then events should be filtered if the term matches:
    - Event reason
    - Event message
    - Resource name
    - Namespace
  And all matching events should be displayed
  And non-matching events should be hidden

Scenario: Combine multiple filters
  Given the Events Viewer is open
  When a user applies multiple filters:
    - Type: Warning
    - Time Range: Last 1 hour
    - Namespace: production
    - Search: "memory"
  Then only events matching ALL criteria should be displayed
  And the status bar should show "4 filters active"
  And each filter should be independently removable

Scenario: Clear individual filters
  Given the Events Viewer has multiple filters applied
  When a user clicks the "X" button on an individual filter chip
  Then that specific filter should be removed
  And other filters should remain active
  And the table should update to show more events

Scenario: Clear all filters at once
  Given the Events Viewer has multiple filters applied
  When a user clicks the "Clear Filters" button
  Then all filters should be reset to defaults
  And all events should be displayed (subject to default time range)
  And the status bar should show "0 filters active"
  And each filter control should return to default state

Scenario: Filter state persists per cluster
  Given the Events Viewer is open for cluster "production"
  And a user applies filters: Type=Warning, Namespace=default
  When they close the Events Viewer
  And reopen it for cluster "production"
  Then the same filters should be automatically applied
  And events should be filtered immediately on load
  When they open Events Viewer for cluster "staging"
  Then default filters should be applied (no persistence from production)

Scenario: Filter state survives refresh
  Given the Events Viewer has filters applied
  When a user clicks the Refresh button
  Then the same filters should remain active
  And refreshed events should be filtered with current criteria
  And filter selections should not change

Scenario: Filter state survives auto-refresh
  Given the Events Viewer has filters applied
  And auto-refresh is enabled
  When 30 seconds pass and auto-refresh triggers
  Then the same filters should remain active
  And new events should be filtered with current criteria
  And the user's view should not be disrupted

Scenario: Filter counts update dynamically
  Given the Events Viewer displays filters with event counts
  When events are refreshed or filters are changed
  Then the counts next to each filter option should update
  And options with 0 events may be dimmed or hidden
  And the total event count should be accurate

Scenario: Filter dropdown shows event distribution
  Given the Events Viewer is open
  When a user opens the Type filter
  Then they should see counts like:
    - Normal (145)
    - Warning (32)
    - Error (8)
  And percentages may be shown as visual bars
  And this helps users understand event distribution

Scenario: Filter by event source (involved object)
  Given the Events Viewer is open
  When a user wants to see events for a specific resource
  Then they can use the search box to filter by resource name
  Or click on a resource in the Source column to auto-filter
  And all events for that resource should be displayed

Scenario: Quick filter from table interaction
  Given the Events Viewer displays events in the table
  When a user right-clicks on a namespace in the Source column
  Then a context menu should appear with "Filter to this namespace"
  When they select it
  Then the Namespace filter should be set to that namespace
  And the table should filter accordingly

Scenario: Filter indicators in UI
  Given the Events Viewer has active filters
  When a user views the interface
  Then active filters should be displayed as chips or badges
  And each chip should show the filter name and value
  And each chip should have an "X" to remove that filter
  And the chips should be visually distinct

Scenario: Filter validation and feedback
  Given a user is applying filters
  When they select a combination that results in zero events
  Then the empty state should indicate why no events are shown
  And it should list the active filters
  And it should suggest removing filters to see more results

Scenario: Filter presets (future enhancement placeholder)
  Given a user frequently uses specific filter combinations
  When they apply a common set of filters
  Then they could save it as a named preset (future feature)
  And recall it later with one click
  # This scenario documents the future enhancement direction

Scenario: Filter by event severity level
  Given the Events Viewer categorizes events
  When a user wants to focus on high-priority issues
  Then filtering by "Error" and "Warning" types provides this view
  And they can see critical events requiring attention
  And Normal events are hidden to reduce noise

Scenario: Filter exclusion (inverse filtering)
  Given the Events Viewer has filter options
  When a user wants to exclude certain events
  Then they can use advanced search syntax like "-BackOff"
  And events matching "BackOff" will be excluded
  And all other events will be shown

Scenario: Filter reset button per filter category
  Given the Events Viewer has filters applied in multiple categories
  When a user wants to reset just the Time Range filter
  Then they can click a reset icon next to that filter section
  And only that filter returns to default
  And other filter categories remain unchanged

Scenario: Filter loading state
  Given the Events Viewer is applying a new filter
  When the filter requires data fetching from operator
  Then a loading indicator should appear
  And the previous results may remain visible (dimmed)
  When new results arrive
  Then the table should update smoothly

Scenario: Filter debouncing for search
  Given a user is typing in the search box
  When they type quickly
  Then filtering should be debounced to avoid excessive updates
  And filtering should occur after ~300ms of no typing
  And the interface should remain responsive

Scenario: Filter URL parameters (for future sharing)
  Given the Events Viewer has filters applied
  # Future enhancement: filters could be encoded in URL/state
  # This would enable sharing specific filtered views
  # Or bookmarking specific filter combinations

Scenario: Accessible filter controls
  Given the Events Viewer filter controls are rendered
  When a user navigates with keyboard
  Then all filter controls should be keyboard accessible
  And Tab key should move between filter sections
  And Arrow keys should select options within dropdowns
  And Enter/Space should activate selections
  And screen readers should announce filter states

Scenario: Filter persistence across sessions (future)
  Given a user has customized filters for a cluster
  # Future enhancement: filters could persist across VS Code restarts
  # Currently persists within VS Code session only
  # This scenario documents future enhancement direction
```

## Integration Points

- **EventsProvider**: Server-side filtering via operator CLI arguments
- **Client-side filtering**: Additional filtering in webview (search, complex combinations)
- **Extension Storage API**: Persist filter state per cluster within session
- **Message Protocol**: Communicate filter changes between webview and extension

## Filter Architecture

**Server-side filters** (applied in operator CLI query):
- Namespace (reduces data transfer)
- Type (reduces data transfer)
- Time Range (reduces data transfer)
- Resource Type (reduces data transfer)

**Client-side filters** (applied in webview):
- Search text (real-time, no round-trip)
- Complex combinations
- Quick filters from UI interactions

**Filter state management**:
- Stored per cluster context in extension
- Synced between extension and webview
- Persisted within VS Code session (not across restarts)

