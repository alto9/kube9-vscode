---
story_id: 012-add-comprehensive-error-handling
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Add Comprehensive Error Handling
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: pending
estimated_minutes: 20
---

# Add Comprehensive Error Handling

## Objective

Enhance error handling in resource fetchers to provide user-friendly error messages for common failure scenarios (authentication, permissions, network issues).

## Context

The API client can return various HTTP status codes and network errors. Users need clear, actionable error messages rather than raw API errors. This story implements the error handling patterns defined in the spec for all common scenarios.

## Acceptance Criteria

- [ ] Authentication errors (401) show "Check credentials in kubeconfig"
- [ ] Permission errors (403) show "Check RBAC permissions"
- [ ] Resource not found (404) shows helpful message
- [ ] Timeout errors (ETIMEDOUT) show "Check network connectivity"
- [ ] Connection refused (ECONNREFUSED) shows "Check cluster endpoint"
- [ ] DNS errors (ENOTFOUND) show "Verify cluster address"
- [ ] Error messages displayed via vscode.window.showErrorMessage()
- [ ] Errors still propagate for logging purposes
- [ ] User can retry operations after fixing issues

## Implementation Steps

1. Open `src/kubernetes/resourceFetchers.ts`
2. Enhance `handleApiError()` function to display user-friendly messages
3. Add vscode.window imports
4. Map error codes to actionable messages:
   ```typescript
   function handleApiError(error: any, operation: string): void {
       if (error.response) {
           const status = error.response.statusCode;
           const message = error.response.body?.message || 'Unknown error';
           
           if (status === 401) {
               vscode.window.showErrorMessage(
                   `Authentication failed: Check your credentials in kubeconfig. Operation: ${operation}`
               );
           } else if (status === 403) {
               vscode.window.showErrorMessage(
                   `Permission denied: You don't have access to ${operation}. Check your RBAC permissions with cluster administrator.`
               );
           } else if (status === 404) {
               vscode.window.showErrorMessage(
                   `Resource not found: ${message}. Operation: ${operation}`
               );
           } else if (status >= 500) {
               vscode.window.showErrorMessage(
                   `Cluster error: Server reported an error while trying to ${operation}. Check cluster health.`
               );
           }
       } else if (error.code === 'ETIMEDOUT') {
           vscode.window.showErrorMessage(
               `Connection timeout: Unable to reach cluster while trying to ${operation}. Check your network connection.`
           );
       } else if (error.code === 'ECONNREFUSED') {
           vscode.window.showErrorMessage(
               `Connection refused: Cluster endpoint not reachable while trying to ${operation}. Verify cluster is running.`
           );
       } else if (error.code === 'ENOTFOUND') {
           vscode.window.showErrorMessage(
               `DNS error: Could not resolve cluster address while trying to ${operation}. Verify cluster address in kubeconfig.`
           );
       }
       
       // Still log to console for debugging
       console.error(`API error during ${operation}:`, error);
   }
   ```
5. Test each error scenario

## Files to Modify

- `src/kubernetes/resourceFetchers.ts` - Enhance handleApiError()

## Testing

- Test with invalid kubeconfig (authentication error)
- Test with insufficient RBAC (permission error)
- Test with unreachable cluster (connection timeout)
- Test with invalid cluster endpoint (connection refused)
- Test with invalid DNS name (DNS error)
- Verify error messages are user-friendly and actionable
- Verify errors still logged to console for debugging

## Notes

- Error messages should be actionable (tell user what to do)
- Avoid technical jargon where possible
- Include operation context in message (what was being attempted)
- Consider adding "Retry" button to error notifications (future enhancement)
- Consider adding link to documentation for common errors (future)

