---
story_id: 008-implement-copy-cluster-id-handler
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - operator-health-report
spec_id:
  - operator-health-report-spec
status: completed
---

# Implement Copy Cluster ID to Clipboard Handler

## Objective

Add message handler in HealthReportPanel to copy cluster ID to clipboard when requested from webview.

## Dependencies

- Story 005 must be complete (message handling infrastructure exists)
- Story 006 must be complete (React component sends copyClusterId message)

## Files to Modify

- `src/webview/HealthReportPanel.ts`

## Changes

### HealthReportPanel.ts

1. Update message handler in constructor (should already exist from story 005):
   ```typescript
   this._panel.webview.onDidReceiveMessage(
       async (message) => {
           switch (message.command) {
               case 'refresh':
                   await this._update(true); // Force refresh
                   break;
               case 'copyClusterId':
                   if (message.clusterId) {
                       await vscode.env.clipboard.writeText(message.clusterId);
                       vscode.window.showInformationMessage('Cluster ID copied to clipboard');
                   }
                   break;
           }
       },
       null,
       this._disposables
   );
   ```

2. Ensure the handler is added to `_disposables` array for proper cleanup

## Testing

Manual test steps:
1. Open Health report on a cluster with operator in enabled/pro mode
2. Verify cluster ID is displayed
3. Click "Copy" button next to cluster ID
4. Verify info message appears: "Cluster ID copied to clipboard"
5. Paste in another application to verify clipboard content

## Acceptance Criteria

- [x] Message handler responds to 'copyClusterId' command
- [x] Cluster ID written to system clipboard
- [x] Information message displayed after copy
- [x] Handler checks that clusterId exists before copying
- [x] No errors when clusterId is undefined
- [x] TypeScript compiles without errors

## Estimated Time

10 minutes

## Notes

This is a simple enhancement to the existing message handling infrastructure. Uses VS Code's built-in clipboard API.

