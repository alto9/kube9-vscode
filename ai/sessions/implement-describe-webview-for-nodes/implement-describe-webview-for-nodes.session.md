---
session_id: implement-describe-webview-for-nodes
start_time: '2025-12-30T14:36:05.787Z'
status: development
problem_statement: Implement Describe Webview for Nodes
changed_files:
  - path: ai/features/webview/node-describe-webview.feature.md
    change_type: added
    scenarios_added:
      - Left-click on Node opens describe webview with overview
      - Node describe webview shows capacity and allocatable resources
      - Node describe webview displays node conditions
      - Node describe webview lists running pods
      - Node describe webview shows node addresses
      - Node describe webview displays node labels
      - Node describe webview shows node taints
      - Node describe webview shows allocated resources breakdown
      - Reusing the shared Describe webview across different nodes
      - Refresh button updates node information
      - Right-click Describe (Raw) opens full kubectl describe output
start_commit: 4ac23605f8baa6054de572753f6ea5ffa4880801
end_time: '2025-12-30T14:41:36.521Z'
---
## Problem Statement

Implement Describe Webview for Nodes

## Goals

Create a comprehensive describe webview specifically for Kubernetes Node resources that displays:
- Node overview (name, status, roles, version, runtime, OS info)
- Resource capacity and allocation (CPU, memory, pods, storage)
- Node conditions and health status
- Running pods with resource requests/limits
- Node addresses (internal/external IPs, hostname)
- Labels and taints
- Resource allocation breakdown

## Approach

1. **Created feature file**: `node-describe-webview.feature.md` with 11 Gherkin scenarios covering all aspects of node information display
2. **Created spec file**: `node-describe-webview-spec.spec.md` with complete technical implementation details including:
   - Data structures (NodeDescribeData, NodeOverview, NodeResources, etc.)
   - kubectl integration for fetching node details and pod lists
   - Message protocol between extension and webview
   - HTML structure and CSS theming
   - Implementation details for extension host and webview scripts
   - Utility functions for parsing Kubernetes quantities and formatting
3. **Created diagram**: `node-describe-flow.diagram.md` visualizing the complete data flow from user interaction through kubectl to webview rendering

## Key Decisions

### Reuse Shared Webview Panel
- Decision: Use a single shared describe webview panel that updates content when different nodes are selected
- Rationale: Reduces memory overhead and provides consistent UX (user doesn't have to manage multiple panels)
- Impact: NodeDescribeWebview maintains panel reference and updates title/content on each showNode() call

### Parallel Data Fetching
- Decision: Fetch node details and pod list in parallel using Promise.all()
- Rationale: Improves performance by reducing total wait time
- Impact: Both kubectl commands execute simultaneously; data is combined after both complete

### Resource Usage Calculation
- Decision: Calculate resource usage by aggregating pod requests/limits rather than querying metrics API
- Rationale: Simpler implementation, no dependency on metrics-server, shows scheduled vs actual capacity
- Impact: Displays "requested" resources, not actual runtime usage; sufficient for node scheduling analysis

### Condition Display Logic
- Decision: Display all node conditions with visual indicators, using inverse logic for "Ready" condition
- Rationale: Kubernetes conditions use "False" to indicate healthy state (e.g., MemoryPressure=False is good), except Ready
- Impact: UI shows green checkmarks for healthy states, red warnings for problematic states

### Click-to-Copy Functionality
- Decision: Enable click-to-copy for addresses, labels, and taints
- Rationale: Common user workflow to copy node details for debugging or documentation
- Impact: Each copyable element has a copy icon; clicking copies value to clipboard with confirmation

### Pod Navigation
- Decision: Clicking a pod name in the pod list navigates to that pod in the tree view
- Rationale: Provides seamless navigation between node details and pod details
- Impact: Requires message passing from webview to extension; extension expands tree and reveals pod

### Data Caching
- Decision: Cache node data for 30 seconds to reduce kubectl calls during refresh operations
- Rationale: Balance between fresh data and API performance
- Impact: Rapid refresh clicks within 30 seconds return cached data; after 30 seconds, data is re-fetched

## Notes

### Future Enhancements
- Add real-time metrics integration (CPU/memory usage from metrics-server) as optional enhancement
- Support filtering/searching in the pod list for nodes with many pods
- Add historical condition transitions to show node health over time
- Enable exporting node report as JSON or YAML
- Add comparison view to compare multiple nodes side-by-side

### Implementation Considerations
- NodeCommands.getNodeDetails() and PodCommands.getPodsOnNode() are new methods to be added
- Data transformer logic should handle edge cases (missing fields, null values, invalid quantities)
- Webview HTML should be responsive and support VS Code's theme changes
- Error handling should gracefully display errors without crashing the webview
- Progress indicators should show during initial load and refresh operations

### Testing Focus Areas
- Kubernetes quantity parsing (handle all formats: m, Ki, Mi, Gi, etc.)
- Relative time calculations (handle timezones and edge cases)
- Resource percentage calculations (avoid division by zero)
- Message passing between extension and webview (ensure no message loss)
- Webview panel lifecycle (ensure proper cleanup on dispose)
- Pod list sorting and navigation functionality
