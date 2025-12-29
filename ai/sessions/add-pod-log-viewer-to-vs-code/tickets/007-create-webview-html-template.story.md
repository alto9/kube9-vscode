---
story_id: 007-create-webview-html-template
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-ui-spec
status: pending
---

# Create Webview HTML Template with CSP

## Objective

Create the HTML template that loads in the webview with proper Content Security Policy and React bundle script.

## Context

The webview HTML loads the compiled React bundle and establishes the secure context for the webview with CSP headers.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - HTML Template section
- `src/webview/DescribeWebview.ts` - getWebviewContent() pattern

## Files to Create/Modify

- `src/webview/PodLogsViewerPanel.ts` (modify - add getWebviewContent method)

## Implementation Steps

1. Add `getWebviewContent()` static method to PodLogsViewerPanel:
   ```typescript
   private static getWebviewContent(
     webview: vscode.Webview,
     extensionUri: vscode.Uri
   ): string {
     const scriptUri = webview.asWebviewUri(
       vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'pod-logs', 'main.js')
     );
     const stylesUri = webview.asWebviewUri(
       vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'pod-logs', 'styles.css')
     );
     const nonce = getNonce();
     const cspSource = webview.cspSource;
   }
   ```
2. Create HTML template with:
   - CSP meta tag with nonce
   - Link to styles
   - Div with id="root"
   - Script tag with nonce
3. Use VS Code CSS variables for theming
4. Call `getWebviewContent()` in `createPanel()`
5. Add `getNonce()` utility function

## Acceptance Criteria

- [ ] HTML template loads successfully in webview
- [ ] CSP configured properly (no violations)
- [ ] React script loads with correct nonce
- [ ] Root div exists for React mounting
- [ ] VS Code theme variables available
- [ ] Webview displays placeholder content from React

## Estimated Time

25 minutes

