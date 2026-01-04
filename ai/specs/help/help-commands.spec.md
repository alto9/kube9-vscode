---
spec_id: help-commands
name: Help Commands
description: Technical specification for help-related VSCode commands
feature_id:
  - help-commands
diagram_id:
  - help-system-architecture
  - help-access-flow
---

# Help Commands

## Overview

The extension registers three help commands that provide users with access to documentation, issue reporting, and keyboard shortcuts. Commands integrate with VSCode's command palette and can be invoked programmatically from other parts of the extension.

## Architecture

See [help-system-architecture](../../diagrams/help/help-system-architecture.diagram.md) for the complete help system architecture and [help-access-flow](../../diagrams/help/help-access-flow.diagram.md) for user flow.

## Command Definitions

### kube9.openDocumentation

Opens the Kube9 documentation website in the user's default browser.

**Registration**:
```typescript
vscode.commands.registerCommand('kube9.openDocumentation', () => {
  vscode.env.openExternal(vscode.Uri.parse('https://alto9.github.io/kube9/'));
});
```

**Package.json Contribution**:
```json
{
  "command": "kube9.openDocumentation",
  "title": "Kube9: Open Documentation",
  "category": "Kube9"
}
```

**Behavior**:
- Opens documentation homepage in default browser
- Uses VSCode's `env.openExternal` API
- No authentication or prerequisites required
- Works offline (browser handles connection errors)

### kube9.reportIssue

Opens GitHub issues page with pre-filled template.

**Registration**:
```typescript
vscode.commands.registerCommand('kube9.reportIssue', () => {
  const template = encodeURIComponent(`
**Describe the issue**
A clear description of what happened.

**Steps to reproduce**
1. 
2. 
3. 

**Expected behavior**
What you expected to happen.

**Environment**
- OS: ${process.platform}
- VSCode Version: ${vscode.version}
- Kube9 Version: ${extensionVersion}
  `);
  
  const url = `https://github.com/alto9/kube9-vscode/issues/new?body=${template}`;
  vscode.env.openExternal(vscode.Uri.parse(url));
});
```

**Package.json Contribution**:
```json
{
  "command": "kube9.reportIssue",
  "title": "Kube9: Report Issue",
  "category": "Kube9"
}
```

**Behavior**:
- Opens GitHub with pre-filled issue template
- Includes system information (OS, VSCode version, extension version)
- User can edit template before submitting
- Requires GitHub account to submit (handled by GitHub)

### kube9.viewKeyboardShortcuts

Opens VSCode keyboard shortcuts reference filtered to Kube9 commands.

**Registration**:
```typescript
vscode.commands.registerCommand('kube9.viewKeyboardShortcuts', () => {
  vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'kube9');
});
```

**Package.json Contribution**:
```json
{
  "command": "kube9.viewKeyboardShortcuts",
  "title": "Kube9: View Keyboard Shortcuts",
  "category": "Kube9"
}
```

**Behavior**:
- Opens VSCode keyboard shortcuts editor
- Pre-filters to show only Kube9 commands
- Uses VSCode native shortcuts UI
- Allows users to customize keybindings

## Implementation Details

### Command Controller

Create centralized `HelpController` class:

```typescript
export class HelpController {
  private static readonly DOCS_URL = 'https://alto9.github.io/kube9/';
  private static readonly ISSUES_URL = 'https://github.com/alto9/kube9-vscode/issues/new';
  
  constructor(private context: vscode.ExtensionContext) {}
  
  public registerCommands(): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('kube9.openDocumentation', this.openDocumentation.bind(this)),
      vscode.commands.registerCommand('kube9.reportIssue', this.reportIssue.bind(this)),
      vscode.commands.registerCommand('kube9.viewKeyboardShortcuts', this.viewKeyboardShortcuts.bind(this))
    );
  }
  
  private async openDocumentation(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(HelpController.DOCS_URL));
  }
  
  private async reportIssue(): Promise<void> {
    const template = this.buildIssueTemplate();
    const url = `${HelpController.ISSUES_URL}?body=${encodeURIComponent(template)}`;
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
  
  private async viewKeyboardShortcuts(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'kube9');
  }
  
  private buildIssueTemplate(): string {
    const version = this.context.extension.packageJSON.version;
    return `
**Describe the issue**
A clear description of what happened.

**Steps to reproduce**
1. 
2. 
3. 

**Expected behavior**
What you expected to happen.

**Environment**
- OS: ${process.platform}
- VSCode Version: ${vscode.version}
- Kube9 Version: ${version}
- Node Version: ${process.version}
    `.trim();
  }
  
  public async openContextualHelp(context: string): Promise<void> {
    const url = this.getContextualHelpUrl(context);
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
  
  private getContextualHelpUrl(context: string): string {
    const contextMap: Record<string, string> = {
      'events-viewer': `${HelpController.DOCS_URL}features/events-viewer/`,
      'pod-logs': `${HelpController.DOCS_URL}features/pod-logs/`,
      'cluster-manager': `${HelpController.DOCS_URL}features/cluster-manager/`,
      'yaml-editor': `${HelpController.DOCS_URL}features/yaml-editor/`,
      'describe-webview': `${HelpController.DOCS_URL}features/describe-view/`,
      'default': HelpController.DOCS_URL
    };
    
    return contextMap[context] || contextMap['default'];
  }
}
```

### Extension Activation

Register help controller in `activate()`:

```typescript
export function activate(context: vscode.ExtensionContext) {
  const helpController = new HelpController(context);
  helpController.registerCommands();
  
  // Make help controller available to other components
  context.subscriptions.push({
    dispose: () => {}
  });
}
```

## URL Construction

### Documentation URLs

Base URL: `https://alto9.github.io/kube9/`

Context-specific URLs:
- Events Viewer: `/features/events-viewer/`
- Pod Logs: `/features/pod-logs/`
- Cluster Manager: `/features/cluster-manager/`
- YAML Editor: `/features/yaml-editor/`
- Describe View: `/features/describe-view/`
- Error Codes: `/troubleshooting/errors/{errorCode}/`

### GitHub Issue URL

Base URL: `https://github.com/alto9/kube9-vscode/issues/new`

Query Parameters:
- `body`: URL-encoded issue template
- `title`: (optional) Pre-filled title
- `labels`: (optional) Comma-separated labels

## Error Handling

All commands use VSCode's `env.openExternal` which:
- Returns a Promise<boolean> indicating success
- Handles platform-specific browser opening
- Shows error if no default browser configured
- Logs failures to VSCode output channel

```typescript
private async openUrl(url: string): Promise<void> {
  try {
    const opened = await vscode.env.openExternal(vscode.Uri.parse(url));
    if (!opened) {
      vscode.window.showErrorMessage('Failed to open URL in browser. Please check your default browser settings.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error opening URL: ${error.message}`);
  }
}
```

## Testing

### Unit Tests

```typescript
describe('HelpController', () => {
  it('should open documentation URL', async () => {
    const spy = jest.spyOn(vscode.env, 'openExternal');
    await helpController.openDocumentation();
    expect(spy).toHaveBeenCalledWith(vscode.Uri.parse('https://alto9.github.io/kube9/'));
  });
  
  it('should build issue template with system info', () => {
    const template = helpController['buildIssueTemplate']();
    expect(template).toContain(process.platform);
    expect(template).toContain(vscode.version);
  });
  
  it('should open contextual help for events viewer', async () => {
    const spy = jest.spyOn(vscode.env, 'openExternal');
    await helpController.openContextualHelp('events-viewer');
    expect(spy).toHaveBeenCalledWith(
      vscode.Uri.parse('https://alto9.github.io/kube9/features/events-viewer/')
    );
  });
});
```

## Best Practices

- **URL Validation**: Validate and sanitize any dynamic URL components
- **Error Recovery**: Provide clear messages when browser cannot be opened
- **Telemetry**: Log help command usage for analytics (with user consent)
- **Accessibility**: Ensure commands are keyboard-accessible via command palette
- **Documentation Sync**: Keep URL mappings in sync with documentation structure

