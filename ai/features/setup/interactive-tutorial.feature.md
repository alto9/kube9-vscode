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
  When the extension activates
  Then the tutorial webview should open automatically
  And the tutorial title should be "Get Started with Kube9"
  And the tutorial should display the Kube9 ecosystem section
  And the tutorial should display the quick start guide
  And the tutorial should have a "Do not show this again" checkbox at the top
  And the first step "Explore the Cluster View" should be visible

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
  And the tutorial is on Step 3
  When the user reads the step description
  Then they should see an image showing expanded namespace hierarchy
  And the description should explain resource grouping
  And there should be instructions to expand a namespace
  And there should be no "Mark Complete" button (instructions are informational only)
  When the user expands any namespace in the tree view (if clusters are available)
  Then Step 3 should be marked as complete automatically
  And progress should update to "3 of 7 steps completed"

Scenario: Step 4 - View Resources
  Given Step 3 is completed
  And the tutorial is on Step 4
  When the user reads the step description
  Then they should see an image showing resource describe webview
  And the description should explain how to view current resource status
  And there should be instructions to left-click a pod
  And there should be no "Mark Complete" button (instructions are informational only)
  When the user clicks on any pod in the tree view (if resources are available)
  Then the describe webview should open showing the pod's current status
  And Step 4 should be marked as complete automatically
  And progress should update to "4 of 7 steps completed"

Scenario: Step 5 - View Pod Logs
  Given Step 4 is completed
  And the tutorial is on Step 5
  When the user reads the step description
  Then they should see an image showing log viewer
  And the description should explain log viewing for debugging
  And there should be an informational message displayed inline explaining how to view pod logs
  And the message should say "Right-click any pod in the Kube9 tree view and select View Logs from the context menu"
  And there should be no button requiring a click to see the instruction
  When the user reads the step
  Then they should see all instructions without needing to interact with buttons

Scenario: Step 6 - Manage Resources
  Given Step 5 is completed
  And the tutorial is on Step 6
  When the user reads the step description
  Then they should see an image showing resource management operations
  And the description should explain scaling and deletion
  And there should be an informational message displayed inline explaining how to scale workloads
  And the message should say "Right-click any Deployment or StatefulSet in the Kube9 tree view and select Scale from the context menu"
  And there should be no button requiring a click to see the instruction
  When the user reads the step
  Then they should see all instructions without needing to interact with buttons

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

Scenario: Tutorial shows with dismissal option
  Given the user has never opened kube9 before
  When the extension activates
  Then the tutorial webview should open automatically
  And there should be a "Do not show this again" checkbox at the top
  And the checkbox should be unchecked by default
  When the user checks the checkbox and closes the tutorial
  Then the dismissal preference should be saved
  When the user reopens VS Code
  Then the tutorial should not appear automatically
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

Scenario: Tutorial includes ecosystem information
  Given the tutorial webview is displayed
  When the user views the tutorial
  Then they should see a section titled "The Kube9 Ecosystem" before the tutorial steps
  And the ecosystem section should display three cards:
    - Kube9 Operator
    - Kube9 VS Code
    - Kube9 Desktop
  And each card should have a description and link to GitHub
  And there should be a link to the complete ecosystem documentation

Scenario: Tutorial includes quick start guide
  Given the tutorial webview is displayed
  When the user views the tutorial
  Then they should see a "Quick Start Guide" section after the header
  And the quick start guide should list 5 steps for getting started
  And the steps should include instructions about kubeconfig, activity bar icon, and basic navigation

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
  And the tutorial is open on step 3 "Navigate Resources"
  When the user views the step
  Then the step should show instructional content and images
  And the description should explain what will be possible with clusters
  And there should be a tip: "Connect a cluster to try this feature"
  And there should be no "Mark Complete" button (instructions are informational)
  And the user can read and learn from the step content
  And the user can continue reading subsequent steps

Scenario: Tutorial works with user's actual resources when available
  Given the user has clusters configured
  And the user has at least one namespace with resources
  When the walkthrough is open on step 3 "Navigate Resources"
  Then the user can expand their actual namespaces
  And interact with their real resources
  When the user expands any namespace
  Then the completion event fires naturally
  And the step marks as complete automatically

Scenario: Tutorial displays all information without requiring button clicks
  Given the tutorial is open on step 5 "View Pod Logs"
  When the step renders
  Then all instructional information should be visible immediately
  And there should be no button that needs to be clicked to see instructions
  And the "How to View Pod Logs" message should be displayed inline
  Given the tutorial is open on step 6 "Manage Resources"
  When the step renders
  Then all instructional information should be visible immediately
  And there should be no button that needs to be clicked to see instructions
  And the "How to Scale Workloads" message should be displayed inline
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

### Tutorial Webview (Merged with Welcome Screen)
- The tutorial webview now includes content previously shown in the welcome screen
- Ecosystem section displays Kube9 Operator, Kube9 VS Code, and Kube9 Desktop
- Quick start guide provides immediate getting started steps
- "Do not show this again" checkbox allows users to dismiss the tutorial permanently
- Tutorial shows automatically on first activation if not dismissed

## Related Features
- **initial-configuration**: Tutorial replaces the welcome screen and shows on first activation
- **cluster-view-navigation**: Features demonstrated in the tutorial
- **resource-operations**: Features taught in management steps

## Success Metrics
- % of first-time users who start the tutorial
- % of users who complete all 7 steps
- Average time to completion (target: < 15 minutes)
- % of users who replay the tutorial
- User feedback on tutorial helpfulness
```

