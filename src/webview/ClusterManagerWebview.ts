import * as vscode from 'vscode';
import { ClusterCustomizationService, ClusterCustomizationConfig } from '../services/ClusterCustomizationService';
import { KubeconfigParser, ParsedKubeconfig } from '../kubernetes/KubeconfigParser';

/**
 * Message sent from webview to extension requesting cluster list.
 */
interface GetClustersMessage {
    type: 'getClusters';
}

/**
 * Message sent from extension to webview with initialization data.
 */
interface InitializeMessage {
    type: 'initialize';
    data: {
        clusters: Array<{
            contextName: string;
            clusterName: string;
            clusterServer: string;
            isActive: boolean;
        }>;
        customizations: ClusterCustomizationConfig;
        theme: 'light' | 'dark';
    };
}

/**
 * Union type for all webview messages.
 */
type WebviewMessage = GetClustersMessage | InitializeMessage;

/**
 * ClusterManagerWebview manages the webview panel for the Cluster Manager interface.
 * Uses singleton pattern to ensure only one instance can be open at a time.
 */
export class ClusterManagerWebview {
    /**
     * The single Cluster Manager webview panel instance.
     * Undefined when no panel is open.
     */
    private static currentPanel: ClusterManagerWebview | undefined;

    /**
     * The VS Code webview panel instance.
     */
    public readonly panel: vscode.WebviewPanel;

    /**
     * Service for managing cluster customizations.
     */
    private readonly customizationService: ClusterCustomizationService;

    /**
     * Extension context for accessing kubeconfig.
     */
    private readonly extensionContext: vscode.ExtensionContext;

    /**
     * Extension URI for loading resources.
     */
    private readonly extensionUri: vscode.Uri;

    /**
     * Create or show the Cluster Manager webview panel.
     * If a panel already exists, reveals it. Otherwise creates a new one.
     * 
     * @param extensionUri - The extension URI for loading resources
     * @param customizationService - Service for managing cluster customizations
     * @param extensionContext - Extension context for accessing kubeconfig
     * @returns The ClusterManagerWebview instance
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        customizationService: ClusterCustomizationService,
        extensionContext: vscode.ExtensionContext
    ): ClusterManagerWebview {
        if (ClusterManagerWebview.currentPanel) {
            ClusterManagerWebview.currentPanel.panel.reveal();
            return ClusterManagerWebview.currentPanel;
        }

        return new ClusterManagerWebview(extensionUri, customizationService, extensionContext);
    }

    /**
     * Private constructor to enforce singleton pattern.
     * Creates a new webview panel with placeholder content.
     * 
     * @param extensionUri - The extension URI for loading resources (will be used for loading React assets in future stories)
     * @param customizationService - Service for managing cluster customizations
     * @param extensionContext - Extension context for accessing kubeconfig
     */
    private constructor(
        extensionUri: vscode.Uri,
        customizationService: ClusterCustomizationService,
        extensionContext: vscode.ExtensionContext
    ) {
        this.extensionUri = extensionUri;
        this.customizationService = customizationService;
        this.extensionContext = extensionContext;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'kube9.clusterManager',
            'Cluster Manager',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'cluster-manager')
                ]
            }
        );

        // Set HTML content
        this.panel.webview.html = ClusterManagerWebview.getWebviewContent(
            this.panel.webview,
            extensionUri
        );

        // Set up message handler
        this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(message);
            },
            undefined,
            []
        );

        // Handle panel disposal to clear singleton reference
        this.panel.onDidDispose(
            () => {
                ClusterManagerWebview.currentPanel = undefined;
            },
            null,
            []
        );

        // Store this instance as the current panel
        ClusterManagerWebview.currentPanel = this;
    }

    /**
     * Handle messages received from the webview.
     * 
     * @param message - The message received from the webview
     */
    private async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            if (message.type === 'getClusters') {
                await this.handleGetClusters();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error handling webview message:', errorMessage);
        }
    }

    /**
     * Handle getClusters message by sending initialize message with cluster data.
     */
    private async handleGetClusters(): Promise<void> {
        try {
            // Parse kubeconfig
            const kubeconfig = await KubeconfigParser.parseKubeconfig();

            // Get customizations
            const customizations = await this.customizationService.getConfiguration();

            // Get current theme
            const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
                ? 'dark'
                : 'light';

            // Format clusters array
            const clusters = this.formatClusters(kubeconfig);

            // Send initialize message
            const initializeMessage: InitializeMessage = {
                type: 'initialize',
                data: {
                    clusters,
                    customizations,
                    theme
                }
            };

            this.panel.webview.postMessage(initializeMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error getting clusters:', errorMessage);
            
            // Send initialize message with empty data on error
            const initializeMessage: InitializeMessage = {
                type: 'initialize',
                data: {
                    clusters: [],
                    customizations: {
                        version: '1.0',
                        folders: [],
                        clusters: {}
                    },
                    theme: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
                        ? 'dark'
                        : 'light'
                }
            };
            this.panel.webview.postMessage(initializeMessage);
        }
    }

    /**
     * Format clusters from ParsedKubeconfig to the required format.
     * 
     * @param kubeconfig - The parsed kubeconfig
     * @returns Formatted clusters array
     */
    private formatClusters(kubeconfig: ParsedKubeconfig): Array<{
        contextName: string;
        clusterName: string;
        clusterServer: string;
        isActive: boolean;
    }> {
        return kubeconfig.contexts.map(context => {
            // Find the corresponding cluster data
            const cluster = kubeconfig.clusters.find(c => c.name === context.cluster);
            
            // Skip if cluster data is missing (invalid kubeconfig)
            if (!cluster) {
                console.warn(`Context ${context.name} references non-existent cluster ${context.cluster}`);
                return null;
            }

            return {
                contextName: context.name,
                clusterName: cluster.name,
                clusterServer: cluster.server,
                isActive: context.name === kubeconfig.currentContext
            };
        }).filter((item): item is {
            contextName: string;
            clusterName: string;
            clusterServer: string;
            isActive: boolean;
        } => item !== null);
    }

    /**
     * Generate the HTML content for the Cluster Manager webview.
     * Loads the React bundle and sets up the webview.
     * 
     * @param webview - The webview instance
     * @param extensionUri - The extension URI for loading resources
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // Get the URI for the React bundle
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'cluster-manager', 'index.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';">
    <title>Cluster Manager</title>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

