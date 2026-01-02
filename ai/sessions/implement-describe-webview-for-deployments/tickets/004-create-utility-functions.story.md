---
story_id: create-utility-functions
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Create Utility Functions

## Objective

Create utility functions for parsing Kubernetes resource values (CPU, memory, percentages) and calculating ages/timestamps for deployment describe data transformation.

## Context

These utilities will be used by the data transformer to convert raw Kubernetes values into human-readable formats. Similar utilities exist for Node describe; these should be deployment-specific or reusable across webviews.

## Acceptance Criteria

- [ ] `parseResourceValue()` function handles CPU (millicores) and memory (bytes) parsing
- [ ] `calculateAge()` function converts ISO timestamps to relative ages ("2h", "5d")
- [ ] `calculateRelativeTime()` function creates "2h ago" format timestamps
- [ ] `parseIntOrPercent()` function handles "25%" or "1" values for maxSurge/maxUnavailable
- [ ] `extractImageTag()` function splits image:tag into separate parts
- [ ] Functions are exported and reusable
- [ ] Functions handle edge cases (undefined, null, invalid formats)

## Implementation Steps

1. Check if similar utilities exist in `src/utils/` or create new file
2. If creating new file: `src/utils/deploymentUtils.ts` or `src/utils/resourceUtils.ts`
3. Implement functions:

```typescript
export function parseResourceValue(value: string | number, type: 'cpu' | 'memory'): {
    value: string;
    raw: number;
}

export function calculateAge(timestamp: string): string

export function calculateRelativeTime(timestamp: string): string

export function parseIntOrPercent(value: any, base: number): number

export function extractImageTag(image: string): {
    image: string;
    tag: string;
}
```

4. Add unit tests if time permits (optional for < 30 min constraint)
5. Handle common Kubernetes formats:
   - CPU: "100m" = 100 millicores, "1" = 1000 millicores
   - Memory: "128Mi", "1Gi" converted to bytes
   - Percentages: "25%" or integer "1"

## Files to Create

- `src/utils/deploymentUtils.ts` OR reuse/extend existing resource utilities

## Notes

- May reuse existing utilities from NodeDescribeWebview transformation
- Keep functions pure (no side effects) for testability

