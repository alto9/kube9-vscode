---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - error-ux-improvements
spec_id:
  - tree-view-error-display
story_id: 007-update-tree-provider-error-handling
status: completed
---

# Update ClusterTreeProvider with Error Handling

## Objective

Add error handling methods to ClusterTreeProvider for creating error items, categorizing errors, and implementing graceful degradation during resource loading.

## Files to Modify

- `src/tree/ClusterTreeProvider.ts`

## Dependencies

- Story 006 (ErrorTreeItem class)

## Implementation

Add the following methods to `ClusterTreeProvider`:

1. **createErrorItem(error, context, retryCallback?)**:
   - Categorize error using categorizeError()
   - Extract user-friendly message
   - Create and return ErrorTreeItem with retry callback

2. **categorizeError(error)**:
   - Check error.code for ECONNREFUSED, ETIMEDOUT, ENOTFOUND → CONNECTION
   - Check status code 403 → PERMISSION
   - Check status code 404 → NOT_FOUND
   - Check TimeoutError or ETIMEDOUT → TIMEOUT
   - Default → UNKNOWN

3. **extractErrorMessage(error)**:
   - Try error.response?.body?.message
   - Fall back to error.message
   - Fall back to error.toString()

4. **Update getChildren(element?)** to wrap in try-catch:
   - On error, create ErrorTreeItem with retry callback
   - Retry callback refreshes the specific element

5. **loadChildrenWithGracefulDegradation(loaders[])**:
   - Loop through loader functions
   - Try each loader, catch errors individually
   - Create ErrorTreeItem for failed loaders
   - Return array with mix of successful items and error items

Use the implementation from spec `tree-view-error-display.spec.md` lines 96-213.

## Acceptance Criteria

- [x] createErrorItem() method added
- [x] categorizeError() method categorizes by error codes and status codes
- [x] extractErrorMessage() method extracts user-friendly messages
- [x] getChildren() wrapped in try-catch with error item creation
- [x] Retry callback in getChildren() refreshes specific element
- [x] loadChildrenWithGracefulDegradation() method added
- [x] Graceful degradation catches errors per loader
- [x] Error items mixed with successful items in results
- [x] File compiles without errors
- [x] Tests pass (`npm run test`)
- [x] Build succeeds (`npm run build`)

## Estimated Time

25 minutes

