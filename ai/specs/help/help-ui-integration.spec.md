---
spec_id: help-ui-integration
name: Help UI Integration
description: Technical specification for integrating help resources into UI components (status bar, webviews, context menus, error messages)
feature_id:
  - help-ui-elements
diagram_id:
  - help-system-architecture
  - help-access-flow
---

# Help UI Integration

## Overview

Help resources are integrated throughout the extension's UI to provide users with easy access to documentation and support. This includes status bar items, webview help buttons, context menu help items, and enriched error messages with help links.

## Architecture

See [help-system-architecture](../../diagrams/help/help-system-architecture.diagram.md) for the complete help system architecture and [help-access-flow](../../diagrams/help/help-access-flow.diagram.md) for user interaction flow.

## Status Bar Integration

### Status Bar Help Icon

A persistent help icon in the status bar provides quick access to help resources.

**Implementation**:
```typescript
export class HelpStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor(private helpController: HelpController) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      -1000 // Far right position
    );
    
    this.statusBarItem.text = '$(question) Kube9 Help';
    this.statusBarItem.tooltip = 'Kube9 Help and Documentation';
    this.statusBarItem.command = 'kube9.showHelpMenu';
    
    this.statusBarItem.show();
  }
  
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
```

### Quick Help Menu

Status bar icon triggers a quick pick menu:

```typescript
vscode.commands.registerCommand('kube9.showHelpMenu', async () => {
  const selected = await vscode.window.showQuickPick([
    {
      label: '$(book) Documentation',
      description: 'Open Kube9 documentation website',
      action: 'docs'
    },
    {
      label: '$(bug) Report Issue',
      description: 'Report a bug or request a feature',
      action: 'issue'
    },
    {
      label: '$(keyboard) Keyboard Shortcuts',
      description: 'View and customize Kube9 keyboard shortcuts',
      action: 'shortcuts'
    },
    {
      label: '$(question) Getting Started',
      description: 'View the interactive tutorial',
      action: 'tutorial'
    }
  ], {
    placeHolder: 'Select a help option'
  });
  
  if (selected) {
    switch (selected.action) {
      case 'docs':
        await vscode.commands.executeCommand('kube9.openDocumentation');
        break;
      case 'issue':
        await vscode.commands.executeCommand('kube9.reportIssue');
        break;
      case 'shortcuts':
        await vscode.commands.executeCommand('kube9.viewKeyboardShortcuts');
        break;
      case 'tutorial':
        await vscode.commands.executeCommand('kube9.showTutorial');
        break;
    }
  }
});
```

**Package.json Contribution**:
```json
{
  "command": "kube9.showHelpMenu",
  "title": "Kube9: Show Help Menu",
  "category": "Kube9"
}
```

## Webview Help Integration

### Help Button Component

Each webview includes a help button that opens context-specific documentation.

**Message Protocol**:
```typescript
// Webview → Extension
{
  type: 'openHelp',
  context: 'events-viewer' // or 'pod-logs', 'cluster-manager', etc.
}

// Extension handles message
webviewPanel.webview.onDidReceiveMessage(async (message) => {
  if (message.type === 'openHelp') {
    await helpController.openContextualHelp(message.context);
  }
});
```

**Webview HTML**:
```html
<button 
  class="help-button" 
  onclick="openHelp()"
  aria-label="Open help documentation"
>
  <span class="codicon codicon-question"></span>
  Help
</button>
```

**Webview JavaScript**:
```javascript
function openHelp() {
  vscode.postMessage({
    type: 'openHelp',
    context: 'events-viewer' // Specific to each webview
  });
}
```

### Context-Specific Help URLs

Each webview context maps to specific documentation:

```typescript
interface HelpContext {
  context: string;
  url: string;
  description: string;
}

const HELP_CONTEXTS: HelpContext[] = [
  {
    context: 'events-viewer',
    url: 'https://alto9.github.io/kube9/features/events-viewer/',
    description: 'Events Viewer documentation'
  },
  {
    context: 'pod-logs',
    url: 'https://alto9.github.io/kube9/features/pod-logs/',
    description: 'Pod Logs documentation'
  },
  {
    context: 'cluster-manager',
    url: 'https://alto9.github.io/kube9/features/cluster-manager/',
    description: 'Cluster Manager documentation'
  },
  {
    context: 'yaml-editor',
    url: 'https://alto9.github.io/kube9/features/yaml-editor/',
    description: 'YAML Editor documentation'
  },
  {
    context: 'describe-webview',
    url: 'https://alto9.github.io/kube9/features/describe-view/',
    description: 'Resource Describe View documentation'
  }
];
```

### Webview Help Button Styling

```css
.help-button {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  transition: background-color 0.1s ease;
}

.help-button:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.help-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.help-button .codicon {
  font-size: 16px;
}
```

## Context Menu Integration

### Tree View Context Menu Help

Add help items to resource context menus:

**Package.json Contribution**:
```json
{
  "menus": {
    "view/item/context": [
      {
        "command": "kube9.helpForPods",
        "when": "view == kube9ClusterView && viewItem =~ /pod/",
        "group": "z_help@1"
      },
      {
        "command": "kube9.helpForDeployments",
        "when": "view == kube9ClusterView && viewItem =~ /deployment/",
        "group": "z_help@1"
      },
      {
        "command": "kube9.helpForServices",
        "when": "view == kube9ClusterView && viewItem =~ /service/",
        "group": "z_help@1"
      }
    ]
  }
}
```

**Command Implementations**:
```typescript
vscode.commands.registerCommand('kube9.helpForPods', () => {
  vscode.env.openExternal(
    vscode.Uri.parse('https://alto9.github.io/kube9/resources/pods/')
  );
});

vscode.commands.registerCommand('kube9.helpForDeployments', () => {
  vscode.env.openExternal(
    vscode.Uri.parse('https://alto9.github.io/kube9/resources/deployments/')
  );
});

vscode.commands.registerCommand('kube9.helpForServices', () => {
  vscode.env.openExternal(
    vscode.Uri.parse('https://alto9.github.io/kube9/resources/services/')
  );
});
```

## Error Message Integration

### Error with Help Links

Enrich error messages with contextual help links:

```typescript
export class ErrorHandler {
  public static async showErrorWithHelp(
    message: string,
    errorCode: string,
    helpUrl?: string
  ): Promise<void> {
    const learnMore = 'Learn More';
    const reportIssue = 'Report Issue';
    
    const action = await vscode.window.showErrorMessage(
      `${message} (Error: ${errorCode})`,
      learnMore,
      reportIssue
    );
    
    if (action === learnMore) {
      const url = helpUrl || this.getErrorHelpUrl(errorCode);
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } else if (action === reportIssue) {
      await vscode.commands.executeCommand('kube9.reportIssue');
    }
  }
  
  private static getErrorHelpUrl(errorCode: string): string {
    const errorMap: Record<string, string> = {
      'KUBECONFIG_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/kubeconfig/',
      'CLUSTER_UNREACHABLE': 'https://alto9.github.io/kube9/troubleshooting/connection/',
      'RBAC_PERMISSION_DENIED': 'https://alto9.github.io/kube9/troubleshooting/permissions/',
      'RESOURCE_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/resources/',
      'OPERATOR_NOT_FOUND': 'https://alto9.github.io/kube9/troubleshooting/operator/',
      'TIMEOUT': 'https://alto9.github.io/kube9/troubleshooting/timeout/'
    };
    
    return errorMap[errorCode] || 'https://alto9.github.io/kube9/troubleshooting/';
  }
}
```

**Usage Example**:
```typescript
try {
  await clusterService.connect(context);
} catch (error) {
  await ErrorHandler.showErrorWithHelp(
    'Failed to connect to cluster',
    'CLUSTER_UNREACHABLE',
    'https://alto9.github.io/kube9/troubleshooting/connection/'
  );
}
```

### Error Message Format

Error messages follow this pattern:
```
[Clear description of what went wrong] (Error: [ERROR_CODE])

Actions:
[Learn More]  [Report Issue]
```

Example:
```
Failed to connect to cluster. Please check your kubeconfig file. (Error: KUBECONFIG_NOT_FOUND)

[Learn More]  [Report Issue]
```

## Implementation Details

### Extension Activation

Initialize all UI help components:

```typescript
export function activate(context: vscode.ExtensionContext) {
  const helpController = new HelpController(context);
  helpController.registerCommands();
  
  const helpStatusBar = new HelpStatusBar(helpController);
  context.subscriptions.push(helpStatusBar);
  
  // Register help menu command
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.showHelpMenu', async () => {
      await showHelpMenu(helpController);
    })
  );
  
  // Make ErrorHandler available globally
  context.subscriptions.push({
    dispose: () => {}
  });
}
```

### Webview Template

Base webview HTML includes help button:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <link href="{{STYLES_URI}}" rel="stylesheet">
</head>
<body>
  <div class="header">
    <h1>{{TITLE}}</h1>
    <button class="help-button" onclick="openHelp()" aria-label="Open help">
      <span class="codicon codicon-question"></span>
      Help
    </button>
  </div>
  
  <div class="content">
    {{CONTENT}}
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    const helpContext = '{{HELP_CONTEXT}}';
    
    function openHelp() {
      vscode.postMessage({ type: 'openHelp', context: helpContext });
    }
  </script>
</body>
</html>
```

## Accessibility

### Keyboard Navigation
- Status bar help icon: Focusable via Tab, activates with Enter/Space
- Webview help buttons: Focusable, proper ARIA labels
- Context menu items: Keyboard accessible via standard VSCode patterns
- Error dialogs: Keyboard navigable action buttons

### Screen Reader Support
- Status bar item has clear tooltip
- Help buttons have descriptive ARIA labels
- Error messages read completely including error codes
- Quick pick menu items have descriptions

## Testing

### UI Integration Tests

```typescript
describe('Help UI Integration', () => {
  it('should show help menu from status bar', async () => {
    await vscode.commands.executeCommand('kube9.showHelpMenu');
    // Verify quick pick is shown
  });
  
  it('should handle webview help message', async () => {
    const panel = createTestWebview('events-viewer');
    panel.webview.postMessage({ type: 'openHelp', context: 'events-viewer' });
    // Verify correct URL opened
  });
  
  it('should show error with help actions', async () => {
    await ErrorHandler.showErrorWithHelp('Test error', 'TEST_ERROR');
    // Verify error message format and actions
  });
});
```

## Best Practices

- **Consistent Positioning**: Help buttons always in top-right of webviews
- **Visual Feedback**: Hover states and focus indicators for all interactive elements
- **Context Specificity**: Always provide most relevant help for current context
- **Error Recovery**: Clear paths from errors to solutions via help links
- **Theme Integration**: Use VSCode CSS variables for all styling
- **Telemetry**: Track help access patterns to improve documentation

