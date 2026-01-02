---
story_id: 003-add-walkthrough-steps4-5
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 20 minutes
---

# Add Walkthrough Steps 4-5

## Objective

Add Step 4 (View Resources) and Step 5 (View Pod Logs) to the walkthrough configuration in `package.json`.

## Context

Continuing the tutorial configuration by adding steps that teach users how to view resource details and access pod logs.

## Implementation

### File: `package.json`

Add to the `steps` array in the `kube9.gettingStarted` walkthrough:

```json
{
  "id": "kube9.step4.viewResources",
  "title": "View Resources",
  "description": "View detailed information about any resource by clicking on it. See current status, conditions, events, and more in the describe webview.\n\n**With resources:** Click any pod in the tree view to see its details.\n\n**Without resources yet?** The image shows what you'll see. [Mark Complete](command:kube9.internal.completeStep4)",
  "media": {
    "image": "media/walkthrough/04-view-resource.png",
    "altText": "Resource describe webview showing pod status and details"
  },
  "completionEvents": [
    "kube9.onPodClicked",
    "onCommand:kube9.internal.completeStep4"
  ]
},
{
  "id": "kube9.step5.viewLogs",
  "title": "View Pod Logs",
  "description": "Access pod logs directly from the tree view for debugging and monitoring. Logs open in a dedicated viewer with filtering and search.\n\n[View Pod Logs](command:kube9.viewPodLogs)",
  "media": {
    "image": "media/walkthrough/05-logs.png",
    "altText": "Pod logs viewer interface"
  },
  "completionEvents": ["onCommand:kube9.viewPodLogs"]
}
```

## Acceptance Criteria

- [ ] Step 4 added with correct ID `kube9.step4.viewResources`
- [ ] Step 4 has dual completion events (pod click + fallback)
- [ ] Step 4 description includes guidance for both with/without resources
- [ ] Step 5 added with correct ID `kube9.step5.viewLogs`
- [ ] Step 5 references `kube9.viewPodLogs` command
- [ ] Both steps reference correct media files
- [ ] JSON syntax is valid (no errors)

## Testing

1. Open walkthrough in VSCode
2. Verify Steps 4 and 5 appear in correct order
3. Check that all action buttons and text display correctly
4. Verify step navigation works smoothly

## Files Involved

- `package.json` (add steps 4-5 to walkthroughs)

## Dependencies

- Story 002 (steps 2-3 must exist)

## Notes

- Step 4 introduces pod click tracking (custom event `kube9.onPodClicked`)
- Fallback command `kube9.internal.completeStep4` will be implemented in story 008
- Pod click tracking will be implemented in story 010
- Step 5 uses existing `kube9.viewPodLogs` command (already implemented)

