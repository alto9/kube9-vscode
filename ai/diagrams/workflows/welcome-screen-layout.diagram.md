---
diagram_id: welcome-screen-layout
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
---

# Welcome Screen Layout Diagram

This diagram visualizes the hierarchical structure and layout of the improved welcome screen UI.

```json
{
  "nodes": [
    {
      "id": "welcome-container",
      "type": "default",
      "position": { "x": 250, "y": 0 },
      "data": {
        "label": "Welcome Screen Container",
        "description": "Root container for welcome screen webview"
      }
    },
    {
      "id": "header",
      "type": "default",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Header Section",
        "description": "Title: 'Welcome to Kube9'"
      },
      "style": { "backgroundColor": "#e3f2fd" }
    },
    {
      "id": "dont-show-again",
      "type": "default",
      "position": { "x": 250, "y": 200 },
      "data": {
        "label": "Don't Show Again Control",
        "description": "Checkbox: 'Don't show this welcome screen again'\n✅ MOVED TO TOP (Issue #33.1)"
      },
      "style": { "backgroundColor": "#c8e6c9" }
    },
    {
      "id": "ecosystem-panel",
      "type": "default",
      "position": { "x": 250, "y": 320 },
      "data": {
        "label": "Kube9 Ecosystem Panel",
        "description": "4 core components\n✅ UPDATED (Issue #33.2)"
      },
      "style": { "backgroundColor": "#c8e6c9" }
    },
    {
      "id": "operator-item",
      "type": "default",
      "position": { "x": 50, "y": 440 },
      "data": {
        "label": "Kube9 Operator",
        "description": "Kubernetes operator\n+ Link to repo/docs"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 150 }
    },
    {
      "id": "server-item",
      "type": "default",
      "position": { "x": 220, "y": 440 },
      "data": {
        "label": "Kube9 Server",
        "description": "Backend server\n+ Link to repo/docs"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 150 }
    },
    {
      "id": "ui-item",
      "type": "default",
      "position": { "x": 390, "y": 440 },
      "data": {
        "label": "Kube9 UI",
        "description": "Web dashboard\n+ Link to repo/docs"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 150 }
    },
    {
      "id": "vscode-item",
      "type": "default",
      "position": { "x": 560, "y": 440 },
      "data": {
        "label": "Kube9 VS Code",
        "description": "This extension\n+ Link to repo/docs"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 150 }
    },
    {
      "id": "quickstart-panel",
      "type": "default",
      "position": { "x": 250, "y": 600 },
      "data": {
        "label": "Quick Start Guide Panel",
        "description": "Step-by-step guide with actual icons\n✅ MOVED UP (Issue #33.3)\n✅ SHOWS ACTUAL ICONS (Issue #33.4)"
      },
      "style": { "backgroundColor": "#c8e6c9" }
    },
    {
      "id": "step-1",
      "type": "default",
      "position": { "x": 100, "y": 720 },
      "data": {
        "label": "Step 1: Activity Bar Icon",
        "description": "Text: 'Click the [🔷] icon...'\n(🔷 = actual Kube9 icon rendered)"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 180 }
    },
    {
      "id": "step-2",
      "type": "default",
      "position": { "x": 300, "y": 720 },
      "data": {
        "label": "Step 2: Select Cluster",
        "description": "Instructions for cluster selection"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 180 }
    },
    {
      "id": "step-3",
      "type": "default",
      "position": { "x": 500, "y": 720 },
      "data": {
        "label": "Step 3: View Resources",
        "description": "Instructions for viewing resources"
      },
      "style": { "backgroundColor": "#fff9c4", "width": 180 }
    },
    {
      "id": "what-is-panel-removed",
      "type": "default",
      "position": { "x": 650, "y": 320 },
      "data": {
        "label": "❌ 'What is' Panel",
        "description": "REMOVED (Issue #33.3)"
      },
      "style": { "backgroundColor": "#ffcdd2" }
    },
    {
      "id": "portal-link-removed",
      "type": "default",
      "position": { "x": 650, "y": 440 },
      "data": {
        "label": "❌ 'Visit Portal' Link",
        "description": "REMOVED (Issue #33.5)"
      },
      "style": { "backgroundColor": "#ffcdd2" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "welcome-container",
      "target": "header",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e2",
      "source": "header",
      "target": "dont-show-again",
      "type": "default",
      "label": "followed by"
    },
    {
      "id": "e3",
      "source": "dont-show-again",
      "target": "ecosystem-panel",
      "type": "default",
      "label": "followed by"
    },
    {
      "id": "e4",
      "source": "ecosystem-panel",
      "target": "operator-item",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e5",
      "source": "ecosystem-panel",
      "target": "server-item",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e6",
      "source": "ecosystem-panel",
      "target": "ui-item",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e7",
      "source": "ecosystem-panel",
      "target": "vscode-item",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e8",
      "source": "ecosystem-panel",
      "target": "quickstart-panel",
      "type": "default",
      "label": "followed by"
    },
    {
      "id": "e9",
      "source": "quickstart-panel",
      "target": "step-1",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e10",
      "source": "quickstart-panel",
      "target": "step-2",
      "type": "default",
      "label": "contains"
    },
    {
      "id": "e11",
      "source": "quickstart-panel",
      "target": "step-3",
      "type": "default",
      "label": "contains"
    }
  ]
}
```

## Layout Structure

The improved welcome screen follows this vertical flow:

1. **Header** - Welcome to Kube9 title
2. **Don't Show Again Control** ✅ Moved to top (highly visible, no scrolling required)
3. **Kube9 Ecosystem Panel** ✅ Updated with 4 core components
   - Kube9 Operator
   - Kube9 Server
   - Kube9 UI
   - Kube9 VS Code
4. **Quick Start Guide Panel** ✅ Moved up, now more prominent
   - Step 1 with actual Kube9 activity bar icon rendered inline
   - Step 2 with instructions
   - Step 3 with instructions

## Removed Elements

- ❌ "What is" panel (removed to reduce clutter)
- ❌ "Visit Kube9 Portal" link (removed per issue #33.5)

## Visual Design Notes

- **Green nodes**: Updated/improved sections per issue #33
- **Yellow nodes**: Individual items within panels
- **Red nodes**: Elements to be removed
- **Blue node**: Header section (unchanged)


