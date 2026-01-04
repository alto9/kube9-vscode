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

