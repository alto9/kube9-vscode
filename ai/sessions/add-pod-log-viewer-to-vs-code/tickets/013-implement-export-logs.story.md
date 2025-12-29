---
story_id: 013-implement-export-logs
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Implement Export Logs to File

## Objective

Implement the export button that saves logs to a file with a save dialog.

## Context

Users need to save logs to files for archival, sharing, or analysis. The export should provide a default filename and allow customization.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Export scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - Export button

## Files to Create/Modify

- `src/webview/pod-logs/App.tsx` (modify - add export handler)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle export message)

## Implementation Steps

1. In App, add export handler:
   ```typescript
   const handleExport = () => {
     vscode.postMessage({
       type: 'export',
       lines: logs,
       podName: pod.name,
       containerName: pod.container,
       includeTimestamps: preferences.showTimestamps
     });
   };
   ```
2. In extension, handle 'export' message:
   ```typescript
   case 'export':
     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
     const defaultFilename = `${message.podName}-${message.containerName}-${timestamp}.log`;
     
     const uri = await vscode.window.showSaveDialog({
       defaultUri: vscode.Uri.file(defaultFilename),
       filters: { 'Log Files': ['log', 'txt'] }
     });
     
     if (uri) {
       const content = message.lines.join('\n');
       await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
       vscode.window.showInformationMessage(`Logs exported to ${uri.fsPath}`);
     }
     break;
   ```
3. Wire export button in Toolbar to handleExport
4. Generate filename: `{pod}-{container}-{timestamp}.log`
5. Allow user to change filename in save dialog

## Acceptance Criteria

- [ ] Export button opens save dialog
- [ ] Default filename includes pod name, container, timestamp
- [ ] User can customize filename before saving
- [ ] Logs are written to selected file
- [ ] Timestamps included if toggle is on
- [ ] Notification shows success message with file path
- [ ] Works with large log volumes

## Estimated Time

20 minutes

