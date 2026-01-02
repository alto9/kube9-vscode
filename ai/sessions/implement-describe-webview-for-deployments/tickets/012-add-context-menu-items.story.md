---
story_id: add-context-menu-items
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Add Context Menu Items

## Objective

Ensure deployment tree items have both "Describe" and "Describe (Raw)" options in their context menu.

## Context

The context menu for deployment items should offer two describe options: the graphical webview and the raw text output. This matches the pattern used for other resources.

## Acceptance Criteria

- [ ] Right-click deployment shows "Describe" option
- [ ] Right-click deployment shows "Describe (Raw)" option
- [ ] "Describe" opens DeploymentDescribeWebview
- [ ] "Describe (Raw)" opens text editor with kubectl output
- [ ] Context menu items appear in logical order
- [ ] Menu items have appropriate icons (if applicable)

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

