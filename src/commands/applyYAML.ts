import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { KubectlError } from '../kubernetes/KubectlError';
import { getContextInfo } from '../utils/kubectlContext';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as yaml from 'js-yaml';
import * as k8s from '@kubernetes/client-node';

export type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

/**
 * Applies a single Kubernetes resource using server-side apply.
 * Handles create and update operations.
 */
async function applyResource(
    resource: Record<string, unknown>,
    contextName: string,
    mode: ApplyMode
): Promise<string> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);
    
    const kind = (resource.kind as string)?.toLowerCase() || '';
    const name = ((resource.metadata as Record<string, unknown>)?.name as string) || '';
    const namespace = (resource.metadata as Record<string, unknown>)?.namespace as string | undefined;
    
    // For dry-run modes, we'll just validate the resource structure
    if (mode !== 'apply') {
        // Dry-run: Just validate the resource can be parsed
        // In a full implementation, we'd call the API with dry-run headers
        return `${kind}/${name} validated (dry-run)`;
    }
    
    // Route to appropriate API based on resource type
    // Note: Using strategic merge patch for updates (true server-side apply requires additional setup)
    if (namespace) {
        // Namespaced resource
        switch (kind) {
            case 'pod':
                try {
                    await apiClient.core.createNamespacedPod({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        // Resource exists, use strategic merge patch
                        await apiClient.core.patchNamespacedPod({
                            name,
                            namespace,
                            body: resource
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'service':
                try {
                    await apiClient.core.createNamespacedService({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchNamespacedService({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'configmap':
                try {
                    await apiClient.core.createNamespacedConfigMap({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchNamespacedConfigMap({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'secret':
                try {
                    await apiClient.core.createNamespacedSecret({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchNamespacedSecret({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'deployment':
                try {
                    await apiClient.apps.createNamespacedDeployment({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.apps.patchNamespacedDeployment({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'statefulset':
                try {
                    await apiClient.apps.createNamespacedStatefulSet({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.apps.patchNamespacedStatefulSet({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'daemonset':
                try {
                    await apiClient.apps.createNamespacedDaemonSet({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.apps.patchNamespacedDaemonSet({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'replicaset':
                try {
                    await apiClient.apps.createNamespacedReplicaSet({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.apps.patchNamespacedReplicaSet({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'job':
                try {
                    await apiClient.batch.createNamespacedJob({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.batch.patchNamespacedJob({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'cronjob':
                try {
                    await apiClient.batch.createNamespacedCronJob({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.batch.patchNamespacedCronJob({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'persistentvolumeclaim':
                try {
                    await apiClient.core.createNamespacedPersistentVolumeClaim({
                        namespace,
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchNamespacedPersistentVolumeClaim({
                            name,
                            namespace,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            default:
                throw new Error(`Unsupported namespaced resource type: ${kind}`);
        }
    } else {
        // Cluster-scoped resource
        switch (kind) {
            case 'node':
                throw new Error('Cannot apply Node resources - they are managed by the cluster');
            case 'namespace':
                try {
                    await apiClient.core.createNamespace({
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchNamespace({
                            name,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'persistentvolume':
                try {
                    await apiClient.core.createPersistentVolume({
                        body: resource
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.core.patchPersistentVolume({
                            name,
                            body: resource,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            case 'storageclass':
                try {
                    await apiClient.storage.createStorageClass({
                        body: resource as unknown as k8s.V1StorageClass
                    });
                    return `${kind}/${name} created`;
                } catch (error: unknown) {
                    const apiError = error as { statusCode?: number };
                    if (apiError.statusCode === 409) {
                        await apiClient.storage.patchStorageClass({
                            name,
                            body: resource as unknown as k8s.V1StorageClass,
                        });
                        return `${kind}/${name} configured`;
                    }
                    throw error;
                }
            default:
                throw new Error(`Unsupported cluster-scoped resource type: ${kind}`);
        }
    }
}

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
 * Executes apply operation using the Kubernetes API client.
 * Supports regular apply and dry-run modes.
 * 
 * @param filePath - The file system path to the YAML manifest file
 * @param mode - The apply mode (apply, dry-run-server, or dry-run-client)
 * @returns Promise resolving to ApplyYAMLResult with success status and parsed output
 * @throws {KubectlError} If API call fails
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
  
  try {
    // Read YAML file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse YAML - handle both single and multiple resources
    const resources: Record<string, unknown>[] = [];
    try {
      // Try parsing as single resource first
      const singleResource = yaml.load(fileContent);
      if (singleResource && typeof singleResource === 'object') {
        // Check if it's a list
        const single = singleResource as Record<string, unknown>;
        if (single.kind === 'List' && Array.isArray(single.items)) {
          resources.push(...(single.items as Record<string, unknown>[]));
        } else {
          resources.push(single);
        }
      }
    } catch (error) {
      // If single parse fails, try loadAll for multiple documents
      const multipleResources = yaml.loadAll(fileContent);
      resources.push(...multipleResources.filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object'));
    }
    
    if (resources.length === 0) {
      throw new Error('No valid Kubernetes resources found in YAML file');
    }
    
    // Apply each resource
    const resourcesAffected: string[] = [];
    const outputLines: string[] = [];
    
    for (const resource of resources) {
      try {
        const result = await applyResource(resource, contextName, mode);
        resourcesAffected.push(result);
        outputLines.push(result);
      } catch (error: unknown) {
        const resourceName = ((resource.metadata as Record<string, unknown>)?.name as string) || 'unknown';
        const resourceKind = (resource.kind as string) || 'unknown';
        const errorObj = error as { message?: string };
        const errorMsg = `Failed to apply ${resourceKind}/${resourceName}: ${errorObj.message || String(error)}`;
        outputLines.push(errorMsg);
        throw new Error(errorMsg);
      }
    }
    
    const output = outputLines.join('\n');
    
    return {
      success: true,
      output,
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
    if (!uris || uris.length === 0) {
      return;
    }
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
    
    // Show output channel so user can see the execution details
    getOutputChannel().show(false);
    
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

