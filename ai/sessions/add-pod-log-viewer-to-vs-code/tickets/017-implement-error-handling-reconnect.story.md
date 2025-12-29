---
story_id: 017-implement-error-handling-reconnect
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Implement Error Handling and Auto-Reconnect

## Objective

Add comprehensive error handling for connection failures, pod deletion, and implement auto-reconnect logic.

## Context

Network issues, pod deletions, and API errors can interrupt log streaming. The viewer should handle these gracefully and attempt reconnection when appropriate.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - Error Handling section
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Auto-reconnect scenario

## Files to Create/Modify

- `src/providers/LogsProvider.ts` (modify - add auto-reconnect logic)
- `src/webview/PodLogsViewerPanel.ts` (modify - handle errors)
- `src/webview/pod-logs/App.tsx` (modify - display error messages)

## Implementation Steps

1. In LogsProvider, add reconnection logic:
   ```typescript
   private reconnectAttempts = 0;
   private maxReconnectAttempts = 5;
   
   private async attemptReconnect(): Promise<void> {
     if (this.reconnectAttempts >= this.maxReconnectAttempts) {
       this.onError(new Error('Max reconnection attempts reached'));
       return;
     }
     
     this.reconnectAttempts++;
     const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
     await new Promise(resolve => setTimeout(resolve, delay));
     
     try {
       await this.streamLogs(...this.lastStreamParams);
       this.reconnectAttempts = 0; // Reset on success
     } catch (error) {
       await this.attemptReconnect();
     }
   }
   ```
2. Detect specific error types:
   - 404: Pod not found → show "Pod no longer exists"
   - 403: Permission denied → show "Access denied. Check permissions"
   - ECONNREFUSED: Connection failed → auto-reconnect
3. In extension, send appropriate error messages to webview
4. Show reconnection status in footer: "Reconnecting..." in yellow
5. Notify user when reconnected successfully
6. For pod deletion: keep logs visible but disable streaming

## Acceptance Criteria

- [ ] Connection errors trigger auto-reconnect with exponential backoff
- [ ] Maximum 5 reconnection attempts
- [ ] Pod not found shows clear error message
- [ ] Permission errors show RBAC guidance
- [ ] Reconnecting status shown in footer
- [ ] Success notification after reconnection
- [ ] Existing logs preserved during errors
- [ ] Pod deletion handled gracefully (logs visible, streaming disabled)

## Estimated Time

30 minutes

