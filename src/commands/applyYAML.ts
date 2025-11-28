import * as vscode from 'vscode';

export type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

/**
 * Interface for apply mode quick pick items
 */
interface ApplyOption extends vscode.QuickPickItem {
  mode: ApplyMode;
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
 * Quick pick options for apply mode selection
 */
const applyOptions: ApplyOption[] = [
  {
    label: 'Apply',
    description: 'Apply manifest to cluster',
    mode: 'apply'
  },
  {
    label: 'Dry Run (Server)',
    description: 'Validate against cluster API without persisting',
    mode: 'dry-run-server'
  },
  {
    label: 'Dry Run (Client)',
    description: 'Local validation only',
    mode: 'dry-run-client'
  }
];

/**
 * Shows a quick pick dialog for selecting the apply mode.
 * 
 * @returns The selected apply mode, or undefined if the user cancelled
 */
async function selectApplyMode(): Promise<ApplyMode | undefined> {
  const selected = await vscode.window.showQuickPick(applyOptions, {
    placeHolder: 'Select apply mode',
    title: 'Apply YAML Manifest'
  });
  return selected?.mode;
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
  
  // Select apply mode
  const mode = await selectApplyMode();
  if (!mode) {
    // User cancelled mode selection
    return;
  }
  
  // TODO: Continue with kubectl execution (Story 004)
}

