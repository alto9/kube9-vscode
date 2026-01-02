---
actor_id: first-time-user
name: First-Time User
type: user
description: A user who has just installed the kube9 extension and is learning to use it
---

# First-Time User

## Overview

The First-Time User is someone who has recently installed the kube9 VS Code extension and is unfamiliar with its features and capabilities. They need guided onboarding to understand how to navigate clusters, view resources, and perform basic operations.

## Characteristics

### Technical Profile
- **Kubernetes Experience**: Variable (from novice to experienced with kubectl)
- **VS Code Familiarity**: Regular VS Code user
- **Learning Style**: Prefers interactive, hands-on tutorials over documentation
- **Time Constraints**: Wants to get productive quickly (< 10 minutes onboarding)
- **Discovery Method**: Explores through guided experiences

### Goals
- Understand what kube9 can do for them
- Learn where key features are located
- Get comfortable with basic operations quickly
- Build confidence in using the extension
- Establish mental models for navigation and workflows

### Pain Points
- Overwhelmed by unfamiliar UI elements
- Unsure where to start or what to click
- Don't know what features are available
- Fear of making mistakes in production clusters
- Need to refer to documentation repeatedly

## Responsibilities

### During Onboarding
- Complete the interactive tutorial walkthrough
- Explore the cluster view interface
- Practice viewing resource YAML
- Learn to view pod logs
- Understand resource management operations
- Discover additional features through guided steps

### After Onboarding
- Transition to regular Developer actor behaviors
- Reference tutorial steps if needed (replay capability)
- Explore advanced features independently
- Build on foundational knowledge from tutorial

## Interactions

### With Tutorial System
- Views step-by-step walkthrough instructions
- Clicks through interactive tutorial steps
- Completes actions to validate understanding
- Views visual aids (images showing UI elements)
- Marks steps as complete through interaction

### With VS Code Extension
- Learns extension UI through guided exploration
- Practices basic operations in safe context
- Builds familiarity with command palette commands
- Discovers tree view navigation patterns

## User Journey: First-Time Experience

### Step 1: Installation and Welcome
1. Installs kube9 extension from marketplace
2. Extension activates and shows welcome screen
3. Sees "Start Tutorial" button prominently displayed
4. Clicks button to begin interactive walkthrough

### Step 2: Tutorial Walkthrough
1. **Explore Cluster View** - Learns where kube9 icon is, understands tree structure
2. **Navigate Resources** - Practices expanding namespaces and viewing resources
3. **View Resource YAML** - Discovers how to inspect configurations
4. **View Pod Logs** - Learns log viewing for debugging
5. **Manage Resources** - Understands scaling and deletion operations
6. **Discover More** - Learns about additional features and documentation

### Step 3: Post-Tutorial
1. Completes tutorial (or exits early)
2. Feels confident to start using extension
3. Can replay tutorial if needed via command palette
4. Transitions to independent exploration

## Tutorial Completion Events

### Successful Completion Indicators
- All 6 tutorial steps completed
- User has performed each key action at least once
- Progress tracked and persisted
- Tutorial marked as completed in VS Code state

### Partial Completion
- User exits tutorial before finishing
- Progress saved for later continuation
- Can restart or resume from last step

### Skip/Dismiss
- User chooses not to complete tutorial
- Can manually invoke tutorial later via command
- Extension remains fully functional

## Success Criteria

The First-Time User successfully onboards when they can:
- Locate the kube9 activity bar icon independently
- Navigate cluster resources without guidance
- View YAML and logs for debugging
- Understand how to scale and delete resources
- Know where to find additional features
- Feel confident to explore extension independently

## Transition to Developer Actor

After completing onboarding, the First-Time User becomes a **Developer** actor with:
- Full understanding of basic extension operations
- Confidence to explore advanced features
- Mental model for cluster navigation
- Knowledge of where to find help

## Related Actors

- **Developer**: The actor this user becomes after onboarding
- **Cluster Operator**: More advanced role some users may grow into
- **GitOps Developer**: Specialized role for ArgoCD users

## Design Considerations

### Tutorial Design
- Keep tutorial under 10 minutes for completion
- Make each step achievable with one simple action
- Provide clear visual guidance (arrows, highlights)
- Allow skipping or exiting at any time
- Make replay easily accessible

### Learning Outcomes
- Focus on essential features (80/20 rule)
- Build progressive confidence
- Avoid overwhelming with advanced features
- Create "aha moments" of discovery

### Accessibility
- Support keyboard-only navigation
- Provide clear text descriptions
- Work with screen readers
- Function in high-contrast themes

