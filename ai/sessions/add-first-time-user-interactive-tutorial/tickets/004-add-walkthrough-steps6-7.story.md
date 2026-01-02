---
story_id: 004-add-walkthrough-steps6-7
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 20 minutes
---

# Add Walkthrough Steps 6-7

## Objective

Add Step 6 (Manage Resources) and Step 7 (Documentation) to complete the walkthrough configuration in `package.json`.

## Context

Final two tutorial steps that teach users about resource management operations and point them to documentation and additional resources.

## Implementation

### File: `package.json`

Add to the `steps` array in the `kube9.gettingStarted` walkthrough:

```json
{
  "id": "kube9.step6.manageResources",
  "title": "Manage Resources",
  "description": "Scale deployments and manage other workload resources. Right-click any workload to see management options like scale and delete.\n\n[Scale Workload](command:kube9.scaleWorkload)",
  "media": {
    "image": "media/walkthrough/06-management.png",
    "altText": "Resource management operations including scale and delete"
  },
  "completionEvents": ["onCommand:kube9.scaleWorkload"]
},
{
  "id": "kube9.step7.documentation",
  "title": "Documentation",
  "description": "You've learned the essentials! Find more help and resources:\n\n- Use **Cmd/Ctrl+Shift+P** to access all kube9 commands\n- Right-click resources for context menus\n- Check out [our documentation](https://alto9.github.io/kube9/) for detailed guides\n- Join our [community](https://github.com/alto9/kube9-vscode) for support\n\nHappy Kubernetes management! 🚀",
  "media": {
    "image": "media/walkthrough/07-documentation.png",
    "altText": "Documentation and help resources"
  }
}
```

## Acceptance Criteria

- [ ] Step 6 added with correct ID `kube9.step6.manageResources`
- [ ] Step 6 references `kube9.scaleWorkload` command
- [ ] Step 6 completion event configured correctly
- [ ] Step 7 added with correct ID `kube9.step7.documentation`
- [ ] Step 7 includes documentation links and community resources
- [ ] Step 7 has no explicit completion events (informational step)
- [ ] Both steps reference correct media files
- [ ] JSON syntax is valid (no errors)
- [ ] All 7 steps now configured in walkthrough

## Testing

1. Open walkthrough in VSCode
2. Verify all 7 steps appear in correct order
3. Navigate through entire tutorial from step 1 to step 7
4. Verify step 7 links work correctly
5. Confirm walkthrough completes properly after step 7

## Files Involved

- `package.json` (add final steps 6-7 to walkthroughs)

## Dependencies

- Story 003 (steps 4-5 must exist)

## Notes

- Step 6 uses existing `kube9.scaleWorkload` command (already implemented)
- Step 7 is informational with no required user action
- After this story, all 7 tutorial steps will be configured in package.json
- The walkthrough structure is now complete; remaining stories add supporting functionality

