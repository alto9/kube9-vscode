import * as vscode from 'vscode';

export type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

/**
 * Checks if a URI points to a YAML file based on its extension.
 * 
 * @param uri - The URI to check
 * @returns true if the URI has a .yaml or .yml extension, false otherwise
 */
function isYAMLFile(uri: vscode.Uri): boolean {
  const ext = uri.fsPath.toLowerCase();
  return ext.endsWith('.yaml') || ext.endsWith('.yml');
}

/**
 * Command handler for applying YAML manifests to Kubernetes clusters.
 * Resolves the target YAML file from three possible sources:
 * 1. URI parameter (when called from context menu)
 * 2. Active editor document (when called from command palette with YAML open)
 * 3. File picker dialog (fallback when no YAML is available)
 * 
 * @param uri - Optional URI parameter provided when called from context menu
 */
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

