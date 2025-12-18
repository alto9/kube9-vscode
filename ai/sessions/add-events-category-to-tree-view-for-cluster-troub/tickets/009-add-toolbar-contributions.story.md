---
story_id: 009-add-toolbar-contributions
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: pending
---

# Add Toolbar Contributions for Events

## Objective

Add toolbar buttons to Events category for filtering, search, refresh, auto-refresh toggle, and clear filters actions.

## Context

VS Code tree views can have inline toolbar buttons. We need to add buttons for all Events filter and refresh actions.

## Files to Create/Modify

- `package.json` (modify - add menus configuration)

## Implementation

Add to `package.json` under `contributes.menus`:

```json
{
  "contributes": {
    "menus": {
      "view/item/context": [
        {
          "command": "kube9.events.filterNamespace",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@1"
        },
        {
          "command": "kube9.events.filterType",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@2"
        },
        {
          "command": "kube9.events.filterTimeRange",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@3"
        },
        {
          "command": "kube9.events.filterResourceType",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@4"
        },
        {
          "command": "kube9.events.search",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@5"
        },
        {
          "command": "kube9.events.clearFilters",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@6"
        },
        {
          "command": "kube9.events.refresh",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@7"
        },
        {
          "command": "kube9.events.toggleAutoRefresh",
          "when": "view == kube9ClustersView && viewItem == kube9.events.category",
          "group": "inline@8"
        }
      ]
    },
    "commands": [
      {
        "command": "kube9.events.filterNamespace",
        "title": "Filter by Namespace",
        "icon": "$(folder)"
      },
      {
        "command": "kube9.events.filterType",
        "title": "Filter by Type",
        "icon": "$(filter)"
      },
      {
        "command": "kube9.events.filterTimeRange",
        "title": "Filter by Time Range",
        "icon": "$(clock)"
      },
      {
        "command": "kube9.events.filterResourceType",
        "title": "Filter by Resource Type",
        "icon": "$(symbol-class)"
      },
      {
        "command": "kube9.events.search",
        "title": "Search Events",
        "icon": "$(search)"
      },
      {
        "command": "kube9.events.clearFilters",
        "title": "Clear Filters",
        "icon": "$(clear-all)"
      },
      {
        "command": "kube9.events.refresh",
        "title": "Refresh Events",
        "icon": "$(refresh)"
      },
      {
        "command": "kube9.events.toggleAutoRefresh",
        "title": "Toggle Auto-Refresh",
        "icon": "$(sync)"
      },
      {
        "command": "kube9.events.showDetails",
        "title": "Show Event Details"
      }
    ]
  }
}
```

## Acceptance Criteria

- [ ] All 8 filter/refresh commands added to package.json
- [ ] Commands have appropriate icons
- [ ] Commands only appear for Events category (contextValue check)
- [ ] Toolbar buttons appear inline on Events category
- [ ] Commands ordered logically (filters, search, clear, refresh, auto-refresh)

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventsTreeCategory Toolbar Actions)
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 15 minutes

