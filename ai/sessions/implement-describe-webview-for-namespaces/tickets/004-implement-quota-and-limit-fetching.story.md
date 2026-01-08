---
story_id: 004-implement-quota-and-limit-fetching
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Implement Resource Quota and Limit Range Fetching

## Objective

Implement fetching and formatting of resource quotas and limit ranges for a namespace.

## Acceptance Criteria

- `formatResourceQuotas()` method implemented to format quota objects
- `formatLimitRanges()` method implemented to format limit range objects
- `parseResourceValue()` helper method to parse Kubernetes resource quantities (100m, 1Gi, etc.)
- Quota percentage calculations implemented (percentUsed)
- Hard limits and current usage extracted correctly
- Limit range constraints extracted for Container, Pod, and PVC types

## Files to Modify

- `src/providers/NamespaceDescribeProvider.ts` - Add quota and limit methods

## Implementation Notes

`formatResourceQuotas()` should:
1. Map quota objects to ResourceQuotaInfo[]
2. Extract spec.hard and status.used
3. Calculate percentUsed for each resource
4. Return formatted array

`formatLimitRanges()` should:
1. Map limit range objects to LimitRangeInfo[]
2. Extract limit.type (Container, Pod, PVC)
3. Extract constraints (default, defaultRequest, min, max, maxLimitRequestRatio)
4. Return formatted array

`parseResourceValue()` must handle:
- Millicores (100m = 0.1 cores)
- Memory units (Ki, Mi, Gi, Ti, K, M, G, T)
- Plain numbers

## Estimated Time

25 minutes

## Dependencies

- Story 002 (requires NamespaceDescribeProvider foundation)

