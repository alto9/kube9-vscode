---
story_id: add-tree-context-menu-commands
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view, argocd-actions]
spec_id: [argocd-service-spec]
status: completed
priority: high
estimated_minutes: 25
---

# Add Context Menu Commands for ArgoCD Applications

## Objective

Register VS Code commands for ArgoCD application actions (sync, refresh, hard refresh, view details) and wire them to tree view context menus.

## Context

Users need to trigger actions from the tree view context menu. Commands need to be registered in package.json and implemented in command handlers.

## Implementation Steps

1. Open `package.json`
2. Add commands to `contributes.commands`:
   - `kube9.argocd.sync` - Sync application
   - `kube9.argocd.refresh` - Refresh application
   - `kube9.argocd.hardRefresh` - Hard refresh application
   - `kube9.argocd.viewDetails` - Open webview
   - `kube9.argocd.copyName` - Copy application name
   - `kube9.argocd.copyNamespace` - Copy namespace
3. Add commands to `contributes.menus.view/item/context`:
   - Filter by contextValue: "argocd-application"
   - Add all commands to context menu
4. Create `src/commands/ArgoCDCommands.ts` file
5. Implement command handlers for each action
6. Register commands in extension activation

## Files Affected

- `package.json` - Add command definitions and menu contributions
- `src/commands/ArgoCDCommands.ts` - Create command handlers

## Acceptance Criteria

- [x] All commands defined in package.json
- [x] Commands appear in context menu for argocd-application items
- [x] Command handlers implemented
- [x] Handlers call ArgoCDService methods
- [x] Sync shows progress notification
- [x] Hard refresh shows confirmation dialog
- [x] Copy commands use clipboard API
- [x] Commands registered in extension.ts

## Dependencies

- 008-integrate-category-in-tree-provider (needs tree items with context value)

