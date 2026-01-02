---
session_id: implement-describe-webview-for-deployments
start_time: '2026-01-02T14:18:03.141Z'
status: development
problem_statement: Implement Describe Webview for Deployments
changed_files:
  - path: ai/features/webview/deployment-describe-webview.feature.md
    change_type: added
    scenarios_added:
      - Left-click on Deployment opens describe webview with overview
      - Deployment describe webview shows replica status with visual indicators
      - Deployment describe webview displays pod template specification
      - Deployment describe webview shows rollout strategy details
      - Deployment describe webview displays deployment conditions
      - Deployment describe webview lists related replica sets
      - Deployment describe webview shows selector and labels
      - Deployment describe webview displays events
      - Deployment describe webview shows annotations
      - Reusing the shared Describe webview across different deployments
      - Reusing the shared Describe webview across different resource types
      - Refresh button updates deployment information
      - Right-click Describe opens deployment webview
      - Right-click Describe (Raw) opens full kubectl describe output
      - Deployment with unhealthy status shows warning indicators
start_commit: 8f786fdedff82e901b17cf75c90ce4ce533daf74
end_time: '2026-01-02T14:24:51.583Z'
---
## Problem Statement

Implement Describe Webview for Deployments

Implement graphical `kubectl describe` functionality for Deployment resources using the existing shared Describe webview infrastructure. When a user left-clicks a Deployment in the tree view, it should open a cluster-specific Describe webview showing detailed Deployment information in a user-friendly format. This follows the same pattern recently implemented for Node resources.

## Goals

1. **Reuse shared webview pattern**: Use the same webview panel infrastructure as NodeDescribeWebview
2. **Comprehensive deployment information**: Display all relevant deployment details including:
   - Overview (status, replicas, strategy, age)
   - Replica status with visual indicators
   - Rollout strategy details
   - Pod template specification
   - Related ReplicaSets with revision history
   - Conditions with status indicators
   - Labels, selectors, and annotations
   - Recent events
3. **Dual access methods**: 
   - Left-click OR right-click → Describe opens graphical webview
   - Right-click → Describe (Raw) opens raw kubectl output in text editor
4. **Interactive features**: 
   - Refresh button to update data
   - Click ReplicaSet names to navigate in tree view
   - Copy functionality for labels, selectors, images
5. **Visual health indicators**: Show warning indicators when deployment is unhealthy (ready < desired)

## Approach

Following the established Node describe webview pattern:

1. **Feature Definition**: Created comprehensive Gherkin scenarios covering all user interactions and display requirements
2. **Technical Specification**: Defined complete TypeScript interfaces for:
   - DeploymentDescribeData and all nested structures
   - Data transformation functions from V1Deployment
   - kubectl integration commands
   - Message protocol between extension and webview
3. **Architecture Diagram**: Created data flow diagram showing:
   - User interaction flow
   - Parallel data fetching (deployment, replicasets, events)
   - Data transformation pipeline
   - Webview rendering and message passing

## Key Decisions

1. **Parallel Data Fetching**: Fetch deployment details, ReplicaSets, and events in parallel using Promise.all() for optimal performance
2. **ReplicaSet Filtering**: Use owner references to accurately identify ReplicaSets related to the deployment
3. **Revision History**: Display ReplicaSets sorted by revision (newest first) with current active ReplicaSet highlighted
4. **Health Status**: Calculate deployment health based on replica counts (ready === desired && available === desired)
5. **Event Filtering**: Show only events from the last hour by default to keep the display focused
6. **Strategy Display**: Handle both RollingUpdate and Recreate strategies with appropriate UI differences
7. **Probe Information**: Display all three probe types (liveness, readiness, startup) with human-readable configuration

## Notes

### Differences from Node Implementation

While following the Node pattern, Deployments have some unique characteristics:

- **Namespace-scoped**: Deployments exist in a namespace (nodes are cluster-scoped)
- **Related Resources**: Need to fetch and display related ReplicaSets
- **Rollout Status**: Complex rollout strategy and revision history to display
- **Pod Template**: Rich container configuration including probes, resources, and environment
- **Dynamic Status**: Deployment status changes during rollouts, requiring clear visual indicators

### Implementation Considerations

1. **Commands Module**: May need new commands in DeploymentCommands:
   - `getDeploymentDetails()`
   - `getRelatedReplicaSets()`
   - `getDeploymentEvents()`
   - `getDeploymentDescribeRaw()`

2. **Tree View Integration**: Update Deployment tree item to:
   - Handle left-click to open describe webview
   - Add "Describe" context menu option
   - Add "Describe (Raw)" context menu option

3. **Webview Controller**: Create DeploymentDescribeWebview.ts following NodeDescribeWebview pattern:
   - Static shared panel
   - Static show() method
   - Private refreshDeploymentData() method
   - Message handlers for refresh, navigate, copy actions

4. **UI Layout**: Webview should organize information into collapsible sections:
   - Header with name, namespace, refresh button
   - Overview card (status, replicas, strategy)
   - Replica status card (visual progress bars)
   - Rollout strategy card
   - Pod template card (containers, resources, probes)
   - Conditions card
   - ReplicaSets card (table with current highlighted)
   - Selectors & Labels card
   - Events card (warnings highlighted)
   - Annotations card (expandable for long values)

### Future Enhancements

- Add rollback capability directly from the webview
- Show deployment diff when viewing historical ReplicaSets
- Add scale controls to adjust replica count
- Display pod-level resource usage metrics when available
- Add pause/resume deployment controls
- Show deployment rollout progress in real-time
