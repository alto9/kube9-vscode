---
feature_id: interactive-tutorial
name: Interactive Tutorial
description: First-time user interactive walkthrough using VSCode's native Walkthroughs API
spec_id:
  - vscode-walkthroughs
---

# Interactive Tutorial

## Overview

The Interactive Tutorial provides a guided, hands-on onboarding experience for first-time users of the kube9 extension. Using VSCode's native Walkthroughs API, it presents a 7-step interactive tutorial that teaches users the essential features and operations, with progress tracking and replay capability.

## Behavior

```gherkin
Feature: Interactive Tutorial

Background:
  Given the kube9 extension is installed and activated
  And VSCode's Walkthroughs API is available
  And the tutorial consists of 7 progressive steps

Scenario: Tutorial appears automatically for first-time users
  Given this is the user's first time using kube9
  And the welcome screen has been shown
  When the user clicks "Start Tutorial" on the welcome screen
  Then the VSCode walkthrough should open
  And the walkthrough title should be "Get Started with Kube9"
  And the first step "Explore the Cluster View" should be highlighted
  And progress should show "0 of 7 steps completed"

Scenario: Step 1 - Explore the Cluster View
  Given the walkthrough is open on Step 1
  When the user reads the step description
  Then they should see an annotated PNG image showing the Kube9 activity bar icon
  And the description should explain the tree structure (Clusters → Namespaces → Resources)
  And there should be an action button "Open Kube9 View"
  When the user clicks "Open Kube9 View"
  Then the kube9 cluster view should open in the side panel
  And Step 1 should be marked as complete
  And progress should update to "1 of 7 steps completed"

Scenario: Step 2 - Explore Cluster Manager
  Given Step 1 is completed
  And the walkthrough is on Step 2
  When the user reads the step description
  Then they should see an image showing the Cluster Manager UI
  And the description should explain how to customize tree view organization
  And there should be an action button "Open Cluster Manager"
  When the user clicks "Open Cluster Manager" or runs the command manually
  Then the Cluster Manager webview should open
  And Step 2 should be marked as complete
  And progress should update to "2 of 7 steps completed"

Scenario: Step 3 - Navigate Resources
  Given Step 2 is completed
  And the walkthrough is on Step 3
  When the user reads the step description
  Then they should see an image showing expanded namespace hierarchy
  And the description should explain resource grouping
  And there should be instructions to expand a namespace
  When the user expands any namespace in the tree view
  Then Step 3 should be marked as complete
  And progress should update to "3 of 7 steps completed"

Scenario: Step 4 - View Resources
  Given Step 3 is completed
  And the walkthrough is on Step 4
  When the user reads the step description
  Then they should see an image showing resource describe webview
  And the description should explain how to view current resource status
  And there should be instructions to left-click a pod
  When the user clicks on any pod in the tree view
  Then the describe webview should open showing the pod's current status
  And Step 4 should be marked as complete
  And progress should update to "4 of 7 steps completed"

Scenario: Step 5 - View Pod Logs
  Given Step 4 is completed
  And the walkthrough is on Step 5
  When the user reads the step description
  Then they should see an image showing log viewer
  And the description should explain log viewing for debugging
  And there should be an action button "View Pod Logs"
  When the user clicks "View Pod Logs" or runs the command manually
  Then a pod logs webview should open
  And Step 5 should be marked as complete
  And progress should update to "5 of 7 steps completed"

Scenario: Step 6 - Manage Resources
  Given Step 5 is completed
  And the walkthrough is on Step 6
  When the user reads the step description
  Then they should see an image showing resource management operations
  And the description should explain scaling and deletion
  And there should be an action button "Scale Workload"
  When the user clicks "Scale Workload" or runs the command manually
  Then the scale dialog should appear
  And Step 6 should be marked as complete
  And progress should update to "6 of 7 steps completed"

Scenario: Step 7 - Documentation
  Given Step 6 is completed
  And the walkthrough is on Step 7
  When the user reads the step description
  Then they should see information about additional features
  And there should be links to documentation
  And there should be information about command palette commands
  And there should be information about accessing help resources
  When the user views this step
  Then Step 7 should be automatically marked as complete
  And progress should update to "7 of 7 steps completed"
  And the context key "kube9.tutorialCompleted" should be set to true

Scenario: Progress persists across VSCode sessions
  Given the user has completed 3 out of 7 steps
  And the user closes VSCode
  When the user reopens VSCode
  And the user opens the walkthrough again
  Then the progress should still show "3 of 7 steps completed"
  And steps 1-3 should be marked as complete
  And step 4 should be the next active step

Scenario: User can replay tutorial via command palette
  Given the user has previously completed the tutorial
  And "kube9.tutorialCompleted" is set to true
  When the user opens the command palette
  And searches for "Kube9: Show Getting Started Tutorial"
  And selects the command
  Then the walkthrough should open again
  And all previous progress should be shown
  And the user can interact with steps again to review

Scenario: User can exit tutorial at any time
  Given the walkthrough is open
  And the user is on step 3
  When the user closes the walkthrough panel
  Then progress should be saved
  And the extension should continue functioning normally
  And the user can reopen the walkthrough later to continue

Scenario: Tutorial only shows for users who haven't completed it
  Given the user has never opened kube9 before
  When the extension activates
  Then the walkthrough should be suggested (via welcome screen)
  Given the user has completed the tutorial
  When the extension activates
  Then the walkthrough should not appear automatically
  But it should still be accessible via command palette

Scenario: Visual assets support light and dark themes
  Given the walkthrough is open
  And the user has VSCode set to dark theme
  When step 1 is displayed
  Then the PNG image should be clearly visible
  And text should be readable
  When the user switches to light theme
  Then the same PNG image should remain visible
  And text should still be readable

Scenario: Completion events trigger correctly for each step
  Given the walkthrough system is monitoring user actions
  When the user performs the action for step 1 (open kube9 view)
  Then the completion event "onView:kube9ClusterView" should fire
  And step 1 should be marked complete
  When the user performs the action for step 2 (open Cluster Manager)
  Then the completion event "onCommand:kube9.openClusterManager" should fire
  And step 2 should be marked complete
  When the user performs the action for step 4 (view resource)
  Then the describe webview should open
  And step 4 should be marked complete

Scenario: Tutorial integrates with existing welcome screen
  Given the welcome screen is displayed for a first-time user
  When the welcome screen renders
  Then there should be a prominent "Start Tutorial" button
  And the button should be visually distinct
  When the user clicks "Start Tutorial"
  Then the welcome screen should remain open (or close based on UX decision)
  And the walkthrough should open immediately
  And the user should begin at step 1

Scenario: Tutorial provides links to additional resources
  Given the user is viewing step 7 "Documentation"
  When they read the step content
  Then they should see links to:
    - Full documentation
    - Command palette reference
    - Help and support resources
  And each link should open in the appropriate location
  And external links should open in default browser

Scenario: Tutorial accessibility for keyboard users
  Given the walkthrough is open
  And the user navigates using keyboard only
  When they press Tab to navigate
  Then focus should move through interactive elements
  And step action buttons should be reachable
  And the user should be able to complete steps without a mouse

Scenario: Tutorial handles missing clusters gracefully
  Given the user has no clusters configured
  And the walkthrough is open on step 3 "Navigate Resources"
  When the user views the step
  Then the step should show instructional content and images
  And the description should explain what will be possible with clusters
  And there should be a tip: "Connect a cluster to try this feature"
  And the step should provide a "Mark as Complete" button as fallback
  When the user clicks "Mark as Complete"
  Then the step should complete without requiring actual cluster interaction
  And the user should be able to continue to the next step

Scenario: Tutorial works with user's actual resources when available
  Given the user has clusters configured
  And the user has at least one namespace with resources
  When the walkthrough is open on step 3 "Navigate Resources"
  Then the user can expand their actual namespaces
  And interact with their real resources
  When the user expands any namespace
  Then the completion event fires naturally
  And the step marks as complete automatically

Scenario: Tutorial action buttons adapt to resource availability
  Given the walkthrough is open on step 4 "View Resources"
  And the user has no resources available
  When the step renders
  Then the instructions should still be visible
  And attempting to click a pod should show a helpful message if no pods exist
  And the step description should indicate "This works when you have resources"
  And a manual "Continue" or "Mark Complete" button should be available
```

## Implementation Notes

### Tutorial Works Without Resources

**Critical Design Principle**: The tutorial must provide value whether or not the user has clusters configured.

**Implementation Strategy**:
- **Instructional-first**: Every step teaches through images and text
- **Dual completion paths**: Natural (with resources) + Manual (without resources)
- **Adaptive commands**: Commands detect resource availability and show helpful guidance
- **Never block**: Users can always progress to the next step

**Example Step Flow**:
```
User with clusters: 
  View step → Click namespace → Event fires → Step completes ✓

User without clusters:
  View step → Read & learn from image → Click "Mark Complete" → Step completes ✓
```

This follows VSCode best practices used by Docker, GitHub, and Remote Development extensions.

### VSCode Walkthroughs API Integration
- Use `contributes.walkthroughs` in `package.json`
- Define 7 steps with unique IDs
- Set `when` clause to check `!kube9.tutorialCompleted`
- Each step includes: title, description, media (PNG image), completionEvents (including manual fallback commands)

### Visual Assets
- Create PNG images for each step (NOT SVG for security)
- Store in `media/walkthrough/` directory
- File naming: `01-cluster-view.png` through `07-documentation.png`
- Resolution: 1600x1200 (2x for retina)
- File size: < 200KB each (use PNG compression)
- Test visibility in light, dark, and high-contrast themes

### Completion Tracking
- Use VSCode's built-in progress tracking (automatic)
- Set context key `kube9.tutorialCompleted` when all steps done
- Store in VSCode global state for persistence
- No custom state management needed

### Command Registration
- Register `kube9.showTutorial` command
- Add to Command Palette with title "Kube9: Show Getting Started Tutorial"
- Make command always available (not dependent on context)

### Welcome Screen Integration
- Add "Start Tutorial" button to existing welcome screen
- Button opens walkthrough via `vscode.openWalkthrough()` API
- Consider keeping welcome screen open or closing it based on UX testing

## Related Features
- **initial-configuration**: Provides the welcome screen that links to this tutorial
- **cluster-view-navigation**: Features demonstrated in the tutorial
- **resource-operations**: Features taught in management steps

## Success Metrics
- % of first-time users who start the tutorial
- % of users who complete all 7 steps
- Average time to completion (target: < 15 minutes)
- % of users who replay the tutorial
- User feedback on tutorial helpfulness
```

