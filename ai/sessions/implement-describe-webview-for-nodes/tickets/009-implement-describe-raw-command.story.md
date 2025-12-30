---
story_id: implement-describe-raw-command
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Implement Describe (Raw) Command for Nodes

## Objective

Add "Describe (Raw)" context menu option for nodes that opens a read-only text editor with the raw kubectl describe output.

## Context

Users sometimes need the raw kubectl describe output for debugging or copying. This should open in a text editor tab, similar to how "View YAML" works.

## Files to Modify

- `src/extension.ts` (register command)
- `package.json` (add context menu item)

## Implementation Steps

1. In extension.ts, register the 'kube9.describeNodeRaw' command:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'kube9.describeNodeRaw',
    async (treeItem) => {
      const nodeName = treeItem.label;
      const kubeconfigPath = getKubeconfigPath(context);
      const contextName = treeItem.resourceData.context.name;
      
      // Execute kubectl describe node
      const { stdout } = await execFileAsync(
        'kubectl',
        ['describe', 'node', nodeName, `--kubeconfig=${kubeconfigPath}`, `--context=${contextName}`]
      );
      
      // Open in text editor
      const doc = await vscode.workspace.openTextDocument({
        content: stdout,
        language: 'plaintext'
      });
      
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Active
      });
      
      // Make editor read-only by setting the document as untitled
      await vscode.commands.executeCommand('workbench.action.keepEditor');
    }
  )
);
```

2. In package.json, add context menu item:
```json
{
  "command": "kube9.describeNodeRaw",
  "when": "view == kube9TreeView && viewItem == resource:Node",
  "group": "kube9@2"
}
```

3. Add command definition in package.json commands section:
```json
{
  "command": "kube9.describeNodeRaw",
  "title": "Describe (Raw)",
  "category": "Kube9"
}
```

4. Import execFileAsync from 'child_process' and promisify from 'util'

## Acceptance Criteria

- [ ] kube9.describeNodeRaw command registered in extension.ts
- [ ] Command executes kubectl describe node
- [ ] Output opens in new text editor tab
- [ ] Editor shows raw kubectl describe output
- [ ] Tab title includes node name
- [ ] Context menu item appears on right-click of node
- [ ] Command appears in "Kube9" command group
- [ ] Error handling for kubectl failures
- [ ] Editor is effectively read-only (untitled document)

## Estimated Time

< 20 minutes

## Dependencies

None - can be done in parallel with story 008

