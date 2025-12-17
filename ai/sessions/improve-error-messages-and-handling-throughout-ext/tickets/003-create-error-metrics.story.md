---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - error-handler-utility
story_id: 003-create-error-metrics
---

# Create Error Metrics Tracker

## Objective

Create a singleton class that tracks error occurrences by type, providing analytics and diagnostic information about error patterns.

## Files to Create

- `src/errors/ErrorMetrics.ts`

## Dependencies

- Story 001 (ErrorType enum)

## Implementation

Create `src/errors/ErrorMetrics.ts` implementing singleton pattern with:

1. **Private constructor** initializing `errorCounts` Map
2. **getInstance()** static method
3. **recordError(type: ErrorType)** to increment count
4. **getErrorCount(type: ErrorType)** to retrieve count for specific type
5. **getTotalErrors()** to sum all error counts
6. **reset()** to clear all counts
7. **getSummary()** to return Record<string, number> of all counts

Use the implementation from spec `error-handler-utility.spec.md` lines 494-528.

## Acceptance Criteria

- [ ] File `src/errors/ErrorMetrics.ts` created
- [ ] Singleton pattern implemented correctly
- [ ] Map<ErrorType, number> used to store counts
- [ ] recordError() increments count correctly
- [ ] getErrorCount() returns 0 for unrecorded types
- [ ] getTotalErrors() sums all counts
- [ ] getSummary() returns proper Record format
- [ ] File compiles without errors

## Estimated Time

10 minutes

