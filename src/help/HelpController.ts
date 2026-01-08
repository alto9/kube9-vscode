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
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Error opening URL: ${errorMessage}`);
    }
  }
}

/**
 * Interface for help menu quick pick items
 */
interface HelpMenuOption extends vscode.QuickPickItem {
  action: string;
}

/**
 * Registers the help menu quick pick command.
 * 
 * @param context - The extension context
 * @param _helpController - The help controller instance (unused but kept for API consistency)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerHelpMenuCommand(context: vscode.ExtensionContext, _helpController: HelpController): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.showHelpMenu', async () => {
      const selected = await vscode.window.showQuickPick<HelpMenuOption>([
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
    })
  );
}

/**
 * Registers context menu help commands for resource types.
 * 
 * @param context - The extension context
 */
export function registerContextMenuHelpCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.helpForPods', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/pods/')
      );
    }),
    
    vscode.commands.registerCommand('kube9.helpForDeployments', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/deployments/')
      );
    }),
    
    vscode.commands.registerCommand('kube9.helpForServices', async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://alto9.github.io/kube9/resources/services/')
      );
    })
  );
}

