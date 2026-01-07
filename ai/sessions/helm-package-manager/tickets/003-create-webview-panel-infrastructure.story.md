---
story_id: 003-create-webview-panel-infrastructure
session_id: helm-package-manager
feature_id:
  - helm-package-manager-access
spec_id:
  - helm-webview-architecture
status: pending
---

# Story: Create Webview Panel Infrastructure

## Objective

Create the webview panel infrastructure that hosts the Helm Package Manager React application, including panel creation, lifecycle management, and message passing setup.

## Context

The webview panel hosts a React application and communicates with the extension via message passing. It persists state when hidden and maintains a single instance per window. See [helm-webview-architecture](../../specs/helm/helm-webview-architecture.spec.md) for architecture.

## Acceptance Criteria

- [ ] Create `src/webview/HelmPackageManagerPanel.ts` class
- [ ] Implement `openPackageManager()` command handler
- [ ] Create singleton pattern (show existing panel if already open)
- [ ] Configure webview with `retainContextWhenHidden: true`
- [ ] Configure webview with `enableScripts: true`
- [ ] Set up message passing infrastructure (postMessage handlers)
- [ ] Implement panel disposal and cleanup
- [ ] Load HTML content with CSP headers
- [ ] Set local resource roots for media and dist folders

## Implementation Notes

```typescript
export class HelmPackageManagerPanel {
  private static currentPanel: HelmPackageManagerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    if (HelmPackageManagerPanel.currentPanel) {
      HelmPackageManagerPanel.currentPanel.panel.reveal();
      return;
    }
    
    const panel = vscode.window.createWebviewPanel(
      'helmPackageManager',
      'Helm Package Manager',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );
    
    HelmPackageManagerPanel.currentPanel = new HelmPackageManagerPanel(panel, extensionUri);
  }
  
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.panel.webview.html = this.getWebviewContent(extensionUri);
    this.setWebviewMessageListeners();
    
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }
  
  private setWebviewMessageListeners() {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        // Handle messages from webview
      },
      null,
      this.disposables
    );
  }
}
```

## Files Involved

- `src/webview/HelmPackageManagerPanel.ts` (create new)
- `src/commands/helmCommands.ts` (create new, register `openPackageManager`)
- `src/extension.ts` (register command)

## Dependencies

- Depends on story 002 (tree item with command registration)
- HTML skeleton with CSP can be minimal for now (React app comes later)

## Estimated Time

30 minutes

