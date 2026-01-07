---
diagram_id: help-access-flow
name: Help Access Flow
description: User flow for accessing help resources through different entry points
type: flows
spec_id:
  - help-commands
  - help-ui-integration
feature_id:
  - help-commands
  - help-ui-elements
---

# Help Access Flow

This diagram shows the complete user flow for accessing help and documentation through various entry points in the extension.

```json
{
  "nodes": [
    {
      "id": "user-needs-help",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "User Needs Help",
        "description": "User has question or needs documentation"
      }
    },
    {
      "id": "choose-entry",
      "type": "default",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "Choose Entry Point",
        "description": "User selects how to access help"
      }
    },
    {
      "id": "command-open-docs",
      "type": "default",
      "position": { "x": -200, "y": 250 },
      "data": {
        "label": "Command: Open Docs",
        "description": "Kube9: Open Documentation"
      }
    },
    {
      "id": "command-report-issue",
      "type": "default",
      "position": { "x": -50, "y": 250 },
      "data": {
        "label": "Command: Report Issue",
        "description": "Kube9: Report Issue"
      }
    },
    {
      "id": "command-shortcuts",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": {
        "label": "Command: Shortcuts",
        "description": "Kube9: View Keyboard Shortcuts"
      }
    },
    {
      "id": "statusbar-click",
      "type": "default",
      "position": { "x": 250, "y": 250 },
      "data": {
        "label": "Status Bar Click",
        "description": "Click help icon in status bar"
      }
    },
    {
      "id": "webview-help",
      "type": "default",
      "position": { "x": 400, "y": 250 },
      "data": {
        "label": "Webview Help Button",
        "description": "Click help in webview"
      }
    },
    {
      "id": "error-learn-more",
      "type": "default",
      "position": { "x": 550, "y": 250 },
      "data": {
        "label": "Error Learn More",
        "description": "Click 'Learn more' in error"
      }
    },
    {
      "id": "show-quick-menu",
      "type": "default",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "Show Quick Menu",
        "description": "Display help options menu"
      }
    },
    {
      "id": "open-docs-home",
      "type": "default",
      "position": { "x": -200, "y": 450 },
      "data": {
        "label": "Open Docs Home",
        "description": "Open alto9.github.io/kube9"
      }
    },
    {
      "id": "open-issue-template",
      "type": "default",
      "position": { "x": -50, "y": 450 },
      "data": {
        "label": "Open Issue Template",
        "description": "GitHub with pre-filled template"
      }
    },
    {
      "id": "open-shortcuts-ref",
      "type": "default",
      "position": { "x": 100, "y": 450 },
      "data": {
        "label": "Open Shortcuts",
        "description": "VSCode keyboard shortcuts"
      }
    },
    {
      "id": "select-menu-option",
      "type": "default",
      "position": { "x": 250, "y": 450 },
      "data": {
        "label": "Select Menu Option",
        "description": "Choose from quick menu"
      }
    },
    {
      "id": "open-context-docs",
      "type": "default",
      "position": { "x": 400, "y": 450 },
      "data": {
        "label": "Open Context Docs",
        "description": "Specific docs for webview context"
      }
    },
    {
      "id": "open-error-docs",
      "type": "default",
      "position": { "x": 550, "y": 450 },
      "data": {
        "label": "Open Error Docs",
        "description": "Troubleshooting for specific error"
      }
    },
    {
      "id": "browser-opens",
      "type": "default",
      "position": { "x": 175, "y": 550 },
      "data": {
        "label": "Browser Opens",
        "description": "External resource in default browser"
      }
    },
    {
      "id": "user-reads",
      "type": "default",
      "position": { "x": 175, "y": 650 },
      "data": {
        "label": "User Reads",
        "description": "User consumes help content"
      }
    },
    {
      "id": "problem-resolved",
      "type": "default",
      "position": { "x": 50, "y": 750 },
      "data": {
        "label": "Problem Resolved",
        "description": "User finds answer"
      }
    },
    {
      "id": "return-extension",
      "type": "default",
      "position": { "x": 50, "y": 850 },
      "data": {
        "label": "Return to Extension",
        "description": "Continue working"
      }
    },
    {
      "id": "issue-created",
      "type": "default",
      "position": { "x": 300, "y": 750 },
      "data": {
        "label": "Issue Created",
        "description": "User submits GitHub issue"
      }
    },
    {
      "id": "track-issue",
      "type": "default",
      "position": { "x": 300, "y": 850 },
      "data": {
        "label": "Track Issue",
        "description": "User monitors issue progress"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user-needs-help",
      "target": "choose-entry",
      "label": "Seeks help",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "choose-entry",
      "target": "command-open-docs",
      "label": "Via command palette",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "choose-entry",
      "target": "command-report-issue",
      "label": "Via command palette",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "choose-entry",
      "target": "command-shortcuts",
      "label": "Via command palette",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "choose-entry",
      "target": "statusbar-click",
      "label": "Via status bar",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "choose-entry",
      "target": "webview-help",
      "label": "Via webview",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "choose-entry",
      "target": "error-learn-more",
      "label": "Via error message",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "command-open-docs",
      "target": "open-docs-home",
      "label": "Command runs",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "command-report-issue",
      "target": "open-issue-template",
      "label": "Command runs",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "command-shortcuts",
      "target": "open-shortcuts-ref",
      "label": "Command runs",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "statusbar-click",
      "target": "show-quick-menu",
      "label": "Opens menu",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "show-quick-menu",
      "target": "select-menu-option",
      "label": "User selects",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "select-menu-option",
      "target": "open-docs-home",
      "label": "Documentation",
      "type": "smoothstep",
      "style": { "strokeDasharray": "5 5" }
    },
    {
      "id": "e14",
      "source": "select-menu-option",
      "target": "open-issue-template",
      "label": "Report Issue",
      "type": "smoothstep",
      "style": { "strokeDasharray": "5 5" }
    },
    {
      "id": "e15",
      "source": "select-menu-option",
      "target": "open-shortcuts-ref",
      "label": "Shortcuts",
      "type": "smoothstep",
      "style": { "strokeDasharray": "5 5" }
    },
    {
      "id": "e16",
      "source": "webview-help",
      "target": "open-context-docs",
      "label": "Context passed",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "error-learn-more",
      "target": "open-error-docs",
      "label": "Error code passed",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "open-docs-home",
      "target": "browser-opens",
      "label": "URL opened",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "open-issue-template",
      "target": "browser-opens",
      "label": "URL opened",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "open-shortcuts-ref",
      "target": "browser-opens",
      "label": "VSCode opens",
      "type": "smoothstep"
    },
    {
      "id": "e21",
      "source": "open-context-docs",
      "target": "browser-opens",
      "label": "URL opened",
      "type": "smoothstep"
    },
    {
      "id": "e22",
      "source": "open-error-docs",
      "target": "browser-opens",
      "label": "URL opened",
      "type": "smoothstep"
    },
    {
      "id": "e23",
      "source": "browser-opens",
      "target": "user-reads",
      "label": "Content loads",
      "type": "smoothstep"
    },
    {
      "id": "e24",
      "source": "user-reads",
      "target": "problem-resolved",
      "label": "Found answer",
      "type": "smoothstep"
    },
    {
      "id": "e25",
      "source": "user-reads",
      "target": "issue-created",
      "label": "Submits issue",
      "type": "smoothstep"
    },
    {
      "id": "e26",
      "source": "problem-resolved",
      "target": "return-extension",
      "label": "Closes browser",
      "type": "smoothstep"
    },
    {
      "id": "e27",
      "source": "issue-created",
      "target": "track-issue",
      "label": "Monitors progress",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Paths

### Direct Command Path (Top-Left)

1. User needs help
2. Opens command palette
3. Runs "Kube9: Open Documentation" / "Report Issue" / "View Shortcuts"
4. Browser opens with appropriate resource
5. User reads documentation
6. Problem resolved or issue created

### Status Bar Quick Menu Path (Center)

1. User clicks help icon in status bar
2. Quick menu displays with options
3. User selects: Documentation, Report Issue, or Shortcuts
4. Browser opens with selected resource
5. User consumes content
6. Returns to extension

### Context-Sensitive Webview Path (Top-Right)

1. User working in webview (e.g., Events Viewer)
2. Clicks help button in webview
3. Extension opens documentation specific to that webview
4. User reads context-relevant help
5. Problem resolved

### Error Message Path (Far Right)

1. User encounters error
2. Error dialog includes "Learn more" link
3. User clicks link
4. Browser opens troubleshooting guide for that error
5. User follows guidance
6. Returns to extension

## User Experience Notes

### Discoverability
- Multiple entry points ensure help is always accessible
- Status bar provides persistent, visible help access
- Error messages guide users to relevant documentation

### Context-Sensitivity
- Webview help opens docs for that specific feature
- Error links point to troubleshooting for that error type
- Menu options organized by user intent (learn, report, reference)

### External Resources
- All content opens in default browser
- Allows documentation updates without extension updates
- Leverages GitHub for issue tracking and templates
- Uses VSCode native shortcuts reference

