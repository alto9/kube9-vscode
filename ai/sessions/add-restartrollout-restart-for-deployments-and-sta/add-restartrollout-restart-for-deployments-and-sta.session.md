---
session_id: add-restartrollout-restart-for-deployments-and-sta
start_time: '2025-12-01T14:47:30.737Z'
status: development
problem_statement: Add restart/rollout restart for Deployments and StatefulSets
changed_files:
  - path: ai/features/cluster/workload-restart.feature.md
    change_type: added
    scenarios_added:
      - Restart Deployment from tree view context menu
      - Restart StatefulSet from tree view context menu
      - Restart DaemonSet from tree view context menu
      - Wait for rollout completion during restart
      - Restart without waiting for rollout completion
      - Cancel restart operation
      - Restart shows progress with pod updates
      - Handle restart errors gracefully
      - Confirmation dialog explains the operation
      - Tree view refresh after successful restart
      - Show restart status in tree view
      - Restart context menu only appears for restartable workloads
      - Restart annotation triggers controller reconciliation
      - Multiple restarts update the same annotation
      - Restart preserves all other workload configuration
start_commit: 6515ceea48f6eaa875cf6607d1c2d81c8c190b75
end_time: '2025-12-01T14:56:40.722Z'
---
## Problem Statement

Add restart/rollout restart for Deployments and StatefulSets

## Goals

- Enable users to restart workloads directly from the VSCode tree view
- Implement the restart using the Kubernetes rollout restart mechanism (annotation-based)
- Support Deployments, StatefulSets, and DaemonSets
- Provide optional "wait for rollout completion" functionality
- Show clear progress and status notifications during restart operations

## Approach

### Design Documents Created

1. **Feature**: `ai/features/cluster/workload-restart.feature.md`
   - Defines user-facing behavior using Gherkin scenarios
   - Covers all restart workflows including confirmation, progress tracking, and error handling
   - Includes 15 comprehensive scenarios

2. **Spec**: `ai/specs/cluster/workload-restart.spec.md`
   - Defines technical implementation details
   - Specifies the restart annotation mechanism: `kubectl.kubernetes.io/restartedAt`
   - Documents API endpoints, command registration, dialog structure, and error handling
   - Links to workload-restart feature

3. **Diagram**: `ai/diagrams/cluster/workload-restart-flow.diagram.md`
   - Visualizes the complete user interaction flow
   - Shows decision points for workload type checking, confirmation, and wait options
   - Includes rollout watch polling logic and timeout handling

### Technical Approach

The restart functionality uses the Kubernetes rollout restart mechanism:
- Add/update annotation `kubectl.kubernetes.io/restartedAt` with current timestamp
- PATCH the workload at `spec.template.metadata.annotations`
- Kubernetes controller detects pod template change and triggers rolling update
- New pods are created gradually while old pods are terminated

### User Experience Flow

1. User right-clicks workload (Deployment/StatefulSet/DaemonSet)
2. User selects "Restart" from context menu
3. Confirmation dialog appears explaining the operation with optional "Wait for rollout" checkbox
4. Progress notification shows during restart
5. If "Wait for rollout" selected, watch rollout status with live updates
6. Success notification appears when complete
7. Tree view and webviews refresh to show new pod states

## Key Decisions

### 1. Annotation-Based Restart vs Delete Pods
**Decision**: Use annotation-based rollout restart mechanism
**Rationale**: 
- More graceful than deleting pods directly
- Controller-managed rolling update ensures availability
- Standard Kubernetes practice (same as `kubectl rollout restart`)
- Preserves all workload configuration unchanged

### 2. Workload Type Support
**Decision**: Support Deployments, StatefulSets, and DaemonSets only
**Rationale**:
- These workload types have controllers that support rolling restarts
- ReplicaSets are typically managed by Deployments (shouldn't restart directly)
- Pods don't have a restart mechanism (would need to delete and recreate)
- CronJobs run on schedule (restart doesn't make sense)

### 3. Optional "Wait for Rollout" Checkbox
**Decision**: Provide checkbox in confirmation dialog, unchecked by default
**Rationale**:
- Some users want to trigger restart and move on (fast operation)
- Others want to ensure restart completes successfully (wait operation)
- Unchecked by default for faster user experience
- Users can choose based on their needs

### 4. Rollout Timeout
**Decision**: Set 5-minute timeout when watching rollout status
**Rationale**:
- Prevents indefinite waiting if pods fail to start
- 5 minutes is reasonable for most rollouts
- User gets clear timeout error if exceeded
- Tree view still refreshes to show actual state

### 5. Confirmation Dialog Required
**Decision**: Always show confirmation dialog before restart
**Rationale**:
- Restart is a disruptive operation (pods will be recreated)
- Users should understand what will happen
- Dialog explains the rolling restart mechanism
- Prevents accidental restarts

### 6. Spec Linkage in Diagram
**Decision**: Diagram does not use node-level spec linking
**Rationale**:
- This is a workflow diagram showing user interaction flow, not a component architecture diagram
- No individual nodes represent specific components that need separate spec documentation
- The entire flow relates to the overall restart specification
- Node-level spec linking (via `node.data.spec_id`) is reserved for component diagrams where specific nodes represent technical components

## Notes

### Related Features
This feature complements the existing `workload-scaling` feature:
- Both are workload management operations accessible from tree view context menu
- Both use similar UI patterns (dialog, progress, notifications)
- Both follow the same error handling and tree refresh approach

### Implementation Considerations
- Must handle case where `spec.template.metadata.annotations` doesn't exist (create it first)
- JSON Patch path must escape forward slash: `kubectl.kubernetes.io~1restartedAt`
- ISO 8601 timestamp format required for annotation value
- Rollout watch should poll every 2 seconds for status updates
- Tree view and webviews should refresh automatically after restart

### Testing Requirements
- Test all three workload types (Deployment, StatefulSet, DaemonSet)
- Test both "wait for rollout" options (checked and unchecked)
- Test cancellation from confirmation dialog
- Test error scenarios (resource not found, permission denied, timeout)
- Verify annotation is correctly applied and updated on multiple restarts
- Verify tree view and pod list updates during rolling restart

### GitHub Issue Reference
This design session addresses GitHub issue #17: https://github.com/alto9/kube9-vscode/issues/17
