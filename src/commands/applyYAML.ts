import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';
import { getContextInfo } from '../utils/kubectlContext';

export type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

/**
 * Timeout for kubectl apply commands in milliseconds.
 * Longer timeout than standard kubectl commands due to apply operations potentially taking more time.
 */
const KUBECTL_TIMEOUT_MS = 10000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * OutputChannel for apply YAML operation logging.
 * Created lazily on first use.
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the OutputChannel for apply YAML operation logging.
 * 
 * @returns The OutputChannel instance
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('kube9');
  }
  return outputChannel;
}

/**
 * Formats a timestamp for log entries.
 * Uses format: YYYY-MM-DD HH:MM:SS
 * 
 * @returns Formatted timestamp string
 */
function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Logs a message to the output channel with timestamp.
 * 
 * @param message - The message to log
 */
function logToChannel(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[${formatTimestamp()}] ${message}`);
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
 * Parses kubectl apply output to extract resource information.
 * Each line typically contains a resource type, name, and action (e.g., "deployment.apps/my-app created").
 * 
 * @param output - The stdout output from kubectl apply command
 * @returns Array of resource strings, one per line
 */
function parseApplyOutput(output: string): string[] {
  // Parse lines like "deployment.apps/my-app created"
  const lines = output.trim().split('\n');
  return lines.filter(line => line.length > 0);
}

/**
 * Logs the kubectl command being executed.
 * 
 * @param filePath - The file path being applied
 * @param mode - The apply mode
 */
function logCommand(filePath: string, mode: ApplyMode): void {
  const modeDisplay = mode === 'apply' 
    ? 'apply' 
    : mode === 'dry-run-server' 
      ? 'dry-run (server)' 
      : 'dry-run (client)';
  logToChannel(`Executing: kubectl apply -f "${filePath}" (mode: ${modeDisplay})`);
}

/**
 * Logs the command output.
 * 
 * @param output - The stdout output from kubectl command
 */
function logOutput(output: string): void {
  if (output.trim()) {
    logToChannel('Output:');
    // Log each line of output
    const lines = output.trim().split('\n');
    lines.forEach(line => {
      const channel = getOutputChannel();
      channel.appendLine(line);
    });
  }
}

/**
 * Logs success status.
 */
function logSuccess(): void {
  logToChannel('✓ Apply completed successfully');
}

/**
 * Logs error details.
 * 
 * @param error - The error that occurred
 */
function logError(error: Error | KubectlError | unknown): void {
  logToChannel('✗ Apply failed');
  
  if (error instanceof KubectlError) {
    const channel = getOutputChannel();
    channel.appendLine(`Error Type: ${error.type}`);
    channel.appendLine(`Cluster: ${error.contextName}`);
    channel.appendLine(`Message: ${error.getUserMessage()}`);
    channel.appendLine(`Details: ${error.getDetails()}`);
  } else if (error instanceof Error) {
    const channel = getOutputChannel();
    channel.appendLine(`Error: ${error.message}`);
    if (error.stack) {
      channel.appendLine(`Stack: ${error.stack}`);
    }
  } else {
    logToChannel(`Error: ${String(error)}`);
  }
  
  // Add empty line for readability
  const channel = getOutputChannel();
  channel.appendLine('');
}

/**
 * Shows a success notification for apply operations.
 * Formats the message based on mode and resource count.
 * 
 * @param result - The apply result containing resources affected
 * @param mode - The apply mode used
 */
async function showApplyNotification(
  result: ApplyYAMLResult,
  mode: ApplyMode
): Promise<void> {
  const resourceCount = result.resourcesAffected.length;
  
  let message: string;
  if (mode !== 'apply') {
    // Dry run mode
    message = `Dry run passed: ${resourceCount} resource(s) validated`;
  } else if (resourceCount === 1) {
    // Single resource - show the resource string (e.g., "deployment.apps/my-app created")
    message = result.resourcesAffected[0];
  } else {
    // Multiple resources
    message = `${resourceCount} resources applied successfully`;
  }
  
  await vscode.window.showInformationMessage(message);
}

/**
 * Shows an error notification for apply failures.
 * Displays a user-friendly error message with "Show Output" action button.
 * 
 * @param error - The KubectlError that occurred
 */
async function showApplyError(error: KubectlError): Promise<void> {
  const message = error.getUserMessage();
  const action = await vscode.window.showErrorMessage(
    message,
    'Show Output'
  );
  
  if (action === 'Show Output') {
    getOutputChannel().show();
  }
}

/**
 * Executes kubectl apply command with the specified file and mode.
 * Supports regular apply and dry-run modes (server and client).
 * 
 * @param filePath - The file system path to the YAML manifest file
 * @param mode - The apply mode (apply, dry-run-server, or dry-run-client)
 * @returns Promise resolving to ApplyYAMLResult with success status and parsed output
 * @throws {KubectlError} If kubectl command fails
 */
async function executeKubectlApply(
  filePath: string,
  mode: ApplyMode
): Promise<ApplyYAMLResult> {
  // Get current context name for error reporting
  let contextName = 'current';
  try {
    const contextInfo = await getContextInfo();
    contextName = contextInfo.contextName;
  } catch (error) {
    // If we can't get context info, use default 'current' for error reporting
    // This shouldn't block execution
    console.warn('Failed to get context info for error reporting:', error);
  }
  
  // Build command arguments
  const args = ['apply', '-f', filePath];
  
  // Add dry-run flags when appropriate
  if (mode === 'dry-run-server') {
    args.push('--dry-run=server');
  } else if (mode === 'dry-run-client') {
    args.push('--dry-run=client');
  }
  
  try {
    // Execute kubectl command
    const { stdout, stderr } = await execFileAsync('kubectl', args, {
      timeout: KUBECTL_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large manifests
      env: { ...process.env }
    });
    
    // Parse resources from output
    const resourcesAffected = parseApplyOutput(stdout);
    
    return {
      success: true,
      output: stdout,
      resourcesAffected
    };
  } catch (error) {
    // Convert execution error to structured KubectlError
    const kubectlError = KubectlError.fromExecError(error, contextName);
    throw kubectlError;
  }
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
  
  // Execute kubectl apply command
  try {
    // Log command before execution
    logCommand(targetUri.fsPath, mode);
    
    const result = await executeKubectlApply(targetUri.fsPath, mode);
    
    // Log output and success
    logOutput(result.output);
    logSuccess();
    
    // Show success notification
    await showApplyNotification(result, mode);
  } catch (error) {
    // Log error details
    logError(error);
    
    // Show output channel on error to help with debugging
    const channel = getOutputChannel();
    channel.show(true);
    
    // Handle kubectl errors
    if (error instanceof KubectlError) {
      // Show error notification with "Show Output" action
      await showApplyError(error);
    } else {
      // Unexpected error type - show generic error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error during apply:', errorMessage);
      vscode.window.showErrorMessage(`Failed to apply YAML: ${errorMessage}`);
    }
  }
}

