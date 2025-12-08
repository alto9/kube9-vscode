---
story_id: create-argocd-tree-category
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view]
spec_id: [argocd-service-spec, tree-view-spec]
diagram_id: [argocd-architecture]
status: completed
priority: high
estimated_minutes: 30
---

# Create ArgoCDCategory Class for Tree View

## Objective

Create the `ArgoCDCategory` class that extends `BaseCategory` to display ArgoCD Applications in the tree view with application count badge and status icons.

## Context

The tree view needs a new category for ArgoCD Applications that appears when ArgoCD is detected. This category shows all applications with sync/health status indicators.

## Implementation Steps

1. Create `src/tree/categories/ArgoCDCategory.ts` file
2. Create `ArgoCDCategory` class extending `BaseCategory`
3. Implement constructor with `ArgoCDService` dependency
4. Override `getLabel()` to return "ArgoCD Applications"
5. Override `getDescription()` to show count badge "(X)"
6. Override `getChildren()` to query and display applications
7. Call `argoCDService.isInstalled()` to check if ArgoCD present
8. Call `argoCDService.getApplications()` to get application list
9. Create tree items for each application with proper icons
10. Map sync/health status to icon names
11. Set contextValue to "argocd-application" for context menu
12. Handle empty state, errors gracefully

## Files Affected

- `src/tree/categories/ArgoCDCategory.ts` - Create category class

## Acceptance Criteria

- [ ] ArgoCDCategory extends BaseCategory
- [ ] Label is "ArgoCD Applications"
- [ ] Description shows application count
- [ ] getChildren() queries ArgoCDService
- [ ] Applications displayed with correct status icons
- [ ] Icons reflect sync status (Synced=green, OutOfSync=yellow)
- [ ] Icons reflect health status (Healthy=check, Degraded=error)
- [ ] Empty state handled ("No applications found")
- [ ] Errors handled gracefully

## Dependencies

- 006-implement-sync-actions (needs complete ArgoCDService)

