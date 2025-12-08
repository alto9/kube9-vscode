---
story_id: integrate-category-in-tree-provider
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view]
spec_id: [tree-view-spec]
diagram_id: [argocd-architecture]
status: pending
priority: high
estimated_minutes: 20
---

# Integrate ArgoCDCategory into ClusterTreeProvider

## Objective

Add ArgoCDCategory to the ClusterTreeProvider so it appears in the tree view after Configuration category and before Custom Resources.

## Context

The tree view's ClusterTreeProvider needs to conditionally show the ArgoCD Applications category when ArgoCD is detected in a cluster.

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Import ArgoCDCategory
3. Instantiate ArgoCDCategory in the constructor or category factory
4. Add logic to check if ArgoCD is installed for the cluster
5. Insert ArgoCDCategory in the category list after "Configuration"
6. Only include category if ArgoCD detected
7. Ensure category refreshes when cluster refreshes
8. Pass cluster context to category

## Files Affected

- `src/tree/ClusterTreeProvider.ts` - Add ArgoCDCategory to tree

## Acceptance Criteria

- [ ] ArgoCDCategory is imported and instantiated
- [ ] Category appears in tree when ArgoCD detected
- [ ] Category does not appear when ArgoCD not detected
- [ ] Category positioned after Configuration category
- [ ] Category refreshes with tree refresh
- [ ] Cluster context passed correctly to category

## Dependencies

- 007-create-argocd-tree-category (needs ArgoCDCategory class)

