---
story_id: 001-create-help-controller-class
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-commands
spec_id:
  - help-commands
status: pending
estimated_minutes: 25
---

# Create HelpController Class

## Objective

Create the foundational `HelpController` class that centralizes all help-related functionality including URL management, issue template generation, and contextual help routing.

## Context

This is the foundation for the entire help system. The HelpController will be used by all help entry points (commands, status bar, webviews, context menus, error messages).

See:
- Feature: `ai/features/help/help-commands.feature.md`
- Spec: `ai/specs/help/help-commands.spec.md`
- Diagram: `ai/diagrams/help/help-system-architecture.diagram.md`

## Implementation

Create `src/help/HelpController.ts`:

```typescript
import * as vscode from 'vscode';

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
    await this.openUrl(HelpController.DOCS_URL);
  }
  
  private async reportIssue(): Promise<void> {
    const template = this.buildIssueTemplate();
    const url = `${HelpController.ISSUES_URL}?body=${encodeURIComponent(template)}`;
    await this.openUrl(url);
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
    await this.openUrl(url);
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
}
```

## Files to Modify

- **CREATE**: `src/help/HelpController.ts`

## Acceptance Criteria

- [ ] HelpController class created with all methods
- [ ] URL constants defined (DOCS_URL, ISSUES_URL)
- [ ] registerCommands() registers three help commands
- [ ] buildIssueTemplate() includes system information
- [ ] getContextualHelpUrl() maps contexts to documentation URLs
- [ ] openUrl() handles errors gracefully
- [ ] All methods properly typed with TypeScript

## Testing Notes

Unit tests in next story will verify:
- URL construction
- Issue template generation
- Context mapping
- Error handling

