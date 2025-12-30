---
story_id: add-unit-tests
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Add Unit Tests for Node Describe Components

## Objective

Add comprehensive unit tests for utility functions and data transformation logic used in the node describe feature.

## Context

Key components need testing: quantity parsing, time formatting, and data transformation. These are pure functions that are easy to test and critical for correctness.

## Files to Create

- `src/utils/__tests__/kubernetesQuantity.test.ts` (new file)
- `src/utils/__tests__/timeFormatting.test.ts` (new file)
- `src/webview/__tests__/nodeDescribeTransformer.test.ts` (new file)

## Implementation Steps

### Test File 1: kubernetesQuantity.test.ts

Test parseKubernetesQuantity():
- Parse plain numbers
- Parse millicores (e.g., "100m" → 0.1)
- Parse memory quantities (Ki, Mi, Gi, Ti)
- Handle edge cases (empty string, invalid format, "0")

Test formatQuantity():
- Format cores with 2 decimals
- Format bytes in appropriate units (B, KiB, MiB, GiB)
- Format counts as integers

### Test File 2: timeFormatting.test.ts

Test formatRelativeTime():
- Format seconds ago (< 60s)
- Format minutes ago (< 60m)
- Format hours ago (< 24h)
- Format days ago (≥ 24h)
- Handle edge cases (invalid timestamp, future date)

### Test File 3: nodeDescribeTransformer.test.ts

Test transformNodeData():
- Transform complete V1Node with all fields
- Transform V1Node with missing optional fields
- Calculate resource metrics correctly
- Calculate usage percentages correctly
- Extract addresses, labels, taints
- Aggregate pod requests and limits
- Handle empty pod list
- Handle null/undefined gracefully

Create mock V1Node and V1Pod objects for testing

## Acceptance Criteria

- [ ] kubernetesQuantity.test.ts created with tests for parsing and formatting
- [ ] All quantity formats tested (cores, millicores, bytes with suffixes, counts)
- [ ] Edge cases tested (empty, invalid, zero values)
- [ ] timeFormatting.test.ts created with tests for relative time
- [ ] All time units tested (seconds, minutes, hours, days)
- [ ] nodeDescribeTransformer.test.ts created with transformation tests
- [ ] Complete and incomplete V1Node objects tested
- [ ] Resource calculations verified
- [ ] Pod aggregation verified
- [ ] All tests pass successfully
- [ ] Test coverage > 80% for tested files
- [ ] Tests use Jest framework (project standard)

## Estimated Time

< 30 minutes

## Dependencies

- Requires stories 003 and 004 to be completed (need functions to test)

