---
story_id: 005-integrate-operator-status-client
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - operator-health-report
spec_id:
  - operator-health-report-spec
  - operator-status-api-spec
status: completed
---

# Integrate OperatorStatusClient in HealthReportPanel

## Objective

Update HealthReportPanel to query operator status using OperatorStatusClient and pass data to the webview via postMessage.

## Dependencies

- Story 004 must be complete (HealthReportPanel skeleton exists)

## Files to Modify

- `src/webview/HealthReportPanel.ts`
- `src/extension.ts`

## Changes

### HealthReportPanel.ts

1. Add imports:
   ```typescript
   import { OperatorStatusClient } from '../services/OperatorStatusClient';
   import { ClusterManager } from '../cluster/ClusterManager';
   ```

2. Update class structure:
   - Change from static panel to instance-based
   - Add private fields:
     - `_statusClient: OperatorStatusClient`
     - `_kubeconfigPath: string`
     - `_contextName: string`
     - `_disposables: vscode.Disposable[]`

3. Update `show()` method signature:
   ```typescript
   public static async createOrShow(
       context: vscode.ExtensionContext,
       statusClient: OperatorStatusClient,
       kubeconfigPath: string,
       contextName: string
   ): Promise<void>
   ```

4. Add singleton pattern:
   - Check if `currentPanel` exists, reveal and update if so
   - Create new panel instance if not

5. Add private constructor with parameters

6. Implement `_update()` method:
   - Query `_statusClient.getStatus()`
   - Build `HealthReportData` object
   - Use `webview.postMessage()` to send data with command 'update'
   - Handle errors and send error messages

7. Update webview options:
   - Set `enableScripts: true` (needed for React)
   - Keep `retainContextWhenHidden: true`

8. Add message handler in constructor:
   - Listen for 'refresh' command from webview
   - Call `_update(true)` to force refresh

9. Keep HTML minimal for now (React component in next story):
   - Add `<div id="root"></div>`
   - Add script tag placeholder

### extension.ts

1. Update command registration:
   ```typescript
   const openOperatorHealthReportCommand = vscode.commands.registerCommand(
       'kube9.openOperatorHealthReport',
       async () => {
           try {
               const clusterManager = ClusterManager.getInstance();
               const currentCluster = clusterManager.getCurrentCluster();
               
               if (!currentCluster) {
                   vscode.window.showWarningMessage('No cluster selected');
                   return;
               }

               await HealthReportPanel.createOrShow(
                   context,
                   operatorStatusClient,
                   currentCluster.kubeconfigPath,
                   currentCluster.contextName
               );
           } catch (error) {
               vscode.window.showErrorMessage(`Failed to open Health Report: ${error}`);
           }
       }
   );
   ```

2. Note: `operatorStatusClient` should already exist in extension.ts as a singleton instance

## Data Structure

Define `HealthReportData` interface at the top of HealthReportPanel.ts:

```typescript
interface HealthReportData {
    clusterContext: string;
    operatorStatus: {
        mode: 'basic' | 'operated' | 'enabled' | 'degraded';
        tier?: 'free' | 'pro';
        version?: string;
        health?: 'healthy' | 'degraded' | 'unhealthy';
        registered?: boolean;
        lastUpdate?: string;
        error?: string | null;
        clusterId?: string;
    };
    timestamp: number;
    cacheAge: number;
}
```

## Acceptance Criteria

- [x] HealthReportPanel uses instance-based pattern
- [x] Panel queries OperatorStatusClient on creation
- [x] Data sent to webview via postMessage with 'update' command
- [x] Refresh message from webview triggers status re-query
- [x] Error handling for failed status queries
- [x] Command in extension.ts passes cluster context and statusClient
- [x] TypeScript compiles without errors
- [x] Webview receives operator status data (can verify in console)

## Estimated Time

25 minutes

## Notes

This story focuses on the extension-side integration. The webview still shows placeholder HTML. The React component will consume this data in story 006.

