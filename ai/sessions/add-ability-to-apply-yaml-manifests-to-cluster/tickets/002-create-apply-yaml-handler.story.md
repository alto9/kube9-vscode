---
story_id: 002-create-apply-yaml-handler
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: completed
priority: high
estimated_minutes: 20
---

# Create Apply YAML Command Handler with Input Resolution

## Objective

Create the `applyYAML.ts` command handler file with the function signature and input resolution logic that determines which YAML file to apply.

## Context

The command handler must resolve the target YAML file from three possible sources:
1. URI parameter (when called from context menu)
2. Active editor document (when called from command palette with YAML open)
3. File picker dialog (fallback when no YAML is available)

This follows the pattern used in `YAMLContentProvider.ts` for kubectl execution.

## Implementation Steps

1. Create new file `src/commands/applyYAML.ts`
2. Add imports for vscode APIs and types
3. Define the `ApplyMode` type and `ApplyYAMLResult` interface
4. Implement `applyYAMLCommand(uri?: vscode.Uri)` function:
   - Check if URI parameter is provided
   - If not, check if active editor has a .yaml/.yml file
   - If not, show file picker dialog with YAML filter
   - Return early if user cancels file picker
5. Export the command function

## Files Affected

- `src/commands/applyYAML.ts` - New file (create)

## Code Structure

```typescript
import * as vscode from 'vscode';

export type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

export async function applyYAMLCommand(uri?: vscode.Uri): Promise<void> {
  // Input resolution logic
  let targetUri = uri;
  
  if (!targetUri) {
    // Check active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && isYAMLFile(activeEditor.document.uri)) {
      targetUri = activeEditor.document.uri;
    }
  }
  
  if (!targetUri) {
    // Show file picker
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Apply YAML',
      filters: { 'YAML files': ['yaml', 'yml'] }
    });
    if (!uris || uris.length === 0) return;
    targetUri = uris[0];
  }
  
  // TODO: Continue with mode selection (Story 003)
}

function isYAMLFile(uri: vscode.Uri): boolean {
  const ext = uri.fsPath.toLowerCase();
  return ext.endsWith('.yaml') || ext.endsWith('.yml');
}
```

## Acceptance Criteria

- [x] File `src/commands/applyYAML.ts` exists
- [x] Function `applyYAMLCommand` is exported
- [x] Input resolution correctly prioritizes: URI > active editor > file picker
- [x] File picker filters for .yaml and .yml extensions
- [x] Function returns early if user cancels file picker
- [x] No TypeScript compilation errors

## Dependencies

- Story 001 (command must be registered first)

