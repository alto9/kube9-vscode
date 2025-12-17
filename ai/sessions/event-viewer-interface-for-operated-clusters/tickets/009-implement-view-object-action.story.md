---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 15
---

# Implement View Object Action

## Objective

Implement the "View Object" action that navigates to the referenced Kubernetes object in the tree view when clicked from an expanded event.

## Acceptance Criteria

- [ ] "View Object" button triggers viewObject message
- [ ] Extension receives viewObject message
- [ ] Extension locates object in tree view
- [ ] Tree view expands to show the object
- [ ] Object is selected/highlighted in tree
- [ ] Works for Pods, Deployments, Services, etc.
- [ ] Graceful handling if object not found

## Implementation Steps

### 1. Implement viewObject handler in EventViewerPanel

**File**: `src/webview/EventViewerPanel.ts`

Update the `handleWebviewMessage` method to implement the `viewObject` case:

```typescript
case 'viewObject':
    await EventViewerPanel.handleViewObject(
        message.data as { kind: string; name: string; namespace?: string }
    );
    break;
```

Add new method:

```typescript
/**
 * Handle view object action - navigate to object in tree view.
 * 
 * @param data - Object information
 */
private static async handleViewObject(
    data: { kind: string; name: string; namespace?: string }
): Promise<void> {
    try {
        const { kind, name, namespace } = data;
        
        // Use VS Code's reveal command to show the object in tree view
        // This will expand the tree and select the item
        await vscode.commands.executeCommand(
            'kube9.revealResource',
            kind,
            name,
            namespace
        );
    } catch (error: any) {
        // If reveal command doesn't exist or fails, show error
        vscode.window.showWarningMessage(
            `Unable to locate ${data.kind}/${data.name} in tree view. It may have been deleted.`
        );
        console.error('Error viewing object:', error);
    }
}
```

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add handleViewObject method, update message handler

## Testing

Manual test:
1. Open Event Viewer
2. Expand an event that has an object reference (e.g., Deployment)
3. Click "View Object" button
4. Verify tree view expands to show the object's category
5. Verify object is selected/highlighted
6. Test with different object types (Pod, Service, ConfigMap)
7. Test with an object that no longer exists
8. Verify graceful error message shown

## Dependencies

- Depends on Story 008 (Event expansion)
- Depends on existing `kube9.revealResource` command (if it exists)
- If `kube9.revealResource` doesn't exist, this may need adjustment to use tree provider directly

## Notes

- This implementation assumes a `kube9.revealResource` command exists or can be created
- Alternative approach: Use the tree provider's reveal functionality directly
- If object doesn't exist, shows a user-friendly warning message
- The action helps users quickly navigate from events to affected resources
- This is particularly useful for troubleshooting issues highlighted by events

