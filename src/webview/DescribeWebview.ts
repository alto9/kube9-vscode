import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue, getYAMLEditorManager } from '../extension';
import { PodDescribeProvider } from '../providers/PodDescribeProvider';
import { NamespaceDescribeProvider } from '../providers/NamespaceDescribeProvider';
import { PVCDescribeProvider } from '../providers/PVCDescribeProvider';
import { PVDescribeProvider } from '../providers/PVDescribeProvider';
import { SecretDescribeProvider } from '../providers/SecretDescribeProvider';
import { ServiceDescribeProvider } from '../providers/ServiceDescribeProvider';
import { ConfigMapDescribeProvider } from '../providers/ConfigMapDescribeProvider';
import { StorageClassDescribeProvider } from '../providers/StorageClassDescribeProvider';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import { DeploymentDescribeWebview } from './DeploymentDescribeWebview';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getHelpController } from '../extension';
import { NamespaceTreeItemConfig } from '../tree/items/NamespaceTreeItem';
import { setNamespace } from '../utils/kubectlContext';

/**
 * Resource information for the Describe webview.
 */
interface DescribeResourceInfo {
    kind: string;
    name: string;
    namespace?: string;
    contextName: string;
}

/**
 * Pod configuration passed from tree item to describe webview.
 */
interface PodTreeItemConfig {
    name: string;
    namespace: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * PVC configuration passed from tree item to describe webview.
 */
interface PVCTreeItemConfig {
    name: string;
    namespace: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * PV configuration passed from tree item to describe webview.
 */
interface PVTreeItemConfig {
    name: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * Secret configuration passed from tree item to describe webview.
 */
interface SecretTreeItemConfig {
    name: string;
    namespace: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * Service configuration passed from tree item to describe webview.
 */
interface ServiceTreeItemConfig {
    name: string;
    namespace: string;
    context: string;
}

/**
 * ConfigMap configuration passed from tree item to describe webview.
 */
export interface ConfigMapTreeItemConfig {
    name: string;
    namespace: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * StorageClass configuration passed from tree item to describe webview.
 */
interface StorageClassTreeItemConfig {
    name: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * DescribeWebview manages a shared webview panel for displaying resource descriptions.
 * Reuses a single panel instance and updates it when different resources are described.
 */
export class DescribeWebview {
    /**
     * The single shared webview panel instance.
     * Reused for all Describe actions.
     */
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Pod describe provider instance for fetching Pod data.
     * Initialized lazily when first needed.
     */
    private static podProvider: PodDescribeProvider | undefined;

    /**
     * Current Pod configuration being displayed.
     * Used for refresh operations.
     */
    private static currentPodConfig: PodTreeItemConfig | undefined;

    /**
     * Namespace describe provider instance for fetching Namespace data.
     * Initialized lazily when first needed.
     */
    private static namespaceProvider: NamespaceDescribeProvider | undefined;

    /**
     * Current Namespace configuration being displayed.
     * Used for refresh operations.
     */
    private static currentNamespaceConfig: NamespaceTreeItemConfig | undefined;

    /**
     * PVC describe provider instance for fetching PVC data.
     * Initialized lazily when first needed.
     */
    private static pvcProvider: PVCDescribeProvider | undefined;

    /**
     * Current PVC configuration being displayed.
     * Used for refresh operations.
     */
    private static currentPVCConfig: PVCTreeItemConfig | undefined;

    /**
     * PV describe provider instance for fetching PV data.
     * Initialized lazily when first needed.
     */
    private static pvProvider: PVDescribeProvider | undefined;

    /**
     * Current PV configuration being displayed.
     * Used for refresh operations.
     */
    private static currentPVConfig: PVTreeItemConfig | undefined;

    /**
     * Secret describe provider instance for fetching Secret data.
     * Initialized lazily when first needed.
     */
    private static secretProvider: SecretDescribeProvider | undefined;

    /**
     * Current Secret configuration being displayed.
     * Used for refresh operations.
     */
    private static currentSecretConfig: SecretTreeItemConfig | undefined;

    /**
     * Service describe provider instance for fetching Service data.
     * Initialized lazily when first needed.
     */
    private static serviceProvider: ServiceDescribeProvider | undefined;

    /**
     * Current Service configuration being displayed.
     * Used for refresh operations.
     */
    private static currentServiceConfig: ServiceTreeItemConfig | undefined;

    /**
     * ConfigMap describe provider instance for fetching ConfigMap data.
     * Initialized lazily when first needed.
     */
    private static configMapProvider: ConfigMapDescribeProvider | undefined;

    /**
     * Current ConfigMap configuration being displayed.
     * Used for refresh operations.
     */
    private static currentConfigMapConfig: ConfigMapTreeItemConfig | undefined;

    /**
     * StorageClass describe provider instance for fetching StorageClass data.
     * Initialized lazily when first needed.
     */
    private static storageClassProvider: StorageClassDescribeProvider | undefined;

    /**
     * Current StorageClass configuration being displayed.
     * Used for refresh operations.
     */
    private static currentStorageClassConfig: StorageClassTreeItemConfig | undefined;

    /**
     * Show the Describe webview for a resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param resourceInfo Information about the resource to describe
     */
    public static show(
        context: vscode.ExtensionContext,
        resourceInfo: DescribeResourceInfo
    ): void {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            DescribeWebview.updatePanel(resourceInfo);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with resource kind and name
        const title = `${resourceInfo.kind} / ${resourceInfo.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getWebviewContent(resourceInfo, panel.webview);

        // Handle panel disposal - clear shared state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new resource information.
     * 
     * @param resourceInfo Information about the resource to describe
     */
    private static updatePanel(resourceInfo: DescribeResourceInfo): void {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `${resourceInfo.kind} / ${resourceInfo.name}`;
        DescribeWebview.currentPanel.title = title;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getWebviewContent(resourceInfo, DescribeWebview.currentPanel.webview);
    }

    /**
     * Get the shared webview panel instance (if it exists).
     * Used by other webview managers to check for and reuse the shared panel.
     * 
     * @returns The current panel or undefined
     */
    public static getSharedPanel(): vscode.WebviewPanel | undefined {
        return DescribeWebview.currentPanel;
    }

    /**
     * Set the shared webview panel instance.
     * Used by other webview managers to register their panel as the shared instance.
     * 
     * @param panel The panel to set as shared
     */
    public static setSharedPanel(panel: vscode.WebviewPanel | undefined): void {
        DescribeWebview.currentPanel = panel;
    }

    /**
     * Generate the HTML content for the Describe webview.
     * Shows a stub "Coming soon" message.
     * 
     * @param resourceInfo Information about the resource being described
     * @returns HTML content string
     */
    private static getWebviewContent(resourceInfo: DescribeResourceInfo, webview: vscode.Webview): string {
        const resourceDisplay = resourceInfo.namespace
            ? `${resourceInfo.kind} "${resourceInfo.name}" in namespace "${resourceInfo.namespace}"`
            : `${resourceInfo.kind} "${resourceInfo.name}"`;

        const cspSource = webview.cspSource;
        let headerStyleUri = '';
        let nonce = '';

        if (DescribeWebview.extensionContext) {
            headerStyleUri = webview.asWebviewUri(
                vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'src', 'webview', 'styles', 'webview-header.css')
            ).toString();
            nonce = getNonce();
        }

        const headerStyleLink = headerStyleUri ? `<link href="${headerStyleUri}" rel="stylesheet">` : '';
        const cspScriptSrc = nonce ? `script-src 'nonce-${nonce}';` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${cspSource}; ${cspScriptSrc}">
    ${headerStyleLink}
    <title>Describe: ${DescribeWebview.escapeHtml(resourceInfo.kind)} / ${DescribeWebview.escapeHtml(resourceInfo.name)}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        h1 {
            margin-top: 0;
            font-size: 1.5em;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .coming-soon {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .coming-soon-message {
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        .resource-info {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>${DescribeWebview.escapeHtml(resourceInfo.kind)} / ${DescribeWebview.escapeHtml(resourceInfo.name)}</h1>
    <div class="coming-soon">
        <div class="coming-soon-message">Coming soon</div>
        <div class="resource-info">Resource: ${DescribeWebview.escapeHtml(resourceDisplay)}</div>
    </div>
</body>
</html>`;
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * 
     * @param unsafe The string to escape
     * @returns The escaped string
     */
    private static escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Show the Describe webview from a tree item.
     * Extracts resource information from the tree item and opens the webview.
     * 
     * @param context The VS Code extension context
     * @param treeItem The tree item to describe
     */
    public static async showFromTreeItem(
        context: vscode.ExtensionContext,
        treeItem: ClusterTreeItem
    ): Promise<void> {
        // Extract resource information from tree item
        if (!treeItem || !treeItem.resourceData) {
            vscode.window.showErrorMessage('Unable to describe: missing resource data');
            return;
        }

        // Extract kind from contextValue (e.g., "Pod" from "resource:Pod")
        const kind = extractKindFromContextValue(treeItem.contextValue);

        // Extract resource name
        const name = treeItem.resourceData.resourceName || (treeItem.label as string);

        // Extract namespace
        const namespace = treeItem.resourceData.namespace;

        // Extract context name
        const contextName = treeItem.resourceData.context.name;

        // Route to specialized webviews
        if (kind === 'Deployment') {
            // Validate namespace (deployments are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe deployment: namespace is required');
                return;
            }
            
            // Get kubeconfig path
            const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
            
            // Call DeploymentDescribeWebview (async)
            await DeploymentDescribeWebview.show(
                context,
                name,
                namespace,
                kubeconfigPath,
                contextName
            );
            return;
        }

        if (kind === 'PersistentVolumeClaim') {
            // Validate namespace (PVCs are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe PVC: namespace is required');
                return;
            }
            
            // Call showPVCDescribe
            await DescribeWebview.showPVCDescribe(context, {
                name,
                namespace,
                context: contextName
            });
            return;
        }

        if (kind === 'PersistentVolume') {
            // PVs are cluster-scoped (no namespace)
            // Call showPVDescribe
            await DescribeWebview.showPVDescribe(context, {
                name,
                context: contextName
            });
            return;
        }

        if (kind === 'Secret') {
            // Validate namespace (Secrets are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe Secret: namespace is required');
                return;
            }
            
            // Call showSecretDescribe
            await DescribeWebview.showSecretDescribe(context, {
                name,
                namespace,
                context: contextName
            });
            return;
        }

        if (kind === 'Service') {
            // Validate namespace (services are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe Service: namespace is required');
                return;
            }
            
            // Call showServiceDescribe
            await DescribeWebview.showServiceDescribe(context, {
                name,
                namespace,
                context: contextName
            });
            return;
        }

        if (kind === 'ConfigMap') {
            // Validate namespace (ConfigMaps are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe ConfigMap: namespace is required');
                return;
            }
            
            // Call showConfigMapDescribe
            await DescribeWebview.showConfigMapDescribe(context, {
                name,
                namespace,
                context: contextName
            });
            return;
        }

        if (kind === 'StorageClass') {
            // StorageClasses are cluster-scoped (no namespace)
            // Call showStorageClassDescribe
            await DescribeWebview.showStorageClassDescribe(context, {
                name,
                context: contextName
            });
            return;
        }

        // Show the Describe webview for other resource types
        DescribeWebview.show(context, {
            kind,
            name,
            namespace,
            contextName
        });
    }

    /**
     * Show the Describe webview for a Pod resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param podConfig Pod configuration with name, namespace, and context
     */
    public static async showPodDescribe(
        context: vscode.ExtensionContext,
        podConfig: PodTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentPodConfig = podConfig;

        // Initialize Pod provider if not already initialized
        if (!DescribeWebview.podProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.podProvider = new PodDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updatePodPanel(podConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Pod name
        const title = `Pod / ${podConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getPodWebviewContent(panel.webview, podConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send Pod data
        await DescribeWebview.loadPodData(podConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentPodConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Pod information.
     * 
     * @param podConfig Pod configuration
     */
    private static async updatePodPanel(podConfig: PodTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Pod / ${podConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentPodConfig = podConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getPodWebviewContent(DescribeWebview.currentPanel.webview, podConfig);

        // Reload Pod data
        await DescribeWebview.loadPodData(podConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Pod data and send it to the webview.
     * 
     * @param podConfig Pod configuration
     * @param panel Webview panel to send data to
     */
    private static async loadPodData(
        podConfig: PodTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.podProvider) {
            return;
        }

        try {
            const podData = await DescribeWebview.podProvider.getPodDetails(
                podConfig.name,
                podConfig.namespace,
                podConfig.context
            );

            panel.webview.postMessage({
                command: 'updatePodData',
                data: podData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Pod details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     * 
     * @param panel The webview panel
     * @param context The extension context
     */
    private static setupMessageHandling(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        // Re-fetch data based on current resource type
                        if (DescribeWebview.currentPodConfig) {
                            await DescribeWebview.loadPodData(
                                DescribeWebview.currentPodConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentNamespaceConfig) {
                            await DescribeWebview.loadNamespaceData(
                                DescribeWebview.currentNamespaceConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentPVCConfig) {
                            await DescribeWebview.loadPVCData(
                                DescribeWebview.currentPVCConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentPVConfig) {
                            await DescribeWebview.loadPVData(
                                DescribeWebview.currentPVConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentSecretConfig) {
                            await DescribeWebview.loadSecretData(
                                DescribeWebview.currentSecretConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentServiceConfig) {
                            await DescribeWebview.loadServiceData(
                                DescribeWebview.currentServiceConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentConfigMapConfig) {
                            await DescribeWebview.loadConfigMapData(
                                DescribeWebview.currentConfigMapConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentStorageClassConfig) {
                            await DescribeWebview.loadStorageClassData(
                                DescribeWebview.currentStorageClassConfig,
                                panel
                            );
                        }
                        break;

                    case 'viewYaml':
                        // Determine which resource type to open YAML for
                        if (DescribeWebview.currentPVConfig) {
                            await DescribeWebview.openPVYamlEditor();
                        } else if (DescribeWebview.currentNamespaceConfig) {
                            await DescribeWebview.openYamlEditor();
                        } else if (DescribeWebview.currentPVCConfig) {
                            await DescribeWebview.openPVCYamlEditor();
                        } else if (DescribeWebview.currentPodConfig) {
                            await DescribeWebview.openPodYamlEditor();
                        } else if (DescribeWebview.currentSecretConfig) {
                            await DescribeWebview.openSecretYamlEditor();
                        } else if (DescribeWebview.currentServiceConfig) {
                            await DescribeWebview.openServiceYamlEditor();
                        } else if (DescribeWebview.currentConfigMapConfig) {
                            await DescribeWebview.openConfigMapYamlEditor();
                        } else if (DescribeWebview.currentStorageClassConfig) {
                            await DescribeWebview.openStorageClassYamlEditor();
                        }
                        break;

                    case 'setDefaultNamespace':
                        if (message.data && message.data.namespace) {
                            await DescribeWebview.setDefaultNamespace(message.data.namespace);
                        } else {
                            vscode.window.showErrorMessage('Invalid namespace data in setDefaultNamespace message');
                        }
                        break;

                    case 'navigateToResource':
                        if (message.data && message.data.resourceType && message.data.namespace) {
                            await DescribeWebview.navigateToResource(
                                message.data.resourceType,
                                message.data.namespace
                            );
                        } else {
                            vscode.window.showErrorMessage('Invalid resource data in navigateToResource message');
                        }
                        break;

                    case 'openTerminal':
                        // TODO: Implement terminal opening functionality
                        vscode.window.showInformationMessage('Open terminal functionality coming soon');
                        break;

                    case 'startPortForward':
                        // TODO: Implement port forwarding functionality
                        vscode.window.showInformationMessage('Port forwarding functionality coming soon');
                        break;

                    case 'navigateToPod':
                        if (message.data && message.data.name && message.data.namespace) {
                            // Navigate to Pod - works from any context (PVC, ConfigMap, etc.)
                            if (DescribeWebview.currentPVCConfig) {
                                await DescribeWebview.navigateToPod(
                                    message.data.name,
                                    message.data.namespace
                                );
                            } else if (DescribeWebview.currentConfigMapConfig) {
                                // Navigate to Pod from ConfigMap context
                                const configMapConfig = DescribeWebview.currentConfigMapConfig;
                                await DescribeWebview.showPodDescribe(
                                    DescribeWebview.extensionContext!,
                                    {
                                        name: message.data.name,
                                        namespace: message.data.namespace,
                                        context: configMapConfig.context
                                    }
                                );
                            } else {
                                vscode.window.showErrorMessage('No context available for navigation');
                            }
                        } else {
                            vscode.window.showErrorMessage('Invalid Pod data in navigateToPod message');
                        }
                        break;

                    case 'navigateToPVC':
                        if (message.data && message.data.name && message.data.namespace) {
                            await DescribeWebview.navigateToPVC(
                                message.data.name,
                                message.data.namespace
                            );
                        } else {
                            vscode.window.showErrorMessage('Invalid PVC data in navigateToPVC message');
                        }
                        break;

                    case 'navigateToStorageClass':
                        // Handle navigation to StorageClass (if needed in future)
                        vscode.window.showInformationMessage('StorageClass navigation not yet implemented');
                        break;

                    default:
                        console.warn('Unknown message command:', message.command);
                }
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Open YAML editor for the current namespace.
     * Uses the current namespace configuration to build a ResourceIdentifier.
     */
    private static async openYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace is currently being displayed');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            
            // Build ResourceIdentifier for namespace
            // Namespaces are cluster-scoped, so namespace field is undefined
            const resource = {
                kind: 'Namespace',
                name: namespaceConfig.name,
                namespace: undefined, // Namespaces are cluster-scoped
                apiVersion: 'v1',
                cluster: namespaceConfig.context
            };

            console.log('Opening YAML editor for namespace:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for namespace:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Set the default namespace in kubectl context.
     * 
     * @param namespace The namespace name to set as default
     */
    private static async setDefaultNamespace(namespace: string): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace context available');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            const contextName = namespaceConfig.context;

            // Set namespace in kubectl context
            const success = await setNamespace(namespace, contextName);
            
            if (success) {
                vscode.window.showInformationMessage(`Default namespace set to: ${namespace}`);
                // Refresh tree view to reflect the change
                await vscode.commands.executeCommand('kube9.refreshTree');
            } else {
                vscode.window.showErrorMessage(`Failed to set default namespace: ${namespace}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to set default namespace:', errorMessage);
            vscode.window.showErrorMessage(`Failed to set default namespace: ${errorMessage}`);
        }
    }

    /**
     * Navigate tree view to show a specific resource type in a namespace.
     * 
     * @param resourceType The resource type to navigate to (e.g., 'pods', 'deployments')
     * @param namespace The namespace name
     */
    private static async navigateToResource(resourceType: string, namespace: string): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace context available');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            const contextName = namespaceConfig.context;

            // Convert resource type to proper kind (e.g., 'pods' -> 'Pod')
            const kind = resourceType.charAt(0).toUpperCase() + resourceType.slice(1).toLowerCase();
            
            // Execute navigate command
            await vscode.commands.executeCommand('kube9.navigateToResource', {
                clusterContext: contextName,
                kind: kind,
                name: '', // We're navigating to a resource type, not a specific resource
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to navigate to resource:', errorMessage);
            vscode.window.showErrorMessage(`Failed to navigate to resource: ${errorMessage}`);
        }
    }

    /**
     * Navigate to a specific Pod and open its describe webview.
     * 
     * @param podName The Pod name
     * @param namespace The namespace name
     */
    private static async navigateToPod(podName: string, namespace: string): Promise<void> {
        if (!DescribeWebview.currentPVCConfig) {
            vscode.window.showErrorMessage('No PVC context available');
            return;
        }

        try {
            const pvcConfig = DescribeWebview.currentPVCConfig;
            const contextName = pvcConfig.context;

            // Open Pod describe webview
            await DescribeWebview.showPodDescribe(
                DescribeWebview.extensionContext!,
                {
                    name: podName,
                    namespace: namespace,
                    context: contextName
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to navigate to Pod:', errorMessage);
            vscode.window.showErrorMessage(`Failed to navigate to Pod: ${errorMessage}`);
        }
    }

    /**
     * Navigate to a specific PVC and open its describe webview.
     * 
     * @param pvcName The PVC name
     * @param namespace The namespace name
     */
    private static async navigateToPVC(pvcName: string, namespace: string): Promise<void> {
        // Get context from any available config (PV, StorageClass, etc.)
        let contextName: string | undefined;
        
        if (DescribeWebview.currentPVConfig) {
            contextName = DescribeWebview.currentPVConfig.context;
        } else if (DescribeWebview.currentStorageClassConfig) {
            contextName = DescribeWebview.currentStorageClassConfig.context;
        } else if (DescribeWebview.currentPVCConfig) {
            contextName = DescribeWebview.currentPVCConfig.context;
        } else if (DescribeWebview.currentPodConfig) {
            contextName = DescribeWebview.currentPodConfig.context;
        } else if (DescribeWebview.currentNamespaceConfig) {
            contextName = DescribeWebview.currentNamespaceConfig.context;
        }

        if (!contextName) {
            vscode.window.showErrorMessage('No context available for navigation');
            return;
        }

        try {
            // Open PVC describe webview
            await DescribeWebview.showPVCDescribe(
                DescribeWebview.extensionContext!,
                {
                    name: pvcName,
                    namespace: namespace,
                    context: contextName
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to navigate to PVC:', errorMessage);
            vscode.window.showErrorMessage(`Failed to navigate to PVC: ${errorMessage}`);
        }
    }

    /**
     * Generate the HTML content for the Pod Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param podConfig Pod configuration
     * @returns HTML content string
     */
    private static getPodWebviewContent(webview: vscode.Webview, podConfig: PodTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getFallbackHtml(podConfig);
        }

        const cspSource = webview.cspSource;
        const escapedPodName = DescribeWebview.escapeHtml(podConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'pod-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Pod / ${escapedPodName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param podConfig Pod configuration
     * @returns Fallback HTML content string
     */
    private static getFallbackHtml(podConfig: PodTreeItemConfig): string {
        const escapedPodName = DescribeWebview.escapeHtml(podConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Pod / ${escapedPodName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Pod / ${escapedPodName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/pod-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Show the Describe webview for a Namespace resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param namespaceConfig Namespace configuration with name, status, metadata, and context
     */
    public static async showNamespaceDescribe(
        context: vscode.ExtensionContext,
        namespaceConfig: NamespaceTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentNamespaceConfig = namespaceConfig;

        // Initialize Namespace provider if not already initialized
        if (!DescribeWebview.namespaceProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.namespaceProvider = new NamespaceDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateNamespacePanel(namespaceConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Namespace name
        const title = `Namespace / ${namespaceConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getNamespaceWebviewContent(panel.webview, namespaceConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Fetch and send Namespace data
        await DescribeWebview.loadNamespaceData(namespaceConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentNamespaceConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Namespace information.
     * 
     * @param namespaceConfig Namespace configuration
     */
    private static async updateNamespacePanel(namespaceConfig: NamespaceTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Namespace / ${namespaceConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentNamespaceConfig = namespaceConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getNamespaceWebviewContent(DescribeWebview.currentPanel.webview, namespaceConfig);

        // Reload Namespace data
        await DescribeWebview.loadNamespaceData(namespaceConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Namespace data and send it to the webview.
     * 
     * @param namespaceConfig Namespace configuration
     * @param panel Webview panel to send data to
     */
    private static async loadNamespaceData(
        namespaceConfig: NamespaceTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.namespaceProvider) {
            return;
        }

        try {
            const namespaceData = await DescribeWebview.namespaceProvider.getNamespaceDetails(
                namespaceConfig.name,
                namespaceConfig.context
            );

            panel.webview.postMessage({
                command: 'updateNamespaceData',
                data: namespaceData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Namespace details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the Namespace Describe webview.
     * Placeholder HTML ready for React bundle injection in story 007.
     * 
     * @param webview The webview instance
     * @param namespaceConfig Namespace configuration
     * @returns HTML content string
     */
    private static getNamespaceWebviewContent(webview: vscode.Webview, namespaceConfig: NamespaceTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getNamespaceFallbackHtml(namespaceConfig);
        }

        const cspSource = webview.cspSource;
        const escapedNamespaceName = DescribeWebview.escapeHtml(namespaceConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'describe', 'index.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Namespace / ${escapedNamespaceName}</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if extension context is not available.
     * 
     * @param namespaceConfig Namespace configuration
     * @returns Fallback HTML content string
     */
    private static getNamespaceFallbackHtml(namespaceConfig: NamespaceTreeItemConfig): string {
        const escapedNamespaceName = DescribeWebview.escapeHtml(namespaceConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Namespace / ${escapedNamespaceName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Namespace / ${escapedNamespaceName}</h1>
    <div class="error">
        Failed to load webview template. Extension context is not available.
    </div>
</body>
</html>`;
    }

    /**
     * Show the Describe webview for a PersistentVolumeClaim resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param pvcConfig PVC configuration with name, namespace, and context
     */
    public static async showPVCDescribe(
        context: vscode.ExtensionContext,
        pvcConfig: PVCTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentPVCConfig = pvcConfig;

        // Initialize PVC provider if not already initialized
        if (!DescribeWebview.pvcProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.pvcProvider = new PVCDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updatePVCPanel(pvcConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with PVC name
        const title = `PersistentVolumeClaim / ${pvcConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getPVCWebviewContent(panel.webview, pvcConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send PVC data
        await DescribeWebview.loadPVCData(pvcConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentPVCConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new PVC information.
     * 
     * @param pvcConfig PVC configuration
     */
    private static async updatePVCPanel(pvcConfig: PVCTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `PersistentVolumeClaim / ${pvcConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentPVCConfig = pvcConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getPVCWebviewContent(DescribeWebview.currentPanel.webview, pvcConfig);

        // Reload PVC data
        await DescribeWebview.loadPVCData(pvcConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load PVC data and send it to the webview.
     * 
     * @param pvcConfig PVC configuration
     * @param panel Webview panel to send data to
     */
    private static async loadPVCData(
        pvcConfig: PVCTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.pvcProvider) {
            return;
        }

        try {
            const pvcData = await DescribeWebview.pvcProvider.getPVCDetails(
                pvcConfig.name,
                pvcConfig.namespace,
                pvcConfig.context
            );

            panel.webview.postMessage({
                command: 'updatePVCData',
                data: pvcData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load PVC details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the PVC Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param pvcConfig PVC configuration
     * @returns HTML content string
     */
    private static getPVCWebviewContent(webview: vscode.Webview, pvcConfig: PVCTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getPVCFallbackHtml(pvcConfig);
        }

        const cspSource = webview.cspSource;
        const escapedPVCName = DescribeWebview.escapeHtml(pvcConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'pvc-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>PersistentVolumeClaim / ${escapedPVCName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param pvcConfig PVC configuration
     * @returns Fallback HTML content string
     */
    private static getPVCFallbackHtml(pvcConfig: PVCTreeItemConfig): string {
        const escapedPVCName = DescribeWebview.escapeHtml(pvcConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>PersistentVolumeClaim / ${escapedPVCName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>PersistentVolumeClaim / ${escapedPVCName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/pvc-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Show the Describe webview for a PersistentVolume resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param pvConfig PV configuration with name and context
     */
    public static async showPVDescribe(
        context: vscode.ExtensionContext,
        pvConfig: PVTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentPVConfig = pvConfig;

        // Initialize PV provider if not already initialized
        if (!DescribeWebview.pvProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.pvProvider = new PVDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updatePVPanel(pvConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with PV name
        const title = `PersistentVolume / ${pvConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getPVWebviewContent(panel.webview, pvConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send PV data
        await DescribeWebview.loadPVData(pvConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentPVConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new PV information.
     * 
     * @param pvConfig PV configuration
     */
    private static async updatePVPanel(pvConfig: PVTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `PersistentVolume / ${pvConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentPVConfig = pvConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getPVWebviewContent(DescribeWebview.currentPanel.webview, pvConfig);

        // Reload PV data
        await DescribeWebview.loadPVData(pvConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load PV data and send it to the webview.
     * 
     * @param pvConfig PV configuration
     * @param panel Webview panel to send data to
     */
    private static async loadPVData(
        pvConfig: PVTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.pvProvider) {
            return;
        }

        try {
            const pvData = await DescribeWebview.pvProvider.getPVDetails(
                pvConfig.name,
                pvConfig.context
            );

            panel.webview.postMessage({
                command: 'updatePVData',
                data: pvData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load PV details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the PV Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param pvConfig PV configuration
     * @returns HTML content string
     */
    private static getPVWebviewContent(webview: vscode.Webview, pvConfig: PVTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getPVFallbackHtml(pvConfig);
        }

        const cspSource = webview.cspSource;
        const escapedPVName = DescribeWebview.escapeHtml(pvConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'pv-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>PersistentVolume / ${escapedPVName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param pvConfig PV configuration
     * @returns Fallback HTML content string
     */
    private static getPVFallbackHtml(pvConfig: PVTreeItemConfig): string {
        const escapedPVName = DescribeWebview.escapeHtml(pvConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>PersistentVolume / ${escapedPVName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>PersistentVolume / ${escapedPVName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/pv-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Open YAML editor for the current PV.
     * Uses the current PV configuration to build a ResourceIdentifier.
     */
    private static async openPVYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentPVConfig) {
            vscode.window.showErrorMessage('No PV is currently being displayed');
            return;
        }

        try {
            const pvConfig = DescribeWebview.currentPVConfig;
            
            // Build ResourceIdentifier for PV
            // PVs are cluster-scoped, so namespace field is undefined
            const resource = {
                kind: 'PersistentVolume',
                name: pvConfig.name,
                namespace: undefined, // PVs are cluster-scoped
                apiVersion: 'v1',
                cluster: pvConfig.context
            };

            console.log('Opening YAML editor for PV:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for PV:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Open YAML editor for the current PVC.
     * Uses the current PVC configuration to build a ResourceIdentifier.
     */
    private static async openPVCYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentPVCConfig) {
            vscode.window.showErrorMessage('No PVC is currently being displayed');
            return;
        }

        try {
            const pvcConfig = DescribeWebview.currentPVCConfig;
            
            // Build ResourceIdentifier for PVC
            const resource = {
                kind: 'PersistentVolumeClaim',
                name: pvcConfig.name,
                namespace: pvcConfig.namespace,
                apiVersion: 'v1',
                cluster: pvcConfig.context
            };

            console.log('Opening YAML editor for PVC:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for PVC:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Open YAML editor for the current Pod.
     * Uses the current Pod configuration to build a ResourceIdentifier.
     */
    private static async openPodYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentPodConfig) {
            vscode.window.showErrorMessage('No Pod is currently being displayed');
            return;
        }

        try {
            const podConfig = DescribeWebview.currentPodConfig;
            
            // Build ResourceIdentifier for Pod
            const resource = {
                kind: 'Pod',
                name: podConfig.name,
                namespace: podConfig.namespace,
                apiVersion: 'v1',
                cluster: podConfig.context
            };

            console.log('Opening YAML editor for Pod:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for Pod:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Show the Describe webview for a Secret resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param secretConfig Secret configuration with name, namespace, and context
     */
    public static async showSecretDescribe(
        context: vscode.ExtensionContext,
        secretConfig: SecretTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentSecretConfig = secretConfig;

        // Initialize Secret provider if not already initialized
        if (!DescribeWebview.secretProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.secretProvider = new SecretDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateSecretPanel(secretConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Secret name
        const title = `Secret / ${secretConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getSecretWebviewContent(panel.webview, secretConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send Secret data
        await DescribeWebview.loadSecretData(secretConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentSecretConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Show the Describe webview for a StorageClass resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param scConfig StorageClass configuration with name and context
     */
    public static async showStorageClassDescribe(
        context: vscode.ExtensionContext,
        scConfig: StorageClassTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentStorageClassConfig = scConfig;

        // Initialize StorageClass provider if not already initialized
        if (!DescribeWebview.storageClassProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.storageClassProvider = new StorageClassDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateStorageClassPanel(scConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with StorageClass name
        const title = `StorageClass / ${scConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getStorageClassWebviewContent(panel.webview, scConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send StorageClass data
        await DescribeWebview.loadStorageClassData(scConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentStorageClassConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Secret information.
     * 
     * @param secretConfig Secret configuration
     */
    private static async updateSecretPanel(secretConfig: SecretTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Secret / ${secretConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentSecretConfig = secretConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getSecretWebviewContent(DescribeWebview.currentPanel.webview, secretConfig);

        // Reload Secret data
        await DescribeWebview.loadSecretData(secretConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Secret data and send it to the webview.
     * 
     * @param secretConfig Secret configuration
     * @param panel Webview panel to send data to
     */
    private static async loadSecretData(
        secretConfig: SecretTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.secretProvider) {
            return;
        }

        try {
            const secretData = await DescribeWebview.secretProvider.getSecretDetails(
                secretConfig.name,
                secretConfig.namespace,
                secretConfig.context
            );

            panel.webview.postMessage({
                command: 'updateSecretData',
                data: secretData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Secret details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Update an existing panel with new StorageClass information.
     * 
     * @param scConfig StorageClass configuration
     */
    private static async updateStorageClassPanel(scConfig: StorageClassTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `StorageClass / ${scConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentStorageClassConfig = scConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getStorageClassWebviewContent(DescribeWebview.currentPanel.webview, scConfig);

        // Reload StorageClass data
        await DescribeWebview.loadStorageClassData(scConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load StorageClass data and send it to the webview.
     * 
     * @param scConfig StorageClass configuration
     * @param panel Webview panel to send data to
     */
    private static async loadStorageClassData(
        scConfig: StorageClassTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.storageClassProvider) {
            return;
        }

        try {
            const scData = await DescribeWebview.storageClassProvider.getStorageClassDetails(
                scConfig.name,
                scConfig.context
            );

            panel.webview.postMessage({
                command: 'updateStorageClassData',
                data: scData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load StorageClass details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the Secret Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param secretConfig Secret configuration
     * @returns HTML content string
     */
    private static getSecretWebviewContent(webview: vscode.Webview, secretConfig: SecretTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getSecretFallbackHtml(secretConfig);
        }

        const cspSource = webview.cspSource;
        const escapedSecretName = DescribeWebview.escapeHtml(secretConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'secret-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Secret / ${escapedSecretName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Generate the HTML content for the StorageClass Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param scConfig StorageClass configuration
     * @returns HTML content string
     */
    private static getStorageClassWebviewContent(webview: vscode.Webview, scConfig: StorageClassTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getStorageClassFallbackHtml(scConfig);
        }

        const cspSource = webview.cspSource;
        const escapedSCName = DescribeWebview.escapeHtml(scConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'storageclass-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>StorageClass / ${escapedSCName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param secretConfig Secret configuration
     * @returns Fallback HTML content string
     */
    private static getSecretFallbackHtml(secretConfig: SecretTreeItemConfig): string {
        const escapedSecretName = DescribeWebview.escapeHtml(secretConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Secret / ${escapedSecretName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Secret / ${escapedSecretName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/secret-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param scConfig StorageClass configuration
     * @returns Fallback HTML content string
     */
    private static getStorageClassFallbackHtml(scConfig: StorageClassTreeItemConfig): string {
        const escapedSCName = DescribeWebview.escapeHtml(scConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>StorageClass / ${escapedSCName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>StorageClass / ${escapedSCName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/storageclass-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Open YAML editor for the current Secret.
     * Uses the current Secret configuration to build a ResourceIdentifier.
     */
    private static async openSecretYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentSecretConfig) {
            vscode.window.showErrorMessage('No Secret is currently being displayed');
            return;
        }

        try {
            const secretConfig = DescribeWebview.currentSecretConfig;
            
            // Build ResourceIdentifier for Secret
            const resource = {
                kind: 'Secret',
                name: secretConfig.name,
                namespace: secretConfig.namespace,
                apiVersion: 'v1',
                cluster: secretConfig.context
            };

            console.log('Opening YAML editor for Secret:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for Secret:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Open YAML editor for the current StorageClass.
     * Uses the current StorageClass configuration to build a ResourceIdentifier.
     */
    private static async openStorageClassYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentStorageClassConfig) {
            vscode.window.showErrorMessage('No StorageClass is currently being displayed');
            return;
        }

        try {
            const scConfig = DescribeWebview.currentStorageClassConfig;
            
            // Build ResourceIdentifier for StorageClass
            // StorageClasses are cluster-scoped, so namespace field is undefined
            const resource = {
                kind: 'StorageClass',
                name: scConfig.name,
                namespace: undefined, // StorageClasses are cluster-scoped
                apiVersion: 'storage.k8s.io/v1',
                cluster: scConfig.context
            };

            console.log('Opening YAML editor for StorageClass:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for StorageClass:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Show the Describe webview for a Service resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param serviceConfig Service configuration with name, namespace, and context
     */
    public static async showServiceDescribe(
        context: vscode.ExtensionContext,
        serviceConfig: ServiceTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentServiceConfig = serviceConfig;

        // Initialize Service provider if not already initialized
        if (!DescribeWebview.serviceProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.serviceProvider = new ServiceDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateServicePanel(serviceConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Service name
        const title = `Service / ${serviceConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getServiceWebviewContent(panel.webview, serviceConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send Service data
        await DescribeWebview.loadServiceData(serviceConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentServiceConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Service information.
     * 
     * @param serviceConfig Service configuration
     */
    private static async updateServicePanel(serviceConfig: ServiceTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Service / ${serviceConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentServiceConfig = serviceConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getServiceWebviewContent(DescribeWebview.currentPanel.webview, serviceConfig);

        // Reload Service data
        await DescribeWebview.loadServiceData(serviceConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Service data and send it to the webview.
     * 
     * @param serviceConfig Service configuration
     * @param panel Webview panel to send data to
     */
    private static async loadServiceData(
        serviceConfig: ServiceTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.serviceProvider) {
            return;
        }

        try {
            const serviceData = await DescribeWebview.serviceProvider.getServiceDetails(
                serviceConfig.name,
                serviceConfig.namespace,
                serviceConfig.context
            );

            panel.webview.postMessage({
                command: 'updateServiceData',
                data: serviceData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Service details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the Service Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param serviceConfig Service configuration
     * @returns HTML content string
     */
    private static getServiceWebviewContent(webview: vscode.Webview, serviceConfig: ServiceTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getServiceFallbackHtml(serviceConfig);
        }

        const cspSource = webview.cspSource;
        const escapedServiceName = DescribeWebview.escapeHtml(serviceConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'service-describe', 'index.js')
        );

        // Read CSS bundle and inline it
        // Try dist path first (production), then media path (development)
        let bundleCss = '';
        const cssPaths = [
            path.join(DescribeWebview.extensionContext.extensionPath, 'dist', 'media', 'service-describe', 'index.css'),
            path.join(DescribeWebview.extensionContext.extensionPath, 'media', 'describe', 'podDescribe.css')
        ];
        
        for (const cssPath of cssPaths) {
            try {
                if (fs.existsSync(cssPath)) {
                    bundleCss = fs.readFileSync(cssPath, 'utf8');
                    break;
                }
            } catch (error) {
                // Try next path
                continue;
            }
        }
        
        if (!bundleCss) {
            console.warn('Failed to load service describe CSS from any path');
        }

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Service / ${escapedServiceName}</title>
    <style>
        ${bundleCss}
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param serviceConfig Service configuration
     * @returns Fallback HTML content string
     */
    private static getServiceFallbackHtml(serviceConfig: ServiceTreeItemConfig): string {
        const escapedServiceName = DescribeWebview.escapeHtml(serviceConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Service / ${escapedServiceName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Service / ${escapedServiceName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/service-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Open YAML editor for the current Service.
     * Uses the current Service configuration to build a ResourceIdentifier.
     */
    private static async openServiceYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentServiceConfig) {
            vscode.window.showErrorMessage('No Service is currently being displayed');
            return;
        }

        try {
            const serviceConfig = DescribeWebview.currentServiceConfig;
            
            // Build ResourceIdentifier for Service
            const resource = {
                kind: 'Service',
                name: serviceConfig.name,
                namespace: serviceConfig.namespace,
                apiVersion: 'v1',
                cluster: serviceConfig.context
            };

            console.log('Opening YAML editor for Service:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for Service:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Show the Describe webview for a ConfigMap resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param configMapConfig ConfigMap configuration with name, namespace, and context
     */
    public static async showConfigMapDescribe(
        context: vscode.ExtensionContext,
        configMapConfig: ConfigMapTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentConfigMapConfig = configMapConfig;

        // Initialize ConfigMap provider if not already initialized
        if (!DescribeWebview.configMapProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.configMapProvider = new ConfigMapDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateConfigMapPanel(configMapConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with ConfigMap name
        const title = `ConfigMap / ${configMapConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getConfigMapWebviewContent(panel.webview, configMapConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send ConfigMap data
        await DescribeWebview.loadConfigMapData(configMapConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentConfigMapConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new ConfigMap information.
     * 
     * @param configMapConfig ConfigMap configuration
     */
    private static async updateConfigMapPanel(configMapConfig: ConfigMapTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `ConfigMap / ${configMapConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentConfigMapConfig = configMapConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getConfigMapWebviewContent(DescribeWebview.currentPanel.webview, configMapConfig);

        // Reload ConfigMap data
        await DescribeWebview.loadConfigMapData(configMapConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load ConfigMap data and send it to the webview.
     * 
     * @param configMapConfig ConfigMap configuration
     * @param panel Webview panel to send data to
     */
    private static async loadConfigMapData(
        configMapConfig: ConfigMapTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.configMapProvider) {
            return;
        }

        try {
            const configMapData = await DescribeWebview.configMapProvider.getConfigMapDetails(
                configMapConfig.name,
                configMapConfig.namespace,
                configMapConfig.context
            );

            panel.webview.postMessage({
                command: 'updateConfigMapData',
                data: configMapData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load ConfigMap details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the ConfigMap Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param configMapConfig ConfigMap configuration
     * @returns HTML content string
     */
    private static getConfigMapWebviewContent(webview: vscode.Webview, configMapConfig: ConfigMapTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getConfigMapFallbackHtml(configMapConfig);
        }

        const cspSource = webview.cspSource;
        const escapedConfigMapName = DescribeWebview.escapeHtml(configMapConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'configmap-describe', 'index.js')
        );

        // Read header CSS and inline it
        let headerCss = '';
        try {
            const headerCssPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'styles',
                'webview-header.css'
            );
            headerCss = fs.readFileSync(headerCssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load header CSS:', error);
        }

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>ConfigMap / ${escapedConfigMapName}</title>
    <style>
        ${headerCss}
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param configMapConfig ConfigMap configuration
     * @returns Fallback HTML content string
     */
    private static getConfigMapFallbackHtml(configMapConfig: ConfigMapTreeItemConfig): string {
        const escapedConfigMapName = DescribeWebview.escapeHtml(configMapConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>ConfigMap / ${escapedConfigMapName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>ConfigMap / ${escapedConfigMapName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/configmap-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Open YAML editor for the current ConfigMap.
     * Uses the current ConfigMap configuration to build a ResourceIdentifier.
     */
    private static async openConfigMapYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentConfigMapConfig) {
            vscode.window.showErrorMessage('No ConfigMap is currently being displayed');
            return;
        }

        try {
            const configMapConfig = DescribeWebview.currentConfigMapConfig;
            
            // Build ResourceIdentifier for ConfigMap
            const resource = {
                kind: 'ConfigMap',
                name: configMapConfig.name,
                namespace: configMapConfig.namespace,
                apiVersion: 'v1',
                cluster: configMapConfig.context
            };

            console.log('Opening YAML editor for ConfigMap:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for ConfigMap:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }
}

/**
 * Generate a random nonce for Content Security Policy.
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

