---
story_id: create-webview-provider
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-application-webview]
spec_id: [argocd-webview-spec]
diagram_id: [argocd-architecture]
status: completed
priority: high
estimated_minutes: 30
---

# Create ArgoCDApplicationWebviewProvider

## Objective

Create the webview provider class that manages the webview panel lifecycle, loads application data, and handles message communication between extension and webview.

## Context

The webview displays detailed application information in a panel. The provider creates panels, loads data, sends messages to webview, and receives action requests.

## Implementation Steps

1. Create `src/webview/ArgoCDApplicationWebviewProvider.ts` file
2. Create `ArgoCDApplicationWebviewProvider` class
3. Implement `showApplication(name, namespace, context)` method
4. Create or reuse webview panel with proper options
5. Implement `getWebviewContent()` to generate HTML
6. Implement `loadApplicationData()` to fetch from ArgoCDService
7. Implement `setupMessageHandlers()` for webview↔extension communication
8. Handle messages: sync, refresh, hardRefresh, viewInTree, navigateToResource
9. Implement action handlers that call ArgoCDService
10. Implement `handleSync()`, `handleRefresh()`, `handleHardRefresh()`
11. Send status updates to webview via postMessage
12. Manage panel disposal and cleanup

## Files Affected

- `src/webview/ArgoCDApplicationWebviewProvider.ts` - Create provider class

## Acceptance Criteria

- [x] Provider creates webview panel with correct options
- [x] HTML content is generated with CSP policy
- [x] Application data is loaded from ArgoCDService
- [x] Data is sent to webview via postMessage
- [x] Message handler receives webview messages
- [x] Action handlers call appropriate service methods
- [x] Success/error notifications are shown
- [x] Panel disposal is handled cleanly

## Dependencies

- 006-implement-sync-actions (needs complete ArgoCDService for actions)

