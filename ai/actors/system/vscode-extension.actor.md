---
actor_id: vscode-extension
type: system
---

# VSCode Extension Actor

## Overview

The kube9 VS Code Extension is the primary system actor that orchestrates all interactions between the Developer, Kubernetes clusters, and AI services. It runs within the VS Code Extension Host process and provides visual Kubernetes management capabilities.

## Type

Internal System Actor - Core component of the kube9 ecosystem

## Characteristics

### Technical Profile
- **Runtime**: Node.js (v22+) within VS Code Extension Host
- **Language**: TypeScript (ES2020)
- **Architecture**: Event-driven with tree views, webviews, and command handlers
- **State Management**: In-memory caching with periodic refresh
- **Communication**: kubectl CLI for Kubernetes, file system for kubeconfig

### Capabilities
- Parse and monitor kubeconfig files
- Execute kubectl commands with proper error handling
- Render tree views and webviews
- Manage YAML editors with custom file system provider
- Cache cluster state and operator status
- Detect external context changes
- Coordinate refresh across multiple views
- Handle user commands and interactions

## Responsibilities

### Cluster Management
- Parse kubeconfig to discover available clusters
- Query cluster connectivity status
- Detect operator presence and mode
- Maintain cluster status cache
- Handle cluster switching

### Tree View Management
- Provide hierarchical cluster navigation
- Build resource categories dynamically
- Conditionally display Reports menu based on operator status
- Show Dashboard menu item for all clusters
- Update tree view on resource changes
- Handle tree item expansion and selection

### Webview Management
- Create and manage namespace webviews
- Create and manage dashboard webviews
- Create and manage describe webviews
- Handle webview message passing
- Coordinate webview refresh on resource changes
- Dispose webviews properly on close

### Resource Operations
- Fetch resource details via kubectl
- Apply YAML manifests to cluster
- Delete resources with confirmation
- Describe resources with formatted output
- Validate YAML syntax and Kubernetes schema
- Handle permission errors gracefully

### YAML Editor Management
- Open YAML editors for resources
- Provide custom file system for kube9-yaml:// URIs
- Validate YAML on save
- Execute dry-run before applying changes
- Detect conflicts with external changes
- Coordinate refresh after successful save

### Operator Integration
- Query operator status ConfigMap
- Cache operator status (5-minute TTL)
- Determine dashboard type based on operator mode
- Fetch dashboard data from operator ConfigMaps
- Handle operator unavailability gracefully

### State Synchronization
- Watch for external namespace context changes
- Notify webviews of context changes
- Refresh tree view on external changes
- Maintain consistency across views
- Cache frequently accessed data

## Interactions

### With Developer (User)
- **Input**: Commands, clicks, edits, configuration changes
- **Output**: Tree view updates, webviews, notifications, status updates
- **Pattern**: Event-driven responses to user actions

### With Kubernetes Cluster
- **Method**: kubectl CLI subprocess execution
- **Operations**: get, apply, delete, describe, logs, exec
- **Data Flow**: JSON output from kubectl parsed and displayed
- **Authentication**: Uses kubeconfig for cluster access

### With kube9-operator
- **Method**: kubectl get ConfigMap (for status and data)
- **Frequency**: On-demand with 5-minute cache
- **Data Retrieved**: Operator status, dashboard data, AI recommendations
- **Fallback**: Graceful degradation to free tier functionality

### With File System
- **Reads**: Kubeconfig files (~/.kube/config)
- **Watches**: Kubeconfig changes for cluster updates
- **Custom Providers**: kube9-yaml:// for YAML editors, kube9-describe:// for describe output

## Behavioral Patterns

### Progressive Enhancement
```
if (operatorStatus === 'basic') {
  // Free Tier: Show Free Non-Operated Dashboard
  showFreeDashboard();
} else {
  // Pro Tier: Show Free Operated Dashboard
  showOperatedDashboard(operatorStatus);
}
```

### Caching Strategy
- **Operator Status**: 5-minute cache to minimize kubectl calls
- **Namespace Context**: 5-second cache with periodic polling (30s)
- **Cluster Status**: Persisted between refreshes to prevent flicker
- **Tree Items**: Cached by context for targeted refresh

### Error Handling
- **kubectl Failures**: Parse stderr for specific error types (NotFound, Forbidden, Timeout)
- **Network Errors**: Fall back to cached data, show retry option
- **Permission Errors**: Display clear messages, disable unavailable actions
- **Validation Errors**: Show inline in editors with line numbers

### Refresh Coordination
```
Save YAML → Apply to cluster → Refresh tree view → Refresh webviews → Show success
```

## Data Flow

### Cluster Discovery Flow
```
1. Extension activates
2. Parse ~/.kube/config
3. Extract clusters and contexts
4. Check connectivity for each cluster
5. Query operator status for each cluster
6. Build tree view with results
```

### Resource View Flow
```
1. User clicks resource in tree
2. Execute kubectl get <resource> -o json
3. Parse JSON response
4. Create webview panel
5. Render resource data in webview HTML
6. Handle webview messages for actions
```

### YAML Edit Flow
```
1. User selects "View YAML" from context menu
2. Execute kubectl get <resource> -o yaml
3. Create custom URI: kube9-yaml://<cluster>/<ns>/<kind>/<name>
4. Open VS Code text editor with YAML content
5. User edits YAML
6. User saves (Ctrl+S)
7. Validate YAML syntax
8. Execute kubectl apply --dry-run=server
9. If valid, execute kubectl apply
10. Trigger refresh coordination
11. Show success notification
```

## State Management

### Extension State
- **Global State**: Welcome screen dismissed flag, user preferences
- **Workspace State**: Per-workspace settings and cache
- **Memory State**: Cluster status cache, operator status cache, tree item cache

### Shared State
- **kubectl Context**: Read from kubeconfig, modified via kubectl config
- **Active Namespace**: Managed by kubectl, watched by extension
- **Resource State**: Authoritative in Kubernetes cluster, cached locally

## Performance Considerations

### Optimization Strategies
- Lazy load tree view children (only query on expand)
- Cache operator status for 5 minutes
- Selective tree refresh (targeted item vs full tree)
- Debounce context change detection (30-second poll)
- Reuse kubectl processes when possible

### Resource Management
- Dispose webviews on close
- Clean up kubectl processes
- Clear caches periodically
- Unsubscribe from events on deactivation

## Error Recovery

### Graceful Degradation
- Operator unavailable → Fall back to free tier features
- kubectl not found → Show setup instructions
- Cluster unreachable → Show disconnected status, allow manual refresh
- Permission denied → Disable affected actions, show clear message

### Retry Strategies
- Network errors → Allow user-initiated retry
- Timeout errors → Suggest troubleshooting steps
- Not found errors → Refresh to sync current state

## Security Considerations

### Credentials
- Never store or transmit kubeconfig contents
- Use kubectl for all cluster authentication
- Respect RBAC permissions from Kubernetes

### Data Handling
- Free Tier: All operations local, no external calls
- Pro Tier: Only sanitized data from operator ConfigMaps
- No sensitive data in logs or error messages

## Related Actors

- **Developer**: Primary user of the extension
- **Kubernetes Cluster**: Target system for all operations
- **kube9-operator**: Provides enhanced features for Pro tier
- **kube9-server**: (Indirect) Operator syncs with server, extension queries operator

