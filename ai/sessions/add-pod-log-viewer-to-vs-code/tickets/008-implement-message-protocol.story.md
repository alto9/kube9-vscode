---
story_id: 008-implement-message-protocol
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Implement Message Protocol Between Extension and Webview

## Objective

Implement bidirectional message passing between extension host and webview using typed message interfaces.

## Context

The extension and webview communicate via `postMessage` API. Messages must be typed for safety and clarity.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Message Protocol section

## Files to Create/Modify

- `src/webview/PodLogsViewerPanel.ts` (modify - add message handling)
- `src/webview/pod-logs/App.tsx` (modify - add message handling)
- `src/types/messages.ts` (new - message type definitions)

## Implementation Steps

1. Create `src/types/messages.ts`:
   ```typescript
   export type ExtensionToWebviewMessage =
     | { type: 'initialState'; data: InitialState }
     | { type: 'logData'; data: string[] }
     | { type: 'streamStatus'; status: 'connected' | 'disconnected' | 'error' };
   
   export type WebviewToExtensionMessage =
     | { type: 'ready' }
     | { type: 'refresh' }
     | { type: 'toggleFollow'; enabled: boolean };
   ```
2. In `PodLogsViewerPanel`, add message handler:
   ```typescript
   panel.webview.onDidReceiveMessage(
     async (message: WebviewToExtensionMessage) => {
       await this.handleMessage(contextName, message);
     }
   );
   ```
3. Implement `handleMessage()` method with switch statement
4. In React `App.tsx`, add message listener:
   ```typescript
   useEffect(() => {
     const handler = (event: MessageEvent) => {
       const message = event.data as ExtensionToWebviewMessage;
       // Handle message
     };
     window.addEventListener('message', handler);
     return () => window.removeEventListener('message', handler);
   }, []);
   ```
5. Send 'ready' message from webview on mount
6. Send 'initialState' from extension in response

## Acceptance Criteria

- [x] Message types are defined and typed
- [x] Extension receives messages from webview
- [x] Webview receives messages from extension
- [x] 'ready' message sent from webview on mount
- [x] 'initialState' message sent from extension
- [x] Message protocol is bidirectional and working

## Estimated Time

30 minutes

