---
story_id: 007-configure-webpack-for-health-report
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - operator-health-report
spec_id:
  - operator-health-report-spec
status: pending
---

# Configure Webpack Build for Operator Health Report Webview

## Objective

Add webpack configuration to build the operator-health-report React component and update HealthReportPanel to load the compiled bundle.

## Dependencies

- Story 006 must be complete (React component created)

## Files to Modify

- `webpack.config.js` (or relevant webpack config file)
- `src/webview/HealthReportPanel.ts`

## Changes

### webpack.config.js

1. Add new entry point for operator-health-report:
   ```javascript
   entry: {
       // ... existing entries ...
       'operator-health-report': './src/webview/operator-health-report/index.tsx',
   },
   ```

2. Ensure output configuration builds to `out/webview/`:
   ```javascript
   output: {
       path: path.resolve(__dirname, 'out', 'webview'),
       filename: '[name].js'
   }
   ```

3. Ensure TypeScript and React loaders are configured:
   - ts-loader for .tsx files
   - CSS loader for styles.css

4. Add resolve extensions if not present:
   ```javascript
   resolve: {
       extensions: ['.tsx', '.ts', '.js', '.css']
   }
   ```

### HealthReportPanel.ts

1. Update `_getHtmlForWebview()` method to load the compiled script:
   ```typescript
   private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
       const scriptUri = webview.asWebviewUri(
           vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'operator-health-report.js')
       );
       
       const nonce = this._getNonce();
       
       return `<!DOCTYPE html>
       <html lang="en">
       <head>
           <meta charset="UTF-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
           <title>Kube9 Operator Health</title>
       </head>
       <body>
           <div id="root"></div>
           <script nonce="${nonce}" src="${scriptUri}"></script>
       </body>
       </html>`;
   }
   ```

2. Add `_getNonce()` private method if not present:
   ```typescript
   private _getNonce(): string {
       let text = '';
       const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
       for (let i = 0; i < 32; i++) {
           text += possible.charAt(Math.floor(Math.random() * possible.length));
       }
       return text;
   }
   ```

3. Update constructor to pass `extensionUri`:
   - Add `extensionUri: vscode.Uri` parameter
   - Store as private field
   - Pass to `_getHtmlForWebview()`

4. Update `createOrShow()` to pass `context.extensionUri`

## Build Verification

After changes:
1. Run `npm run compile` or webpack build command
2. Verify `out/webview/operator-health-report.js` is created
3. Verify file size is reasonable (should include React code)

## Acceptance Criteria

- [ ] Webpack config includes operator-health-report entry
- [ ] Build completes without errors
- [ ] `out/webview/operator-health-report.js` is generated
- [ ] HealthReportPanel loads the compiled bundle
- [ ] CSP allows script execution with nonce
- [ ] Webview displays React component when opened
- [ ] No console errors in webview
- [ ] TypeScript and webpack compile without errors

## Estimated Time

20 minutes

## Notes

Verify that existing webpack configuration has the necessary loaders (ts-loader, css-loader). If not, they may need to be added to devDependencies and configured.

