---
session_id: add-events-category-to-tree-view-for-cluster-troub
start_time: '2025-12-18T02:08:34.789Z'
status: completed
problem_statement: Add Events category to tree view for cluster troubleshooting
changed_files:
  - path: ai/features/cluster/cluster-events-tree.feature.md
    change_type: added
    scenarios_added:
      - Events category appears when operator is installed (operated mode)
      - Events category appears when operator is installed (enabled mode)
      - Events category appears when operator is installed (degraded mode)
      - >-
        Events category does not appear when operator is not installed (basic
        mode)
      - Expanding Events category retrieves events from operator CLI
      - Events are displayed with color coding by severity
      - 'Events display reason, resource, and age'
      - Clicking an event shows full details in Output Panel
      - Event tooltip shows message preview
      - Filter events by namespace
      - Filter events by type (Normal/Warning/Error)
      - Filter events by time range
      - Filter events by resource type
      - Auto-refresh events every 30 seconds
      - Toggle auto-refresh on and off
      - Manual refresh events
      - Events are limited to recent 500 for performance
      - Handle operator CLI errors gracefully
      - Events category updates when operator status changes
      - Events category disappears when operator is removed
      - Multiple clusters show Events independently based on operator status
      - Search/filter events by message text
      - Clear all filters
      - Events toolbar shows filter indicators
      - Events category has appropriate icon
    scenarios_modified:
      - Expanding Events category retrieves events from operator CLI
start_commit: 9b6844ac220f4fb58b9d61528c95decea913b132
end_time: '2025-12-18T02:21:51.859Z'
---
## Problem Statement

Add Events category to tree view for cluster troubleshooting, making it easier for users to view and filter Kubernetes events without running kubectl commands manually.

## Goals

- Provide a visual interface for viewing Kubernetes events in the tree view
- Enable filtering by namespace, type, time range, and resource type
- Support search functionality for event messages
- Auto-refresh events every 30 seconds
- Color code events by severity (Normal, Warning, Error)
- Only show Events for operated clusters (those with kube9-operator installed)
- Retrieve event data from kube9-operator CLI utility, not directly from Kubernetes

## Approach

### Architecture
- Events category appears conditionally in tree view after Reports category
- Only visible when operator status is not "basic" (operated/enabled/degraded modes)
- Uses kube9-operator CLI via kubectl exec to retrieve event data
- Follows same conditional pattern as Reports menu

### Data Flow
- Extension discovers operator pod in kube9-system namespace
- Extension uses Kubernetes client Exec API (from `@kubernetes/client-node`)
- Executes operator CLI: `kube9-operator query events --format=json`
- Operator CLI returns JSON with event data
- Extension parses and filters events
- Events displayed in tree with color coding
- Auto-refresh queries operator CLI every 30 seconds

### Components
- **EventsTreeCategory**: Top-level tree category node
- **EventsProvider**: Retrieves events from operator CLI
- **EventTreeItem**: Individual event tree items with color coding
- **EventFilters**: Manages filter state per cluster

### Filtering
- Namespace filter (all or specific namespace)
- Type filter (Normal, Warning, Error, all)
- Time range filter (1h, 6h, 24h, all)
- Resource type filter (Pod, Deployment, Service, etc., all)
- Text search (filters by message content)

## Key Decisions

### Operator CLI via Kubernetes Client Exec API
**Decision**: Use kube9-operator CLI via Kubernetes client Exec API instead of kubectl process spawning or direct Kubernetes Events API

**Rationale**: 
- Consistent with current tree architecture (uses `@kubernetes/client-node`)
- Performance improvement over kubectl process spawning
- Operator can provide enhanced event data
- Operator handles rate limiting and caching
- Reduces load on Kubernetes API server
- Aligns with operator-aware architecture
- Reuses Kubernetes client singleton connections

### Conditional Visibility
**Decision**: Events only visible for operated clusters (operator installed)

**Rationale**:
- Events require operator CLI to function
- Maintains clear distinction between basic and operated tiers
- Avoids confusion about feature availability
- Follows same pattern as Reports menu

### Auto-Refresh Interval
**Decision**: 30 seconds default, toggleable

**Rationale**:
- Balances freshness with performance
- Prevents excessive CLI calls
- Can be disabled if not needed
- Standard interval for monitoring tools

### Event Limit
**Decision**: Limit display to 500 most recent events

**Rationale**:
- Prevents tree performance issues
- Most troubleshooting needs recent events
- Operator CLI can enforce limit efficiently
- Can expand in future if needed

## Notes

### Integration with Existing Features
- Uses existing OperatorStatusClient for status checks
- Follows ClusterTreeProvider pattern for conditional categories
- Integrates with Output Panel for event details
- Uses VS Code ThemeIcon for color coding

### Future Enhancements
- Event export functionality
- Custom filter presets
- Event notifications/alerts
- Real-time event streaming (vs polling)
- Event history beyond operator cache

### Performance Considerations
- Cache results for 30 seconds
- Limit to 500 events max
- Stop auto-refresh when tree not visible
- Use separate timer per cluster
- Efficient JSON parsing
- Use Kubernetes client Exec API (no kubectl process spawning)
- Reuse singleton Kubernetes client connections
