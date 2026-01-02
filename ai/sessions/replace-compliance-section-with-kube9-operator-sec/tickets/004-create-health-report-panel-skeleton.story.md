---
story_id: 004-create-health-report-panel-skeleton
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - operator-health-report
spec_id:
  - operator-health-report-spec
status: pending
---

# Create HealthReportPanel Skeleton and Register Command

## Objective

Create a minimal HealthReportPanel class that displays a simple placeholder webview, and register the command to open it. This replaces DataCollectionReportPanel.

## Dependencies

- Story 002 must be complete (Health report item exists in tree)

## Files to Create/Modify

- Rename: `src/webview/DataCollectionReportPanel.ts` → `HealthReportPanel.ts`
- Update: `src/extension.ts`

## Changes

### Rename and Update HealthReportPanel.ts

1. Rename class from `DataCollectionReportPanel` to `HealthReportPanel`

2. Update the webview panel ID and title:
   - Panel ID: `'kube9.operatorHealthReport'`
   - Title: `'Kube9 Operator Health'`

3. Update HTML content to show minimal placeholder:
   - Title: "Kube9 Operator Health"
   - Message: "Loading operator status..."
   - Icon: 🩺 or ⚕️
   - Add "Refresh" button placeholder (non-functional for now)

4. Keep the same structure:
   - Static `show()` method
   - Single panel instance management
   - Basic HTML with VS Code theme variables

5. Update JSDoc comments to reference "Health Report"

### extension.ts

1. Update import:
   ```typescript
   import { HealthReportPanel } from './webview/HealthReportPanel';
   ```

2. Update command registration (around line 401):
   ```typescript
   const openOperatorHealthReportCommand = vscode.commands.registerCommand(
       'kube9.openOperatorHealthReport',
       async () => {
           try {
               HealthReportPanel.show(context);
           } catch (error) {
               vscode.window.showErrorMessage(`Failed to open Health Report: ${error}`);
           }
       }
   );
   ```

3. Update subscriptions (replace old command):
   ```typescript
   context.subscriptions.push(openOperatorHealthReportCommand);
   disposables.push(openOperatorHealthReportCommand);
   ```

4. Remove old DataCollectionReportPanel import and command

## Acceptance Criteria

- [ ] File renamed to `HealthReportPanel.ts`
- [ ] Class renamed to `HealthReportPanel`
- [ ] Webview displays "Kube9 Operator Health" title
- [ ] Placeholder content shows loading message
- [ ] Command 'kube9.openOperatorHealthReport' registered in extension.ts
- [ ] Clicking Health item in tree opens the webview
- [ ] Old DataCollectionReportPanel references removed
- [ ] TypeScript compiles without errors

## Estimated Time

15 minutes

## Notes

This creates a minimal skeleton. The actual OperatorStatusClient integration and React component will be added in subsequent stories.

