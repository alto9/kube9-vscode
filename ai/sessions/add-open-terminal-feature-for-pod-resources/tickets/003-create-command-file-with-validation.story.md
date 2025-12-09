---
story_id: 003-create-command-file-with-validation
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: pending
priority: high
estimated_minutes: 20
---

## Objective

Create `src/commands/openTerminal.ts` with the main command handler function and tree item validation logic.

## Context

This story establishes the command file structure and implements the first critical step: validating that the tree item represents a valid Pod resource and extracting the necessary metadata (pod name, namespace, context).

## Implementation Steps

1. Create new file `src/commands/openTerminal.ts`
2. Add necessary imports:
   ```typescript
   import * as vscode from 'vscode';
   import { ClusterTreeItem } from '../tree/ClusterTreeItem';
   import { getClusterTreeProvider } from '../extension';
   ```
3. Create main command handler function:
   ```typescript
   export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void>
   ```
4. Implement tree item validation:
   - Check if `treeItem` exists
   - Verify `contextValue` starts with 'resource:'
   - Verify `contextValue` is exactly 'resource:Pod'
   - Check if `resourceData` exists
   - If any validation fails, show error and return
5. Extract pod metadata:
   - Get pod name from `treeItem.resourceData.resourceName` or `treeItem.label`
   - Get namespace from `treeItem.resourceData.namespace` (default: 'default')
   - Get context from `treeItem.resourceData.context.name`
   - Get kubeconfig path from `getClusterTreeProvider().getKubeconfigPath()`
   - If any required field is missing, show error and return
6. Add placeholder comment for next steps: `// TODO: Query pod status, select container, create terminal`
7. For now, just log the extracted information to console for verification

## Files Affected

- `src/commands/openTerminal.ts` - Create new file with validation logic

## Acceptance Criteria

- [ ] File created at correct location
- [ ] Main function signature matches: `export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void>`
- [ ] Validates tree item is a Pod resource
- [ ] Extracts pod name, namespace, context correctly
- [ ] Gets kubeconfig path from tree provider
- [ ] Shows appropriate error messages for validation failures
- [ ] Follows error handling patterns from existing commands (scaleWorkload, restartWorkload)
- [ ] TypeScript compiles without errors

## Dependencies

- Story 002 must be completed (extension registration)

