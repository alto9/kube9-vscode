---
story_id: add-context-menu-items
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Add Context Menu Items

## Objective

Ensure deployment tree items have both "Describe" and "Describe (Raw)" options in their context menu.

## Context

The context menu for deployment items should offer two describe options: the graphical webview and the raw text output. This matches the pattern used for other resources.

## Acceptance Criteria

- [x] Right-click deployment shows "Describe" option
- [x] Right-click deployment shows "Describe (Raw)" option
- [x] "Describe" opens DeploymentDescribeWebview
- [x] "Describe (Raw)" opens text editor with kubectl output
- [x] Context menu items appear in logical order
- [x] Menu items have appropriate icons (if applicable)

## Implementation Steps

1. Check `package.json` for context menu contributions
2. Verify `menus` section includes deployment-specific context menu items:
```json
"menus": {
    "view/item/context": [
        {
            "command": "kube9.describeResource",
            "when": "view == kube9TreeView && viewItem =~ /resource:Deployment/",
            "group": "describe@1"
        },
        {
            "command": "kube9.describeResourceRaw",
            "when": "view == kube9TreeView && viewItem =~ /resource:Deployment/",
            "group": "describe@2"
        }
    ]
}
```
3. Verify deployment tree items have correct `contextValue`:
   - Open `src/tree/categories/workloads/DeploymentsSubcategory.ts`
   - Check that deployment items have `contextValue = 'resource:Deployment'`
4. Test context menu appears and commands work
5. Adjust menu groups and ordering if needed

## Files to Verify/Modify

- `package.json` - Add menu contributions if missing
- `src/tree/categories/workloads/DeploymentsSubcategory.ts` - Verify contextValue

## Notes

- Context menu contributions may already exist generically for all resources
- Verify with regex pattern matching: `viewItem =~ /resource:Deployment/`
- Menu groups like "describe@1" control ordering within the context menu

## Implementation Summary

**Verification Complete**: The generic pattern `/^resource/` in `package.json` (lines 440-447) already matches `resource:Deployment`, so both "Describe" and "Describe (Raw)" context menu items are available for deployments. The implementation was verified:

1. ✅ `package.json` has generic pattern `/^resource/` for both commands (lines 440-447)
2. ✅ `DeploymentsSubcategory.ts` sets `contextValue = 'resource:Deployment'` (line 84)
3. ✅ Commands are registered in `extension.ts` (lines 453-490)
4. ✅ `DescribeWebview.showFromTreeItem()` routes deployments to `DeploymentDescribeWebview` (lines 205-223)
5. ✅ `describeRawCommand()` handles raw describe output for all resources including deployments
6. ✅ Build and tests pass successfully

**Commit Message**: `chore: verify deployment describe context menu items`

