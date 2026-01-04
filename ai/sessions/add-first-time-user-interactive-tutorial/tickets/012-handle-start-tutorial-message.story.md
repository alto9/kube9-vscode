---
story_id: 012-handle-start-tutorial-message
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
  - initial-configuration
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 15 minutes
---

# Handle Start Tutorial Message from Welcome Screen

## Objective

Implement the message handler in the extension that responds to the 'startTutorial' message from the welcome screen by opening the walkthrough.

## Context

When users click the "Start Tutorial" button added in story 011, the welcome screen sends a message to the extension. This story implements the handler that receives that message and opens the tutorial.

## Implementation

### File: Welcome screen panel creation file

Find where the welcome screen webview panel is created and add the message handler:

```typescript
// In the file that creates the welcome screen webview panel
// This is likely in src/webview/ or where welcome screen is initialized

panel.webview.onDidReceiveMessage(
  async (message) => {
    switch (message.command) {
      case 'startTutorial':
        // Open the tutorial walkthrough
        await vscode.commands.executeCommand('kube9.showTutorial');
        // Optionally close the welcome screen
        // panel.dispose();
        break;
      
      // ... other existing message handlers ...
    }
  },
  undefined,
  context.subscriptions
);
```

### Alternative: If message handler already exists

If there's an existing message handler, add the new case:

```typescript
// Add to existing switch statement or if/else chain
case 'startTutorial':
  await vscode.commands.executeCommand('kube9.showTutorial');
  break;
```

## Acceptance Criteria

- [ ] Message handler registered for webview messages
- [ ] Handler responds to 'startTutorial' command
- [ ] Handler calls `kube9.showTutorial` command
- [ ] Handler is added to context.subscriptions for cleanup
- [ ] Tutorial opens when button clicked in welcome screen
- [ ] No errors if tutorial command fails
- [ ] Handler integrates with existing message handlers (if any)

## Testing

1. Open welcome screen
2. Click "Start Tutorial" button
3. Verify walkthrough opens
4. Verify no console errors
5. Test multiple clicks (should handle gracefully)
6. Test when tutorial command doesn't exist (error handling)
7. Verify welcome screen behavior (stays open or closes as designed)

### Integration Testing

1. Complete end-to-end flow:
   - Fresh install
   - Welcome screen appears
   - Click "Start Tutorial"
   - Walkthrough opens at Step 1
2. Verify smooth transition between welcome and tutorial

## Files Involved

- Welcome screen webview panel creation file
- May need to import/reference extension context

## Dependencies

- Story 005 (kube9.showTutorial command must exist)
- Story 011 (button must send the message)
- Existing welcome screen implementation

## Notes

- The command name must match the one sent from the webview: 'startTutorial'
- Consider whether welcome screen should close when tutorial opens (UX decision)
- Error handling: if tutorial can't open, show user-friendly message
- The handler uses the command from story 005, providing a clean separation of concerns
- Message handler should be async to properly await command execution
- If welcome screen is already set up with message handling, this might take less time

