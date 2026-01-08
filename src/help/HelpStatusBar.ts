import * as vscode from 'vscode';
import { HelpController } from './HelpController';

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

