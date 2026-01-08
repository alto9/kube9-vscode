---
diagram_id: help-system-architecture
name: Help System Architecture
description: Architecture showing how help commands, status bar, webview help, and error messages integrate into the extension
type: components
spec_id:
  - help-commands
  - help-ui-integration
feature_id:
  - help-commands
  - help-ui-elements
---

# Help System Architecture

This diagram shows the complete architecture of the help and documentation system, including commands, UI integration points, and external resources.

```json
{
  "nodes": [
    {
      "id": "user",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "User",
        "description": "Extension user seeking help"
      }
    },
    {
      "id": "command-palette",
      "type": "default",
      "position": { "x": 300, "y": 50 },
      "data": {
        "label": "Command Palette",
        "description": "VSCode command palette"
      }
    },
    {
      "id": "status-bar",
      "type": "default",
      "position": { "x": 300, "y": 150 },
      "data": {
        "label": "Status Bar Item",
        "description": "Help icon in status bar"
      }
    },
    {
      "id": "webview-help",
      "type": "default",
      "position": { "x": 300, "y": 250 },
      "data": {
        "label": "Webview Help Icons",
        "description": "Context-sensitive help buttons in webviews"
      }
    },
    {
      "id": "context-menu",
      "type": "default",
      "position": { "x": 300, "y": 350 },
      "data": {
        "label": "Tree View Context Menu",
        "description": "Help items in resource context menus"
      }
    },
    {
      "id": "error-messages",
      "type": "default",
      "position": { "x": 300, "y": 450 },
      "data": {
        "label": "Error Messages",
        "description": "Error dialogs with help links"
      }
    },
    {
      "id": "help-controller",
      "type": "default",
      "position": { "x": 600, "y": 250 },
      "data": {
        "label": "Help Controller",
        "description": "Central help command handler"
      }
    },
    {
      "id": "docs-website",
      "type": "default",
      "position": { "x": 900, "y": 150 },
      "data": {
        "label": "Documentation Website",
        "description": "alto9.github.io/kube9"
      }
    },
    {
      "id": "github-issues",
      "type": "default",
      "position": { "x": 900, "y": 250 },
      "data": {
        "label": "GitHub Issues",
        "description": "github.com/alto9/kube9-vscode/issues"
      }
    },
    {
      "id": "keyboard-shortcuts",
      "type": "default",
      "position": { "x": 900, "y": 350 },
      "data": {
        "label": "Keyboard Shortcuts",
        "description": "VSCode keyboard shortcuts reference"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user",
      "target": "command-palette",
      "label": "Opens command palette",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "user",
      "target": "status-bar",
      "label": "Clicks help icon",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "user",
      "target": "webview-help",
      "label": "Clicks help button",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "user",
      "target": "context-menu",
      "label": "Right-clicks resource",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "user",
      "target": "error-messages",
      "label": "Encounters error",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "command-palette",
      "target": "help-controller",
      "label": "Kube9: Open Documentation",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "command-palette",
      "target": "help-controller",
      "label": "Kube9: Report Issue",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "command-palette",
      "target": "help-controller",
      "label": "Kube9: View Keyboard Shortcuts",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "status-bar",
      "target": "help-controller",
      "label": "Opens help menu",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "webview-help",
      "target": "help-controller",
      "label": "Context-specific help request",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "context-menu",
      "target": "help-controller",
      "label": "Help for resource type",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "error-messages",
      "target": "help-controller",
      "label": "Learn more link clicked",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "help-controller",
      "target": "docs-website",
      "label": "Opens documentation",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "help-controller",
      "target": "github-issues",
      "label": "Opens issue template",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "help-controller",
      "target": "keyboard-shortcuts",
      "label": "Opens shortcuts reference",
      "type": "smoothstep"
    }
  ]
}
```

## Architecture Overview

### Help Entry Points

The extension provides multiple entry points for users to access help:
- **Command Palette**: Three dedicated help commands
- **Status Bar**: Persistent help icon with quick menu
- **Webviews**: Context-sensitive help buttons
- **Context Menus**: Help items for resource types
- **Error Messages**: "Learn more" links in error dialogs

### Central Help Controller

The Help Controller handles all help requests and routes them to appropriate resources:
- Opens external URLs in default browser
- Provides context-specific documentation links
- Pre-fills GitHub issue templates
- Generates keyboard shortcuts reference

### External Resources

All help content points to maintained external resources:
- **Documentation Website**: Comprehensive guides and API reference
- **GitHub Issues**: Bug reports and feature requests with templates
- **Keyboard Shortcuts**: VSCode-native shortcuts reference

## Integration Points

- **Extension Activation**: Registers help commands and status bar item
- **Webview Message Protocol**: Webviews send help requests with context
- **Tree View Provider**: Context menu contributions for help items
- **Error Handler**: Enriches errors with contextual help links

## Design Principles

- **Discoverable**: Help accessible from everywhere in the UI
- **Contextual**: Help content specific to what user is doing
- **External**: Documentation maintained independently of extension code
- **Consistent**: All help follows same patterns and conventions

