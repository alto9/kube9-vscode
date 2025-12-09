---
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
start_time: '2025-11-30T17:00:13.338Z'
status: completed
problem_statement: Add quick scale for Deployments/StatefulSets/ReplicaSets
changed_files:
  - path: ai/features/cluster/workload-scaling.feature.md
    change_type: added
    scenarios_added:
      - Scale Deployment from tree view context menu
      - Scale StatefulSet from tree view context menu
      - Scale ReplicaSet from tree view context menu
      - Scale to zero replicas
      - Input validation prevents negative values
      - Input validation prevents non-numeric values
      - Input validation prevents excessively large values
      - Handle scaling errors gracefully
      - Cancel scaling operation
      - Tree view refresh after successful scaling
      - Show current and desired replica counts in tree view
      - Scaling context menu only appears for scalable workloads
start_commit: f80f9c61eacb6e62baad010cdcd83c0f7e792f12
end_time: '2025-11-30T17:08:48.710Z'
---
## Problem Statement

Add quick scale for Deployments/StatefulSets/ReplicaSets

Users cannot scale workloads from the UI. They must edit YAML or use kubectl scale command directly. This session addresses GitHub issue #6.

## Goals

1. Enable users to scale Deployments, StatefulSets, and ReplicaSets directly from the tree view
2. Provide a simple, intuitive input dialog showing current replica count
3. Validate input to prevent invalid scaling operations
4. Show clear progress and result notifications
5. Automatically refresh tree view and webviews after scaling
6. Only show scale option for workload types that support scaling

## Approach

### Feature Design
- Add "Scale" context menu option for Deployments, StatefulSets, and ReplicaSets in tree view
- Use VSCode input dialog with current replica count as placeholder text
- Implement real-time input validation (numeric, 0-1000 range)
- Show progress notification during scaling operation
- Display success/error notifications with clear messaging

### Technical Implementation
- Use Kubernetes API PATCH on `/scale` subresource (not direct spec.replicas modification)
- Implement kubectl integration for scaling operations
- Add command registration in package.json with proper `when` clause
- Restrict context menu visibility to scalable workload types only
- Automatic tree view refresh after successful scaling
- Coordinate with namespace webview refresh when open

### User Experience
- Show current replica count in dialog placeholder: "Current: X replicas"
- Use singular/plural correctly: "1 replica" vs "5 replicas"
- Allow scaling to zero for shutdown scenarios
- Provide clear error messages for validation failures and API errors
- Support cancellation at any point before API call

## Key Decisions

1. **Use Scale Subresource**: Use Kubernetes `/scale` subresource instead of patching `spec.replicas` directly. This is the proper API for scaling operations and respects controller behavior.

2. **Validation Limits**: Set maximum replica count to 1000 as a reasonable upper bound. This prevents accidental massive scale-ups while allowing legitimate large deployments.

3. **Allow Scaling to Zero**: Permit scaling to 0 replicas, which is a valid operational scenario (e.g., temporarily shutting down a service).

4. **Workload Type Restrictions**: Only show "Scale" option for Deployments, StatefulSets, and ReplicaSets. DaemonSets and CronJobs do not support replica scaling and should not show this option.

5. **Automatic Refresh**: Automatically refresh tree view and namespace webview after scaling to show updated state without requiring manual refresh.

6. **Real-time Validation**: Use VSCode's `validateInput` function to provide immediate feedback as user types, rather than only validating on submit.

7. **Singular/Plural Grammar**: Implement proper grammar in notifications ("1 replica" vs "2 replicas") for better user experience.

## Notes

### GitHub Issue Reference
This design addresses GitHub issue #6: https://github.com/alto9/kube9-vscode/issues/6

### Acceptance Criteria from Issue
- ✅ User can scale Deployments
- ✅ User can scale StatefulSets
- ✅ User can scale ReplicaSets
- ✅ Current replica count shown in dialog
- ✅ Input validation prevents invalid values
- ✅ Success notification appears
- ✅ Tree view updates automatically

### Technical Notes from Issue
- Endpoint: PATCH /apis/apps/v1/namespaces/{ns}/deployments/{name}/scale
- Validate: replica count >= 0, <= 1000
- Consider showing desired vs actual vs ready replicas in tree view

### Related Features
- Tree view context menu system (already implemented)
- YAML editor (alternative way to scale by editing spec.replicas)
- Namespace webview workloads table (should also reflect scaling changes)

### Future Enhancements
- Show ready/desired replica counts in tree view labels or tooltips
- Add quick scale presets (e.g., "Scale to 0", "Scale to 1", "Scale to 3")
- Support for HorizontalPodAutoscaler awareness (warn if HPA is managing replicas)
- Bulk scaling operations (scale multiple workloads at once)
