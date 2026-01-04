---
story_id: 002-create-namespace-describe-provider-foundation
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Create NamespaceDescribeProvider Foundation

## Objective

Create NamespaceDescribeProvider class with TypeScript interfaces and basic structure for fetching namespace data.

## Acceptance Criteria

- New file created: `src/providers/NamespaceDescribeProvider.ts`
- All TypeScript interfaces defined (NamespaceDescribeData, NamespaceOverview, NamespaceStatus, etc.)
- NamespaceDescribeProvider class created with constructor accepting KubernetesClient
- Basic `getNamespaceDetails()` method skeleton that fetches namespace object
- `formatOverview()` method implemented to format basic namespace info
- `calculateAge()` helper method implemented

## Files to Create

- `src/providers/NamespaceDescribeProvider.ts`

## Implementation Notes

Interfaces to define (from spec):
- NamespaceDescribeData
- NamespaceOverview
- NamespaceStatus
- NamespaceCondition
- ResourceSummary
- PodSummary
- ServiceSummary
- JobSummary
- PVCSummary
- ResourceQuotaInfo
- LimitRangeInfo
- LimitRangeLimit
- NamespaceEvent
- NamespaceMetadata
- OwnerReference

Initial implementation should:
1. Fetch namespace object via `k8sClient.readNamespace(name)`
2. Format overview data (name, status, phase, age, UID, resource version)
3. Return skeleton data structure with empty arrays for resources, quotas, limits, events

## Estimated Time

25 minutes

## Dependencies

- Story 001 (for understanding config structure)

