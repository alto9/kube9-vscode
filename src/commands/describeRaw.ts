import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue } from '../extension';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { KubectlError } from '../kubernetes/KubectlError';
import { DescribeRawFileSystemProvider, createDescribeUri } from './DescribeRawFileSystemProvider';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Command handler for "Describe (Raw)".
 * Executes kubectl describe and opens the output in a read-only text editor.
 * 
 * @param treeItem The tree item representing the resource to describe
 */
export async function describeRawCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // Extract resource information from tree item
        if (!treeItem || !treeItem.resourceData) {
            throw new Error('Invalid tree item: missing resource data');
        }

        // Extract kind from contextValue (e.g., "Pod" from "resource:Pod")
        const kind = extractKindFromContextValue(treeItem.contextValue);

        // Extract resource name
        const name = treeItem.resourceData.resourceName || (treeItem.label as string);

        // Extract namespace
        const namespace = treeItem.resourceData.namespace;

        // Extract context name
        const contextName = treeItem.resourceData.context.name;

        // Get kubeconfig path
        const kubeconfigPath = KubeconfigParser.getKubeconfigPath();

        // Build kubectl describe command arguments
        const args: string[] = ['describe', kind.toLowerCase(), name];

        // Add namespace flag for namespaced resources
        if (namespace) {
            args.push('-n', namespace);
        }

        // Add kubeconfig and context flags
        args.push(`--kubeconfig=${kubeconfigPath}`, `--context=${contextName}`);

        // Execute kubectl describe command
        let describeOutput: string;
        try {
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large describe output
                    env: { ...process.env }
                }
            );
            describeOutput = stdout;
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.error(`Failed to describe ${kind}/${name}: ${kubectlError.getDetails()}`);
            
            // Show error message to user
            vscode.window.showErrorMessage(
                `Failed to describe ${kind} '${name}': ${kubectlError.getUserMessage()}`
            );
            
            // Don't open an empty tab on failure
            return;
        }

        // Get the global DescribeRawFileSystemProvider instance
        // We need to access it from the extension context
        // For now, we'll create a static instance that can be accessed
        // Actually, we should pass it as a parameter or use a singleton pattern
        // Let me use a simpler approach: get it from the workspace
        
        // Create URI with resource name and .describe suffix
        const uri = createDescribeUri(name);
        
        // Get the file system provider from workspace
        // We need to store it globally or access it differently
        // For simplicity, let's create a singleton instance
        const fsProvider = DescribeRawFileSystemProvider.getInstance();
        
        // Store the content in the file system provider
        fsProvider.setContent(`${name}.describe`, describeOutput);

        // Open the document using the custom URI
        const document = await vscode.workspace.openTextDocument(uri);

        // Show the document in a read-only editor
        const editor = await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
        });

        // The document is read-only because the FileSystemProvider is registered as readonly

        console.log(`Opened Describe (Raw) for ${kind} '${name}'`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to execute Describe (Raw) command:', errorMessage);
        vscode.window.showErrorMessage(`Failed to describe resource: ${errorMessage}`);
    }
}

