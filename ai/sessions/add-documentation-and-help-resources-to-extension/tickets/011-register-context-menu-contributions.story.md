---
story_id: 011-register-context-menu-contributions
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: completed
estimated_minutes: 15
---

# Register Context Menu Contributions

## Objective

Add menu contributions to `package.json` so help commands appear in tree view context menus for the appropriate resource types.

## Context

VSCode requires menu contributions to display commands in context menus. The help commands should appear at the bottom of context menus in a "Help" group.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (context menu scenarios)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Tree View Context Menu Help section)

## Implementation

Add to `package.json`:

```json
{
  "menus": {
    "view/item/context": [
      {
        "command": "kube9.helpForPods",
        "when": "view == kube9ClusterView && viewItem =~ /pod/",
        "group": "z_help@1"
      },
      {
        "command": "kube9.helpForDeployments",
        "when": "view == kube9ClusterView && viewItem =~ /deployment/",
        "group": "z_help@1"
      },
      {
        "command": "kube9.helpForServices",
        "when": "view == kube9ClusterView && viewItem =~ /service/",
        "group": "z_help@1"
      }
    ]
  }
}
```

## Files to Modify

- **UPDATE**: `package.json` - Add menus.view/item/context contributions

## Acceptance Criteria

- [ ] Three menu contributions added for pod, deployment, service resources
- [ ] `when` clauses correctly filter by view and viewItem
- [ ] All help items in group "z_help@1" (appears at bottom of menu)
- [ ] Right-clicking pod shows "Help: Working with Pods"
- [ ] Right-clicking deployment shows "Help: Working with Deployments"
- [ ] Right-clicking service shows "Help: Working with Services"
- [ ] Help items appear in a separate section at bottom of menu

## Testing Notes

Manual verification:
- Right-click on a pod in tree view
  - Context menu includes "Help: Working with Pods" at bottom
  - Clicking opens pod documentation
- Right-click on a deployment
  - Context menu includes "Help: Working with Deployments" at bottom
  - Clicking opens deployment documentation
- Right-click on a service
  - Context menu includes "Help: Working with Services" at bottom
  - Clicking opens service documentation
- Help items appear as separate group (separator line above them)

