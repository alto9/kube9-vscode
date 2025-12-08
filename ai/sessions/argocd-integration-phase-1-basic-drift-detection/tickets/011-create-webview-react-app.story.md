---
story_id: create-webview-react-app
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-application-webview]
spec_id: [argocd-webview-spec]
status: completed
priority: high
estimated_minutes: 30
---

# Create Webview React Application Structure

## Objective

Create the React application entry point and main component structure for the ArgoCD application webview, including tab navigation and state management.

## Context

The webview needs a React application with Overview and Drift Details tabs. This story creates the basic structure and tab navigation.

## Implementation Steps

1. Create `src/webview/argocd-application/index.tsx` entry point
2. Create `src/webview/argocd-application/ArgoCDApplicationView.tsx` main component
3. Implement tab state management (Overview, Drift Details)
4. Create TabBar component for tab switching
5. Implement loading state component
6. Implement error state component
7. Set up vscode API acquisition
8. Set up message listener from extension
9. Implement state management for application data
10. Add webview state persistence (remember selected tab)

## Files Affected

- `src/webview/argocd-application/index.tsx` - Entry point
- `src/webview/argocd-application/ArgoCDApplicationView.tsx` - Main component
- `src/webview/argocd-application/components/TabBar.tsx` - Tab navigation

## Acceptance Criteria

- [x] React app renders in webview
- [x] Tab bar displays Overview and Drift Details tabs
- [x] Tab switching works correctly
- [x] Loading state displays while fetching data
- [x] Error state displays on fetch failure
- [x] VS Code API is acquired and messages received
- [x] Selected tab persists across webview hide/show

## Dependencies

- 010-create-webview-provider (needs provider to host webview)

