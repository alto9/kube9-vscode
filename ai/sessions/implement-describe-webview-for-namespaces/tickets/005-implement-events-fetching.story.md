---
story_id: 005-implement-events-fetching
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Implement Namespace Events Fetching and Formatting

## Objective

Implement fetching and formatting of namespace-level events with grouping by type and reason.

## Acceptance Criteria

- `formatEvents()` method implemented
- Events grouped by type and reason (e.g., "Warning-QuotaExceeded")
- Event count aggregated for grouped events
- First and last occurrence timestamps tracked
- Age calculated from last occurrence
- Source component extracted
- Events filtered to namespace-level only (involvedObject.kind === "Namespace")

## Files to Modify

- `src/providers/NamespaceDescribeProvider.ts` - Add formatEvents method
- Update `getNamespaceDetails()` to fetch namespace events

## Implementation Notes

`formatEvents()` should:
1. Group events by `${type}-${reason}` key
2. Sort grouped events by lastTimestamp (most recent first)
3. Aggregate count from all grouped events
4. Extract first occurrence from oldest event in group
5. Extract last occurrence from most recent event in group
6. Calculate age from last occurrence using calculateAge()
7. Return NamespaceEvent[] array

Event fetching should use field selectors:
```typescript
involvedObject.kind=Namespace,involvedObject.name=${name}
```

## Estimated Time

20 minutes

## Dependencies

- Story 002 (requires NamespaceDescribeProvider foundation and calculateAge method)

