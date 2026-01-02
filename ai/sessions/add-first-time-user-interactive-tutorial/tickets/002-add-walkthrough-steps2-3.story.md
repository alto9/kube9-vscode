---
story_id: 002-add-walkthrough-steps2-3
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 20 minutes
---

# Add Walkthrough Steps 2-3

## Objective

Add Step 2 (Explore Cluster Manager) and Step 3 (Navigate Resources) to the walkthrough configuration in `package.json`.

## Context

Building on story 001, we're adding the next two tutorial steps that teach users about the Cluster Manager feature and how to navigate the resource hierarchy.

## Implementation

### File: `package.json`

Add to the `steps` array in the `kube9.gettingStarted` walkthrough:

```json
{
  "id": "kube9.step2.exploreClusterManager",
  "title": "Explore Cluster Manager",
  "description": "Learn how to customize your tree view organization with the Cluster Manager. Create custom views, organize namespaces, and tailor the interface to your workflow.\n\n[Open Cluster Manager](command:kube9.openClusterManager)",
  "media": {
    "image": "media/walkthrough/02-cluster-manager.png",
    "altText": "Cluster Manager UI showing customization options"
  },
  "completionEvents": ["onCommand:kube9.openClusterManager"]
},
{
  "id": "kube9.step3.navigateResources",
  "title": "Navigate Resources",
  "description": "Learn how to expand clusters and namespaces to explore Kubernetes resources organized in a hierarchical tree.\n\n**With clusters:** Try expanding a namespace in the kube9 view to see its resources.\n\n**Without clusters yet?** The image shows what you'll see when you connect a cluster. [Mark Complete](command:kube9.internal.completeStep3)",
  "media": {
    "image": "media/walkthrough/03-navigation.png",
    "altText": "Expanded namespace showing resource hierarchy"
  },
  "completionEvents": [
    "kube9.onNamespaceExpanded",
    "onCommand:kube9.internal.completeStep3"
  ]
}
```

## Acceptance Criteria

- [ ] Step 2 added with correct ID `kube9.step2.exploreClusterManager`
- [ ] Step 2 references Cluster Manager command and media file
- [ ] Step 2 completion event is `onCommand:kube9.openClusterManager`
- [ ] Step 3 added with correct ID `kube9.step3.navigateResources`
- [ ] Step 3 description includes both "with clusters" and "without clusters" paths
- [ ] Step 3 has dual completion events (natural + fallback)
- [ ] JSON syntax is valid (no errors)

## Testing

1. Open walkthrough in VSCode
2. Verify Step 2 appears after Step 1
3. Verify Step 3 appears after Step 2
4. Check that all text, buttons, and structure display correctly

## Files Involved

- `package.json` (add steps 2-3 to walkthroughs)

## Dependencies

- Story 001 (walkthrough structure must exist)

## Notes

- Step 3 introduces the pattern of dual completion paths (with/without resources)
- Fallback command `kube9.internal.completeStep3` will be implemented in story 007
- Custom completion event `kube9.onNamespaceExpanded` will be implemented in story 009

