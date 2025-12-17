---
session_id: event-viewer-interface-for-operated-clusters
start_time: '2025-12-17T15:02:20.653Z'
status: development
problem_statement: Event Viewer Interface for Operated Clusters
changed_files:
  - path: ai/features/webview/event-viewer.feature.md
    change_type: added
    scenarios_added:
      - Events tree item appears for all clusters
      - Opening Event Viewer for operated cluster
      - Opening Event Viewer for non-operated cluster
      - Event list displays paginated events
      - Filtering events by type
      - Filtering events by severity
      - Filtering events by time range
      - Searching events by text
      - Combining multiple filters
      - Clearing all filters
      - Navigating between pages
      - Expanding event details
      - Grouping events by type
      - Sorting events
      - Refreshing event data
      - Handling empty event list
      - Handling operator query errors
      - Install Operator button action
      - Event Viewer supports multiple clusters independently
      - Relative timestamps update over time
      - View object action from event details
start_commit: 9b6844ac220f4fb58b9d61528c95decea913b132
end_time: '2025-12-17T15:14:28.856Z'
---
## Problem Statement

Add an Event Viewer interface to the VS Code extension, providing a visual timeline of cluster events collected by the kube9-operator. This enables developers and cluster administrators to view historical events, troubleshoot issues, and audit cluster changes directly from VS Code.

## Goals

1. **Create Event Viewer UI**: Implement a webview-based interface to display cluster events in a table format
2. **Provide Filtering & Sorting**: Enable users to filter events by type, severity, time range, and search text
3. **Support Pagination**: Display events in paginated pages (20 per page) for performance with large event sets
4. **Enable Event Details**: Allow users to expand events to see full details, metadata, and take actions
5. **Graceful Non-Operated Handling**: Show call-to-action for clusters without operator installed
6. **Multi-Cluster Support**: Allow independent Event Viewers for multiple clusters simultaneously

## Approach

### Architecture

- **Tree View Integration**: Add "Events" tree item under each cluster context (positioned after Dashboard)
- **Webview Panel**: Use custom webview panel (similar to Dashboard) for rich event display
- **Query via kubectl exec**: Query events from operator CLI using `kubectl exec` to operator pod
- **No Badge**: Explicitly NOT implementing unread badge (too many events, engineers don't read them all)
- **General Purpose**: Support any event type operator emits (not tied to specific event types)

### Event Types Supported

- Cluster Events (cluster-wide state changes)
- Operator Events (operator lifecycle and health)
- Insight Events (new insights generated)
- Assessment Events (assessment completion and results)
- Workload Events (workload lifecycle changes)
- System Events (internal operator system events)

### UI Components

1. **Call-to-Action (Non-Operated Clusters)**:
   - Explain operator requirement
   - List Event Viewer benefits
   - "Install Operator" button → opens installation docs
   - "Learn More" link

2. **Event Table (Operated Clusters)**:
   - Table with columns: Type, Severity, Description, Resource, Time
   - Filter controls: Type dropdown, Severity dropdown, Time range dropdown, Search box, Clear button
   - Pagination: Previous/Next buttons, Page indicator (Page X of Y), Result count (Showing X-Y of Z)
   - Sorting: Click column headers to sort (timestamp default descending)
   - Grouping: Optional "Group by Type" toggle
   - Row expansion: Click to see full event details inline

3. **Event Details (Expanded Row)**:
   - Full event description
   - Event ID, Type, Severity, Exact timestamp
   - Affected object: Kind, Name, Namespace
   - Additional metadata as formatted JSON
   - Actions: "View Object" (navigate to object), "Copy Event ID"

### Query Implementation

- **Client**: `EventQueryClient` class in extension
- **Data Source**: kube9-operator CLI binary bundled in the operator pod image
- **Protocol**: kubectl exec to operator pod in kube9-system namespace
- **Command**: `kubectl exec -n kube9-system deploy/kube9-operator -- kube9-operator query events list [filters]`
- **Binary**: The `kube9-operator` binary in the pod provides the query interface
- **Filters**: 
  - `--type=<types>` (comma-separated)
  - `--severity=<severities>` (comma-separated)
  - `--since=<time>` (relative like "24h" or ISO 8601 timestamp)
  - `--object-kind=<kind>`, `--object-name=<name>`, `--object-namespace=<namespace>`
  - `--search=<text>` (full-text search in description and object name)
- **Pagination**: `--page=<number>`, `--per-page=<count>`
- **Sorting**: `--sort-by=<field>`, `--sort-direction=<asc|desc>`
- **Format**: `--format=json` for structured response

### State Management

- **Webview State**: Events, filters, pagination, expanded rows, loading state, error state
- **Extension**: Handles queries, operator communication, status checking
- **Message Protocol**: Extension ↔ Webview via postMessage
- **Panel Reuse**: One webview per cluster context (keyed by `kubeconfigPath:contextName`)

### Data Flow

```
User → Events Tree Item → Extension
Extension → Check Operator Status
Extension → Create/Reveal Webview
Extension → kubectl exec → Operator Pod
Operator Pod → Execute kube9-operator CLI binary
CLI Binary → Query SQLite DB → JSON Response
Extension → postMessage → Webview
Webview → Display Table → User
User → Interaction → Webview
Webview → postMessage → Extension
Extension → Re-query with new params
```

## Key Decisions

### 1. No Unread Badge

**Decision**: Do NOT implement event badge showing unread count in tree view

**Rationale**: 
- Many events get fired in typical cluster operations (hundreds/thousands)
- Engineers do not read all events (events are more for troubleshooting than daily monitoring)
- Badge would be constantly showing numbers, creating noise and notification fatigue
- Focus on discoverability through table interface with powerful filtering instead
- Unread badge could be added later if user feedback indicates it's valuable

### 2. General Event Viewer (Not Specific Event Types)

**Decision**: Make Event Viewer general purpose, not tied to specific event types like "collection completed" or "security scan failures"

**Rationale**:
- GitHub issue mentioned specific event types ("collection completed", "security scan failures") which are not currently supported components
- Need flexible event system that works with ANY event type operator emits
- Table + filters + grouping provides better scalability than hardcoded event type layouts
- Operator can add new event types without extension changes
- More maintainable and extensible architecture

### 3. Table Format with Optional Grouping

**Decision**: Use table format with optional "Group by Type" feature rather than timeline or other visualizations

**Rationale**:
- Tables are familiar and highly scannable for developers
- Grouping by type helps organize large event lists without changing paradigm
- Sorting and filtering work naturally in table format
- Easier to implement and maintain than timeline/graph visualizations
- Timeline view could be added later as enhancement if needed
- Table format works well with server-side pagination

### 4. Server-Side Pagination

**Decision**: Query operator for each page (server-side pagination) rather than loading all events upfront

**Rationale**:
- Client-side pagination requires loading ALL events upfront (not scalable)
- Clusters can have thousands of events over time
- Operator's SQLite database can efficiently paginate queries
- Reduces network overhead and extension memory usage
- Faster initial load time
- Consistent with how other large-dataset UIs work

### 5. Webview Panel (Not Tree View)

**Decision**: Use custom webview panel instead of expanding tree view for event list

**Rationale**:
- Rich UI with filtering, pagination, expandable details requires more than tree view can provide
- Better performance with large event lists (tree view would be slow with 100+ items)
- Consistent with Dashboard UX pattern already established
- Easier to implement complex interactions (expand/collapse, inline actions)
- Tree view would be too limited for table layout with sortable columns
- Webview allows using React and modern UI patterns

### 6. Query via kubectl exec (Not Direct Operator API)

**Decision**: Use `kubectl exec` to operator pod to execute the bundled kube9-operator CLI binary for event queries rather than direct HTTP API

**Rationale**:
- Operator stores events in local SQLite database in the pod (no remote API needed)
- The kube9-operator binary bundled in the pod image provides query subcommands
- No server communication required (works in free tier without API key)
- Consistent with existing operator query patterns (Insights, Assessments)
- Simpler security model (uses kubeconfig RBAC for exec permission)
- No need for operator to expose HTTP endpoints or services
- CLI binary provides clean, versioned query interface with structured JSON output
- Extension doesn't need to track operator pod IPs or services
- Binary is already present in pod - no additional setup needed

## Files Created

### Features
- **ai/features/webview/event-viewer.feature.md**: Comprehensive Gherkin scenarios covering all Event Viewer behaviors (21 scenarios including filters, pagination, sorting, grouping, error handling, multi-cluster support)

### Specs
- **ai/specs/webview/event-viewer-webview-spec.spec.md**: Complete webview UI specification including:
  - Layout mockups (call-to-action and event table)
  - UI component specifications (filters, table, pagination)
  - State management (EventViewerState interface)
  - Message protocol (extension ↔ webview)
  - Implementation details (EventViewerProvider class)
  - Performance considerations
  - Error handling
  - Accessibility requirements

- **ai/specs/cluster/event-query-api-spec.spec.md**: Event query API specification including:
  - Query method (kubectl exec protocol)
  - EventQueryClient interface
  - All query parameters (filters, pagination, sorting)
  - Response format (JSON schemas)
  - Error handling (operator unavailable, timeout, invalid params)
  - Time range mapping (UI → query params)
  - RBAC requirements
  - Security considerations

### Diagrams
- **ai/diagrams/cluster/event-viewer-flow.diagram.md**: Complete user interaction flow diagram with 40+ nodes showing:
  - Initial flow (tree item click → operator check → webview creation)
  - Call-to-action path (non-operated clusters)
  - Event viewer path (operated clusters)
  - Query execution flow
  - User interaction loops (filter, paginate, sort, expand)
  - Event detail actions
  - Error handling paths

## Notes

### Dependencies

**kube9-operator**: Event database & CLI query interface (separate implementation issue)
- Operator must emit events to SQLite database
- Operator CLI must support `kube9-operator query events` subcommands
- Operator must implement pagination, filtering, sorting
- No extension changes can be tested until operator implementation complete
- Operator team should be consulted on event schema and query capabilities

### Future Enhancements

Explicitly marked as **non-goals** for initial implementation (can be added later):
- **Real-time event streaming**: Push notifications via operator webhook
- **Event export**: Export to CSV/JSON for sharing or analysis
- **Event notifications**: Toast/desktop notifications for critical events
- **Event correlation**: Automatic grouping of related events
- **Custom queries**: Advanced query builder with complex filters
- **Event visualizations**: Timeline view, distribution graphs, heatmaps
- **Unread badge**: Badge in tree view showing unread event count
- **Event retention controls**: UI for configuring event retention policies
- **Event annotations**: User-added notes or tags on events

### Free Tier Feature

- Event Viewer is available to **ALL users with operated clusters**
- **No API key required** (works in free tier)
- Drives operator adoption by showcasing operator value
- Events are completely local to cluster (no data sent to kube9-server)
- Demonstrates transparency of operator activities

### Performance Targets

- Acceptable performance with **1000+ events** in database
- Default **20 events per page**
- Maximum **100 events per page** (configurable)
- **30-second query timeout** for kubectl exec
- **5-minute cache** for operator status (NOT for event data)
- Relative timestamps update every **60 seconds** automatically

### Integration Points

- **Tree View**: Events tree item (positioned after Dashboard, calendar icon)
- **Webview**: Custom panel with React-based UI using VS Code Webview UI Toolkit
- **kubectl**: Execute queries to operator pod via ConfigurationCommands
- **Operator**: CLI query interface via `kube9-operator query events list`
- **ClusterTreeProvider**: Provides operator status for deciding CTA vs event list

### Testing Considerations

**Unit Tests**:
- State management logic (filters, pagination, expanded rows)
- Filter combination logic (AND logic for multiple filters)
- Pagination calculations (page numbers, result counts)
- Time range conversion (UI selections → query params)
- Event type/severity mappings
- Message protocol handlers

**Integration Tests**:
- Webview creation and reuse (one per cluster context)
- Event data loading via kubectl exec
- Filter application and result verification
- Pagination navigation
- Error handling (operator down, timeout, network issues)
- Message protocol (extension ↔ webview communication)

**End-to-End Tests**:
- Open Event Viewer for operated cluster
- Open Event Viewer for non-operated cluster (CTA display)
- Apply multiple filter combinations and verify results
- Navigate through multiple pages
- Expand/collapse event details
- Sort by different columns
- Group by event type
- Search events by text
- Install operator button action
- View object action from event details
- Multiple clusters with independent Event Viewers

### Visual Design Considerations

- **Dark/Light Mode**: Webview must support both VS Code themes
- **Icons**: Use VS Code ThemeIcon for consistency (calendar for tree item)
- **Event Type Icons**: Use emoji or ThemeIcons (💡 insight, 📊 assessment, etc.)
- **Severity Icons**: Use emoji or ThemeIcons (🚨 critical, ❌ error, ⚠️ warning, ℹ️ info)
- **Table Styling**: Match VS Code table style (borders, row hover, selection)
- **Loading States**: Show spinner during queries
- **Empty States**: Friendly messages for no results
- **Error States**: Clear error messages with retry actions

### Operator Contract

The extension expects operator to provide:
1. **Event Storage**: SQLite database with event table stored in operator pod
2. **CLI Binary**: `kube9-operator` binary bundled in operator pod image with query subcommands
3. **CLI Interface**: `kube9-operator query events list` command accessible via kubectl exec
4. **Pagination Support**: `--page` and `--per-page` parameters in CLI
5. **Filter Support**: All filters documented in event-query-api-spec
6. **JSON Output**: Structured JSON response with events and pagination info (via `--format=json`)
7. **Backward Compatibility**: Stable query interface across operator versions
8. **Performance**: Queries should complete within reasonable time (< 10 seconds typical)

### Open Questions

1. Should we show event retention period in the UI? (e.g., "Showing events from last 30 days")
2. Should we add keyboard shortcuts for common actions? (e.g., "R" for refresh, "/" for search)
3. Should we persist filter selections across extension restarts?
4. Should we add a "Live Mode" toggle for auto-refresh?
5. Should we show event statistics (count by type/severity) in the UI?
