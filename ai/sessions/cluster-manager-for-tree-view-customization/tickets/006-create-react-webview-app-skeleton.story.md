---
story_id: 006-create-react-webview-app-skeleton
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Create React Webview App Skeleton

## Objective

Create the React application skeleton for the Cluster Organizer webview with TypeScript, basic layout structure, and VS Code theme integration.

## Context

The webview UI is built with React and needs to display clusters, folders, and provide organization controls. This story creates the foundation React app with proper VS Code styling.

See:
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - React Component Structure, UI/UX Requirements
- `ai/features/studio/cluster-manager-webview.feature.md` - Cluster Organizer displays all clusters

## Acceptance Criteria

1. Create React app entry point at `media/cluster-manager/index.tsx`
2. Set up TypeScript React component: `ClusterManagerApp`
3. Create basic layout structure:
   - Header with title "Cluster Organizer"
   - Toolbar area (empty for now)
   - Main content area
   - Footer area (empty for now)
4. Import VS Code webview UI toolkit or use CSS variables for theming
5. Set up message sending to extension (acquireVsCodeApi())
6. Send `getClusters` message on mount
7. Display loading state while waiting for response

## Files to Create

- `media/cluster-manager/index.tsx` (React entry point)
- `media/cluster-manager/index.html` (HTML template)
- `media/cluster-manager/styles.css` (basic styles)
- `media/cluster-manager/types.ts` (TypeScript types for messages)

## Implementation Notes

Use VS Code CSS variables:
```css
--vscode-foreground
--vscode-background
--vscode-button-background
--vscode-input-background
```

Acquire VS Code API:
```typescript
const vscode = acquireVsCodeApi();
vscode.postMessage({ type: 'getClusters' });
```

## Estimated Time

30 minutes









