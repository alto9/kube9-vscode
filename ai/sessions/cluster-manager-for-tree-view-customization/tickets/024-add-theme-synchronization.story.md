---
story_id: 024-add-theme-synchronization
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Add Theme Synchronization

## Objective

Synchronize VS Code theme (light/dark) with webview, sending theme change messages and applying appropriate CSS.

## Context

The webview must adapt to VS Code theme changes. This adds theme detection and synchronization.

See:
- `ai/features/studio/cluster-manager-webview.feature.md` - Cluster Manager supports theme switching
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Theme Changed message

## Acceptance Criteria

1. Detect current VS Code theme in extension
2. Send theme in `initialize` message ('light' | 'dark')
3. Listen for `onDidChangeActiveColorTheme` event
4. Send `themeChanged` message when theme changes
5. Apply theme class to webview root element
6. Test switching themes updates webview immediately

## Files to Modify

- `src/webviews/ClusterManagerWebview.ts`
- `media/cluster-manager/index.tsx`
- `media/cluster-manager/styles.css` (theme-specific styles)

## Implementation Notes

```typescript
// Extension
const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark 
  ? 'dark' 
  : 'light';

vscode.window.onDidChangeActiveColorTheme((e) => {
  const newTheme = e.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
  this.panel.webview.postMessage({ 
    type: 'themeChanged', 
    data: { theme: newTheme } 
  });
});

// Webview
<div className={`cluster-manager theme-${theme}`}>
```

CSS variables already handle most theming. May need few theme-specific overrides.

## Estimated Time

20 minutes

