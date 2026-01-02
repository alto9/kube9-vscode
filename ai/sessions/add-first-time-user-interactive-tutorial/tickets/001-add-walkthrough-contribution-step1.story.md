---
story_id: 001-add-walkthrough-contribution-step1
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 15 minutes
---

# Add Walkthrough Contribution - Step 1

## Objective

Add the VSCode Walkthroughs contribution structure to `package.json` with Step 1 (Explore the Cluster View) configured.

## Context

This is the first story in implementing the interactive tutorial. We're using VSCode's native Walkthroughs API to provide a 7-step guided onboarding experience. This story establishes the foundation by adding the walkthroughs contribution point and implementing the first step.

## Implementation

### File: `package.json`

Add to the `contributes` section:

```json
"walkthroughs": [
  {
    "id": "kube9.gettingStarted",
    "title": "Get Started with Kube9",
    "description": "Learn how to manage your Kubernetes clusters with Kube9",
    "when": "!kube9.tutorialCompleted",
    "steps": [
      {
        "id": "kube9.step1.exploreClusterView",
        "title": "Explore the Cluster View",
        "description": "Discover the Kube9 activity bar icon and learn about the tree structure that organizes clusters, namespaces, and resources.\n\n[Open Kube9 View](command:kube9.focus)",
        "media": {
          "image": "media/walkthrough/01-cluster-view.png",
          "altText": "Kube9 activity bar icon and cluster tree view"
        },
        "completionEvents": ["onView:kube9ClusterView"]
      }
    ]
  }
]
```

## Acceptance Criteria

- [ ] `walkthroughs` contribution added to package.json
- [ ] Walkthrough ID is `kube9.gettingStarted`
- [ ] `when` clause checks `!kube9.tutorialCompleted`
- [ ] Step 1 configured with correct ID, title, description
- [ ] Step 1 references media file path `media/walkthrough/01-cluster-view.png`
- [ ] Step 1 includes "Open Kube9 View" command button
- [ ] Completion event is `onView:kube9ClusterView`
- [ ] JSON syntax is valid (no errors)

## Testing

1. Run VSCode with the extension
2. Open Command Palette → "Getting Started"
3. Verify "Get Started with Kube9" walkthrough appears
4. Verify Step 1 is visible and displays correctly
5. Verify clicking "Open Kube9 View" attempts to open the view

## Files Involved

- `package.json` (add walkthroughs contribution)

## Dependencies

None - this is the first story

## Notes

- Media file `01-cluster-view.png` will be created in a later task
- The walkthrough will show a broken image until visual assets are created
- Subsequent stories will add steps 2-7 to this structure

