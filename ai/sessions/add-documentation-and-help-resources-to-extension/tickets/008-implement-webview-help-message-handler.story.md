---
story_id: 008-implement-webview-help-message-handler
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: completed
estimated_minutes: 15
---

# Implement Webview Help Message Handler

## Objective

Add message handler to all webview providers to respond to 'openHelp' messages and open context-specific documentation.

## Context

When webviews post 'openHelp' messages, the extension must intercept them and call HelpController.openContextualHelp() with the appropriate context.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios: Events Viewer help button opens specific documentation, Pod Logs help button opens specific documentation, etc.)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Webview Help Integration section)

## Implementation

Create a reusable message handler in `src/webview/WebviewHelpHandler.ts`:

```typescript
import * as vscode from 'vscode';
import { HelpController } from '../help/HelpController';

export class WebviewHelpHandler {
  constructor(private helpController: HelpController) {}
  
  public setupHelpMessageHandler(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'openHelp') {
        await this.helpController.openContextualHelp(message.context);
      }
    });
  }
}
```

For each existing webview provider, add help message handling:

```typescript
// Example for EventsViewerProvider
const helpHandler = new WebviewHelpHandler(helpController);
helpHandler.setupHelpMessageHandler(panel.webview);
```

## Files to Modify

- **CREATE**: `src/webview/WebviewHelpHandler.ts`
- **UPDATE**: All webview providers (EventsViewerProvider, PodLogsProvider, ClusterManagerProvider, YAMLEditorProvider, DescribeWebviewProvider) - Add help message handling

## Acceptance Criteria

- [ ] WebviewHelpHandler class created
- [ ] setupHelpMessageHandler() registers message listener
- [ ] Listens for messages with type === 'openHelp'
- [ ] Calls helpController.openContextualHelp() with message.context
- [ ] All webview providers use WebviewHelpHandler
- [ ] Help messages properly routed to HelpController

## Testing Notes

Manual verification for each webview:
- Open webview
- Click help button
- Verify browser opens with correct documentation URL
- Test for: Events Viewer, Pod Logs, Cluster Manager, YAML Editor, Describe Webview

