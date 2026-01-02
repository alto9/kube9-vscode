---
session_id: improve-error-messages-and-handling-throughout-ext
feature_id:
  - connection-errors
  - rbac-permission-errors
  - resource-not-found-errors
  - api-errors
  - timeout-errors
spec_id:
  - error-handler-utility
story_id: 005-create-specific-error-handlers
status: completed
---

# Create Specific Error Handlers

## Objective

Create five specialized error handler classes that build ErrorDetails objects with appropriate messages, suggestions, and actions for each error type.

## Files to Create

- `src/errors/SpecificErrorHandlers.ts`

## Dependencies

- Story 001 (types and interfaces)
- Story 004 (ErrorHandler)

## Implementation

Create `src/errors/SpecificErrorHandlers.ts` with five handler classes:

### 1. ConnectionErrorHandler
- **handleConnectionError(error, cluster, kubeconfigPath)**
  - Message: "Cannot connect to cluster '[cluster]'"
  - Suggestions: network check, verify endpoint, ensure kubectl installed
  - Actions: Retry, Open Kubeconfig, Troubleshooting Guide

- **handleKubectlNotFound()**
  - Message: "kubectl executable not found"
  - Suggestions: install kubectl, restart VS Code
  - Actions: Installation Guide link

### 2. RBACErrorHandler
- **handlePermissionDenied(error, resource, verb, namespace?)**
  - Message: "Permission denied: Cannot [verb] [resource]..."
  - Show required permission
  - Suggestions: check ServiceAccount, contact administrator
  - Actions: RBAC Documentation link

### 3. ResourceNotFoundErrorHandler
- **handleResourceNotFound(resourceType, resourceName, namespace?, onRefresh?)**
  - Message: "Resource [type]/[name] not found..."
  - Suggestions: may have been deleted, try refreshing
  - Actions: Refresh Tree View

### 4. TimeoutErrorHandler
- **handleTimeout(operation, duration, onRetry?)**
  - Message: "Operation timed out after [duration]"
  - Format duration as human-readable
  - Suggestions: cluster slow, check network, increase timeout
  - Actions: Retry, Increase Timeout

- **formatDuration(ms)** helper method

### 5. APIErrorHandler
- **handleAPIError(error, operation, context?)**
  - Routes to specific handlers based on status code
  
- **handleUnauthorized(error)** - 401
- **handleConflict(error, context?)** - 409
- **handleRateLimit(error)** - 429
- **handleServerError(error, operation)** - 500+
- **handleGenericAPIError(error, operation)** - others

Use the complete implementation from spec `error-handler-utility.spec.md` lines 319-670.

## Acceptance Criteria

- [x] File `src/errors/SpecificErrorHandlers.ts` created
- [x] All 5 handler classes implemented
- [x] ConnectionErrorHandler has 2 methods
- [x] RBACErrorHandler has handlePermissionDenied method
- [x] ResourceNotFoundErrorHandler has handleResourceNotFound method
- [x] TimeoutErrorHandler has handleTimeout and formatDuration methods
- [x] APIErrorHandler routes by status code to specific handlers
- [x] All handlers build proper ErrorDetails objects
- [x] All handlers call ErrorHandler.getInstance().handleError()
- [x] Actions include appropriate callback functions
- [x] File compiles without errors
- [x] Unit tests created and passing (`npm run test`)
- [x] Build succeeds (`npm run build`)

## Estimated Time

30 minutes

