---
story_id: create-utility-functions
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Create Utility Functions for Quantity Parsing and Time Formatting

## Objective

Create utility functions for parsing Kubernetes quantity strings (CPU, memory) and formatting relative timestamps, which will be used by the node describe webview data transformer.

## Context

Kubernetes uses special quantity formats (e.g., "100m" for millicores, "128Mi" for mebibytes). We need to parse these into numeric values and format them for display. We also need to format ISO timestamps as relative time (e.g., "2h ago").

## Files to Create

- `src/utils/kubernetesQuantity.ts` (new file)
- `src/utils/timeFormatting.ts` (new file)

## Implementation Steps

### File 1: src/utils/kubernetesQuantity.ts

Create utility functions for parsing and formatting Kubernetes quantities:

```typescript
/**
 * Parses Kubernetes quantity strings (e.g., "4", "16Gi", "100m").
 * @param quantity - The quantity string to parse
 * @param unit - The unit type ('cores', 'bytes', or 'count')
 * @returns Numeric value in base units
 */
export function parseKubernetesQuantity(
  quantity: string,
  unit: 'cores' | 'bytes' | 'count'
): number

/**
 * Formats numeric quantity for display.
 * @param value - The numeric value to format
 * @param unit - The unit type ('cores', 'bytes', or 'count')
 * @returns Formatted string (e.g., "2.50 cores", "4.00 GiB", "45")
 */
export function formatQuantity(
  value: number,
  unit: 'cores' | 'bytes' | 'count'
): string
```

Implementation details from spec:
- Handle millicores (e.g., "100m" = 0.1 cores)
- Handle memory suffixes (Ki, Mi, Gi, Ti, Pi, Ei)
- Handle plain numbers
- Format cores with 2 decimal places
- Format bytes in appropriate units (B, KiB, MiB, GiB, TiB)
- Format counts as plain integers

### File 2: src/utils/timeFormatting.ts

Create utility function for relative time formatting:

```typescript
/**
 * Formats ISO timestamp as relative time (e.g., "2h ago", "5m ago").
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Relative time string
 */
export function formatRelativeTime(isoTimestamp: string): string
```

Implementation details:
- Calculate time difference from now
- Return format: "Xs ago", "Xm ago", "Xh ago", "Xd ago"
- Handle seconds, minutes, hours, days

## Acceptance Criteria

- [ ] kubernetesQuantity.ts file created with parseKubernetesQuantity() function
- [ ] parseKubernetesQuantity() handles cores (including millicores with 'm' suffix)
- [ ] parseKubernetesQuantity() handles bytes (Ki, Mi, Gi, Ti, Pi, Ei suffixes)
- [ ] parseKubernetesQuantity() handles plain counts
- [ ] formatQuantity() function created and formats values appropriately
- [ ] formatQuantity() returns "X.XX cores", "X.XX GiB", or plain number based on unit
- [ ] timeFormatting.ts file created with formatRelativeTime() function
- [ ] formatRelativeTime() returns relative time in appropriate unit (s, m, h, d)
- [ ] Both functions are exported and have JSDoc comments
- [ ] Edge cases handled (empty strings, invalid formats, zero values)

## Estimated Time

< 30 minutes

## Dependencies

None - can be done in parallel with stories 001 and 002

