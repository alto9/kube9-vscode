---
story_id: 002-implement-pod-describe-provider-logic
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 30
---

# Implement PodDescribeProvider Data Fetching Logic

## Objective

Implement the PodDescribeProvider class that fetches Pod data from Kubernetes API and formats it into the data structures defined in story 001.

## Acceptance Criteria

- [ ] Implement `PodDescribeProvider` class in `src/providers/PodDescribeProvider.ts`
- [ ] Add constructor accepting `KubernetesClient` dependency
- [ ] Implement `getPodDetails(name, namespace, context)` method
- [ ] Fetch Pod object using `k8sClient.readNamespacedPod()`
- [ ] Fetch related events using `k8sClient.listNamespacedEvent()` with field selectors
- [ ] Implement `formatOverview()` private method
- [ ] Implement `calculatePodStatus()` with health logic (Healthy/Degraded/Unhealthy/Unknown)
- [ ] Implement `formatContainers()` for both regular and init containers
- [ ] Implement `formatContainerStatus()` to parse state (waiting/running/terminated)
- [ ] Implement `formatResources()` for CPU/memory requests and limits
- [ ] Implement `formatConditions()` method
- [ ] Implement `formatEvents()` with grouping by type and reason
- [ ] Implement `formatVolumes()` method
- [ ] Implement `formatMetadata()` method
- [ ] Implement `calculateAge()` helper method for timestamp formatting
- [ ] Add error handling for missing or invalid data

## Files Involved

**Modified Files:**
- `src/providers/PodDescribeProvider.ts`

## Implementation Notes

Reference the spec file for complete implementation details:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 160-443)

Health calculation logic:
- **Healthy**: Running phase, all conditions True, no restarts
- **Degraded**: Running with restarts OR Pending phase
- **Unhealthy**: Not ready conditions OR Failed phase
- **Unknown**: Cannot determine status

Event grouping:
- Group events by type and reason
- Count occurrences
- Show first and last timestamps

Use `@kubernetes/client-node` library for API calls.

## Dependencies

- Story 001 (interfaces must exist)

## Testing

- [ ] TypeScript compilation succeeds
- [ ] No linter errors
- [ ] Class exports correctly
- [ ] All methods implement their interfaces properly

