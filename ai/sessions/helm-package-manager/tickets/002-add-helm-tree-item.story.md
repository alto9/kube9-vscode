---
story_id: 002-add-helm-tree-item
session_id: helm-package-manager
feature_id:
  - helm-package-manager-access
spec_id:
  - helm-webview-architecture
status: completed
---

# Story: Add Helm Package Manager Tree Item

## Objective

Add a single "Helm Package Manager" tree item to the Kube9 sidebar that will open the Helm webview when clicked.

## Context

The Helm Package Manager is accessed via a single tree item (not a tree hierarchy). When clicked, it opens a webview panel. See [helm-package-manager-access](../../features/helm/helm-package-manager-access.feature.md) for scenarios.

## Acceptance Criteria

- [ ] Add Helm tree item to existing Kube9 tree view provider
- [ ] Tree item displays "Helm Package Manager" label
- [ ] Tree item shows appropriate icon (package or helm icon)
- [ ] Tree item is positioned logically in the tree (after clusters, before settings)
- [ ] Register command `kube9.helm.openPackageManager` for tree item click
- [ ] Tree item is visible when extension is active
- [ ] Tree item tooltip shows "Manage Helm charts and releases"

## Implementation Notes

```typescript
// Add to tree provider
if (element === null) {
  const helmItem = new vscode.TreeItem('Helm Package Manager', vscode.TreeItemCollapsibleState.None);
  helmItem.command = {
    command: 'kube9.helm.openPackageManager',
    title: 'Open Helm Package Manager'
  };
  helmItem.iconPath = new vscode.ThemeIcon('package');
  helmItem.tooltip = 'Manage Helm charts and releases';
  return helmItem;
}
```

- Position after cluster items but before settings
- Use VS Code built-in 'package' icon or custom helm icon
- Command will be implemented in next story

## Files Involved

- `src/providers/KubeTreeProvider.ts` (or equivalent tree provider)
- `package.json` (register command in contributes.commands)

## Dependencies

- Existing tree view provider structure
- Depends on story 001 (HelmService) being available

## Estimated Time

15 minutes

