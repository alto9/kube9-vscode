---
diagram_id: tutorial-flow
name: Tutorial Flow
description: Interactive tutorial walkthrough flow from first launch through completion
type: flows
spec_id:
  - vscode-walkthroughs
feature_id:
  - interactive-tutorial
  - initial-configuration
---

# Tutorial Flow

This diagram shows the complete flow of the first-time user interactive tutorial with 7 steps, from extension activation through tutorial completion and replay capability.

```json
{
  "nodes": [
    {
      "id": "extension-activate",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "Extension Activates",
        "description": "kube9 extension activates on first launch"
      }
    },
    {
      "id": "check-tutorial-status",
      "type": "default",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "Check Tutorial Status",
        "description": "Check globalState: kube9.tutorialCompleted"
      }
    },
    {
      "id": "show-welcome",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": {
        "label": "Show Welcome Screen",
        "description": "Display welcome webview with 'Start Tutorial' button"
      }
    },
    {
      "id": "user-choice",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": {
        "label": "User Choice",
        "description": "User decides: Start Tutorial or Explore"
      }
    },
    {
      "id": "open-walkthrough",
      "type": "default",
      "position": { "x": 300, "y": 450 },
      "data": {
        "label": "Open Walkthrough",
        "description": "VSCode opens kube9.gettingStarted walkthrough"
      }
    },
    {
      "id": "step1-cluster-view",
      "type": "default",
      "position": { "x": 300, "y": 550 },
      "data": {
        "label": "Step 1: Cluster View",
        "description": "Show activity bar icon, explain tree structure"
      }
    },
    {
      "id": "action1-open-view",
      "type": "default",
      "position": { "x": 500, "y": 550 },
      "data": {
        "label": "User Opens View",
        "description": "Clicks button or activity bar icon"
      }
    },
    {
      "id": "complete1",
      "type": "default",
      "position": { "x": 700, "y": 550 },
      "data": {
        "label": "Complete Step 1",
        "description": "Event: onView:kube9ClusterView"
      }
    },
    {
      "id": "step2-navigate",
      "type": "default",
      "position": { "x": 300, "y": 650 },
      "data": {
        "label": "Step 2: Navigate",
        "description": "Explain resource hierarchy"
      }
    },
    {
      "id": "action2-expand",
      "type": "default",
      "position": { "x": 500, "y": 650 },
      "data": {
        "label": "User Expands Namespace",
        "description": "Clicks to expand namespace node"
      }
    },
    {
      "id": "complete2",
      "type": "default",
      "position": { "x": 700, "y": 650 },
      "data": {
        "label": "Complete Step 2",
        "description": "Event: kube9.onNamespaceExpanded"
      }
    },
    {
      "id": "step3-yaml",
      "type": "default",
      "position": { "x": 300, "y": 750 },
      "data": {
        "label": "Step 3: View YAML",
        "description": "Explain configuration inspection"
      }
    },
    {
      "id": "action3-yaml",
      "type": "default",
      "position": { "x": 500, "y": 750 },
      "data": {
        "label": "User Views YAML",
        "description": "Clicks button or runs command"
      }
    },
    {
      "id": "complete3",
      "type": "default",
      "position": { "x": 700, "y": 750 },
      "data": {
        "label": "Complete Step 3",
        "description": "Event: onCommand:kube9.viewResourceYAML"
      }
    },
    {
      "id": "step4-logs",
      "type": "default",
      "position": { "x": 300, "y": 850 },
      "data": {
        "label": "Step 4: View Logs",
        "description": "Explain log viewing for debugging"
      }
    },
    {
      "id": "action4-logs",
      "type": "default",
      "position": { "x": 500, "y": 850 },
      "data": {
        "label": "User Views Logs",
        "description": "Clicks button or runs command"
      }
    },
    {
      "id": "complete4",
      "type": "default",
      "position": { "x": 700, "y": 850 },
      "data": {
        "label": "Complete Step 4",
        "description": "Event: onCommand:kube9.viewPodLogs"
      }
    },
    {
      "id": "step5-manage",
      "type": "default",
      "position": { "x": 300, "y": 950 },
      "data": {
        "label": "Step 5: Manage",
        "description": "Explain scaling and deletion"
      }
    },
    {
      "id": "action5-scale",
      "type": "default",
      "position": { "x": 500, "y": 950 },
      "data": {
        "label": "User Scales Resource",
        "description": "Clicks button or runs command"
      }
    },
    {
      "id": "complete5",
      "type": "default",
      "position": { "x": 700, "y": 950 },
      "data": {
        "label": "Complete Step 5",
        "description": "Event: onCommand:kube9.scaleWorkload"
      }
    },
    {
      "id": "step6-discover",
      "type": "default",
      "position": { "x": 300, "y": 1050 },
      "data": {
        "label": "Step 6: Discover More",
        "description": "Show additional features and docs"
      }
    },
    {
      "id": "complete6",
      "type": "default",
      "position": { "x": 500, "y": 1050 },
      "data": {
        "label": "Complete Step 6",
        "description": "Informational - no action required"
      }
    },
    {
      "id": "mark-complete",
      "type": "default",
      "position": { "x": 300, "y": 1150 },
      "data": {
        "label": "Mark Tutorial Complete",
        "description": "Set kube9.tutorialCompleted = true"
      }
    },
    {
      "id": "tutorial-done",
      "type": "default",
      "position": { "x": 300, "y": 1250 },
      "data": {
        "label": "Tutorial Complete",
        "description": "User can now explore independently"
      }
    },
    {
      "id": "explore-directly",
      "type": "default",
      "position": { "x": -100, "y": 450 },
      "data": {
        "label": "Explore Directly",
        "description": "User skips tutorial, explores extension"
      }
    },
    {
      "id": "replay-command",
      "type": "default",
      "position": { "x": 550, "y": 250 },
      "data": {
        "label": "Replay Via Command",
        "description": "User runs 'Show Getting Started Tutorial'"
      }
    },
    {
      "id": "returning-user",
      "type": "default",
      "position": { "x": 350, "y": 150 },
      "data": {
        "label": "Returning User",
        "description": "Tutorial already completed"
      }
    },
    {
      "id": "normal-operation",
      "type": "default",
      "position": { "x": 350, "y": 250 },
      "data": {
        "label": "Normal Operation",
        "description": "Extension operates without tutorial prompt"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "extension-activate",
      "target": "check-tutorial-status",
      "label": "On activation",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "check-tutorial-status",
      "target": "show-welcome",
      "label": "First time (false)",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "show-welcome",
      "target": "user-choice",
      "label": "Welcome displayed",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "user-choice",
      "target": "open-walkthrough",
      "label": "Start Tutorial",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "user-choice",
      "target": "explore-directly",
      "label": "Explore",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "open-walkthrough",
      "target": "step1-cluster-view",
      "label": "Walkthrough opens",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "step1-cluster-view",
      "target": "action1-open-view",
      "label": "User reads step",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "action1-open-view",
      "target": "complete1",
      "label": "Action performed",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "complete1",
      "target": "step2-navigate",
      "label": "Progress: 1/6",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "step2-navigate",
      "target": "action2-expand",
      "label": "User reads step",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "action2-expand",
      "target": "complete2",
      "label": "Action performed",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "complete2",
      "target": "step3-yaml",
      "label": "Progress: 2/6",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "step3-yaml",
      "target": "action3-yaml",
      "label": "User reads step",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "action3-yaml",
      "target": "complete3",
      "label": "Action performed",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "complete3",
      "target": "step4-logs",
      "label": "Progress: 3/6",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "step4-logs",
      "target": "action4-logs",
      "label": "User reads step",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "action4-logs",
      "target": "complete4",
      "label": "Action performed",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "complete4",
      "target": "step5-manage",
      "label": "Progress: 4/6",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "step5-manage",
      "target": "action5-scale",
      "label": "User reads step",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "action5-scale",
      "target": "complete5",
      "label": "Action performed",
      "type": "smoothstep"
    },
    {
      "id": "e21",
      "source": "complete5",
      "target": "step6-discover",
      "label": "Progress: 5/6",
      "type": "smoothstep"
    },
    {
      "id": "e22",
      "source": "step6-discover",
      "target": "complete6",
      "label": "User views step",
      "type": "smoothstep"
    },
    {
      "id": "e23",
      "source": "complete6",
      "target": "mark-complete",
      "label": "Progress: 6/6",
      "type": "smoothstep"
    },
    {
      "id": "e24",
      "source": "mark-complete",
      "target": "tutorial-done",
      "label": "State saved",
      "type": "smoothstep"
    },
    {
      "id": "e25",
      "source": "check-tutorial-status",
      "target": "returning-user",
      "label": "Completed (true)",
      "type": "smoothstep"
    },
    {
      "id": "e26",
      "source": "returning-user",
      "target": "normal-operation",
      "label": "Skip welcome/tutorial",
      "type": "smoothstep"
    },
    {
      "id": "e27",
      "source": "normal-operation",
      "target": "replay-command",
      "label": "User can manually invoke",
      "type": "smoothstep",
      "style": { "strokeDasharray": "5 5" }
    },
    {
      "id": "e28",
      "source": "replay-command",
      "target": "open-walkthrough",
      "label": "Command runs",
      "type": "smoothstep",
      "style": { "strokeDasharray": "5 5" }
    }
  ]
}
```

## Flow Explanation

### First-Time User Path (Left-to-Right Main Flow)

1. **Extension Activation** → Extension activates on first launch
2. **Check Tutorial Status** → Checks `globalState` for `kube9.tutorialCompleted`
3. **Show Welcome Screen** → Welcome webview displays (first time only)
4. **User Choice** → User chooses "Start Tutorial" or "Explore"
5. **Open Walkthrough** → VSCode walkthrough API opens tutorial
6. **Steps 1-7** → User progresses through interactive steps with actions:
   - Step 1: Explore Cluster View
   - Step 2: Explore Cluster Manager
   - Step 3: Navigate Resources
   - Step 4: View Resources (pod details)
   - Step 5: View Pod Logs
   - Step 6: Manage Resources (scale/delete)
   - Step 7: Documentation
7. **Mark Complete** → After step 7, tutorial status saved to globalState
8. **Tutorial Done** → User ready to use extension independently

### Returning User Path (Top-Right Branch)

1. **Extension Activation** → Extension activates on subsequent launches
2. **Check Tutorial Status** → Finds `tutorialCompleted = true`
3. **Returning User** → Skips welcome screen and tutorial
4. **Normal Operation** → Extension operates normally

### Replay Path (Dashed Lines)

- **Anytime**: User can run "Show Getting Started Tutorial" command
- **Replay Command** → Opens walkthrough again
- **Back to Walkthrough** → User can review all steps

### Skip Path (Left Branch)

- **User Choice** → User clicks "Explore" on welcome screen
- **Explore Directly** → User starts using extension without tutorial
- Tutorial remains accessible via command palette

## Key Implementation Points

### State Management
- Tutorial completion tracked in VSCode globalState
- Context key `kube9.tutorialCompleted` controls `when` clause
- Progress automatically persisted by VSCode between sessions

### Completion Events
- Built-in events: `onView:`, `onCommand:`
- Custom events: `kube9.onNamespaceExpanded`
- All events fire when specific user actions performed

### Integration Points
- **Welcome Screen**: Provides entry point to tutorial
- **Command Palette**: Provides replay mechanism
- **VSCode Walkthroughs**: Native UI for tutorial presentation
- **Tree View**: Target of many tutorial actions

## User Experience Notes

### Progressive Learning
- Steps build on each other (cluster → cluster manager → namespace → resource → logs → actions → docs)
- Each step requires one simple action
- Visual feedback through progress indicator (X of 7 steps)

### Flexibility
- Users can exit anytime (progress saved)
- Users can skip entirely (extension fully functional)
- Users can replay later (command always available)

### Discoverability
- Welcome screen prominently features tutorial
- Tutorial appears in VSCode's Getting Started
- Command available in palette for easy access

