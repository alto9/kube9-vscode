import * as vscode from 'vscode';
import { ArgoCDService } from '../services/ArgoCDService';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';
import { ArgoCDNotFoundError, ArgoCDPermissionError } from '../types/argocd';
import type { ApplicationKey, ApplicationResourceGraph, TopologySource } from '../types/applicationResourceGraph';
import { buildApplicationResourceGraph, logAssemblyWarnings, type OperatorResourceTreeMemo } from '../services/ApplicationResourceGraphBuilder';
import {
    buildCrdFlatApplicationResourceGraph,
    hasSkippedInvalidResourceRows
} from '../services/ApplicationResourceGraphAssembler';
import { mergeApplicationResourceGraphSnapshots } from '../services/ApplicationResourceGraphMerger';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';
import { OPERATION_TIMEOUT } from '../types/argocd';
import {
    buildResourceGraphMessage,
    isWebviewMessage,
    type ExtensionToWebviewMessage,
    type OperationPhase,
    type ResourceActionWebviewMessage,
    type WebviewToExtensionMessage
} from '../types/argocdWebviewProtocol';
import {
    dispatchResourceAction,
    NAVIGATE_TREE_SUPPORTED_KINDS
} from '../services/KindCapabilityRegistry';
import { revealApplicationInTree, revealManagedResourceInTree } from '../services/treeRevealHelper';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getWebviewHeaderStyleUri } from './webviewHeaderStyles';
import { getCodiconsStyleUri } from './webviewShellHtml';

/**
 * Information stored with each webview panel.
 */
interface PanelInfo {
    /** The webview panel */
    panel: vscode.WebviewPanel;
    /** Application name */
    applicationName: string;
    /** Application namespace */
    namespace: string;
    /** Kubernetes context */
    context: string;
    /** Extension context for host-only services (REST auth, secrets) */
    extensionContext: vscode.ExtensionContext;
    /** Previous graph snapshot for merge-on-refresh */
    lastGraph?: ApplicationResourceGraph;
    /** Cancels in-flight operation polling for this panel */
    operationCancellation?: vscode.CancellationTokenSource;
    /** Cancels in-flight operator resource-tree fetch for this panel */
    graphFetchCancellation?: vscode.CancellationTokenSource;
    /** Optional memo for operator resource-tree payloads for this panel session */
    operatorTreeMemo?: OperatorResourceTreeMemo;
    /** True while sync or refresh polling is active */
    operationInProgress?: boolean;
    /** Application spec.destination.namespace from the last loaded snapshot. */
    destinationNamespace?: string;
}

/**
 * ArgoCDApplicationWebviewProvider manages webview panels for ArgoCD Applications.
 * Creates panels, loads application data, and handles message communication.
 */
export class ArgoCDApplicationWebviewProvider {
    /**
     * Map of open webview panels keyed by "context:namespace:name".
     * Allows reusing existing panels when the same application is opened again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();

    /**
     * Show the ArgoCD application webview for a specific application.
     * Creates a new panel or reuses an existing one.
     * 
     * @param extensionContext The VS Code extension context
     * @param argoCDService The ArgoCD service instance
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the ArgoCD application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     */
    public static async showApplication(
        extensionContext: vscode.ExtensionContext,
        argoCDService: ArgoCDService,
        treeProvider: ClusterTreeProvider,
        applicationName: string,
        namespace: string,
        context: string
    ): Promise<void> {
        // Create a unique key for this application panel
        const panelKey = `${context}:${namespace}:${applicationName}`;

        // If we already have a panel for this application, reveal it
        const existingPanelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            // Reload data in case it changed
            await ArgoCDApplicationWebviewProvider.loadApplicationData(
                argoCDService,
                applicationName,
                namespace,
                context,
                existingPanelInfo.panel
            );
            return;
        }

        // Create title for the panel
        const title = `ArgoCD: ${applicationName}`;

        // Create a new webview panel
        notifyMajorWebviewOpened('argocd_application');
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionContext.extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionContext.extensionUri, 'out')
                ]
            }
        );

        // Store the panel and its context
        ArgoCDApplicationWebviewProvider.openPanels.set(panelKey, {
            panel,
            applicationName,
            namespace,
            context,
            extensionContext
        });

        // Set the webview's HTML content
        panel.webview.html = ArgoCDApplicationWebviewProvider.getWebviewContent(
            panel.webview,
            extensionContext
        );

        // Load application data
        await ArgoCDApplicationWebviewProvider.loadApplicationData(
            argoCDService,
            applicationName,
            namespace,
            context,
            panel
        );

        // Set up message handlers
        ArgoCDApplicationWebviewProvider.setupMessageHandlers(
            panel,
            argoCDService,
            treeProvider,
            applicationName,
            namespace,
            context,
            extensionContext
        );

        try {
            const helpHandler = new WebviewHelpHandler(getHelpController());
            helpHandler.setupHelpMessageHandler(panel.webview);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(
                `[kube9] Argo CD application help handler not registered: ${message}`
            );
        }

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                ArgoCDApplicationWebviewProvider.cancelPanelOperation(panelKey);
                ArgoCDApplicationWebviewProvider.cancelGraphFetch(panelKey);
                const disposedPanelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
                if (disposedPanelInfo) {
                    disposedPanelInfo.operatorTreeMemo = undefined;
                }
                ArgoCDApplicationWebviewProvider.openPanels.delete(panelKey);
            },
            null,
            extensionContext.subscriptions
        );
    }

    /**
     * Generate the HTML content for the ArgoCD application webview.
     * Loads React bundle from media directory and includes CSS styles.
     * 
     * @param webview The webview instance
     * @param extensionContext The extension context for resolving URIs
     * @returns HTML content string
     */
    private static getWebviewContent(
        webview: vscode.Webview,
        extensionContext: vscode.ExtensionContext
    ): string {
        // Get the webview URI for CSP
        const cspSource = webview.cspSource;

        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'argocd-application', 'main.js')
        );

        const headerStyleUri = getWebviewHeaderStyleUri(extensionContext.extensionUri, webview);
        const codiconsStyleUri = getCodiconsStyleUri(extensionContext.extensionUri, webview);

        const reactFlowStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'argocd-application', 'style.css')
        );

        const applicationStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'argocd-application', 'styles.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource};">
    <link href="${codiconsStyleUri}" rel="stylesheet">
    <link href="${headerStyleUri}" rel="stylesheet">
    <link href="${reactFlowStyleUri}" rel="stylesheet">
    <link href="${applicationStyleUri}" rel="stylesheet">
    <title>ArgoCD Application</title>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    private static async postApplicationSnapshot(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel,
        application?: Awaited<ReturnType<ArgoCDService['getApplication']>>
    ): Promise<void> {
        const resolvedApplication =
            application ??
            (await argoCDService.getApplication(applicationName, namespace, context));

        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo) {
            panelInfo.destinationNamespace = resolvedApplication.destination.namespace ?? '';
        }

        panel.webview.postMessage({
            type: 'applicationData',
            data: resolvedApplication
        } satisfies ExtensionToWebviewMessage);

        await ArgoCDApplicationWebviewProvider.rebuildAndPostResourceGraph(
            argoCDService,
            applicationName,
            namespace,
            context,
            panel,
            { application: resolvedApplication, invalidateOperatorTreeMemo: true }
        );
    }

    /**
     * Load application data from ArgoCDService and send it to the webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async loadApplicationData(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        try {
            await ArgoCDApplicationWebviewProvider.postApplicationSnapshot(
                argoCDService,
                applicationName,
                namespace,
                context,
                panel
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            let userFriendlyMessage = errorMessage;
            
            // Handle specific error types with user-friendly messages
            if (error instanceof ArgoCDNotFoundError) {
                userFriendlyMessage = `Application not found: ${applicationName} in namespace ${namespace}. It may have been deleted.`;
                vscode.window.showErrorMessage(userFriendlyMessage);
            } else if (error instanceof ArgoCDPermissionError) {
                userFriendlyMessage = `Permission denied: Cannot access ArgoCD Application ${applicationName}. Check your RBAC permissions.`;
                vscode.window.showErrorMessage(userFriendlyMessage);
            } else if (error instanceof KubectlError) {
                // Handle kubectl-specific errors
                switch (error.type) {
                    case KubectlErrorType.PermissionDenied:
                        userFriendlyMessage = `Permission denied: Cannot access cluster '${context}'. Check your credentials and RBAC permissions.`;
                        vscode.window.showErrorMessage(userFriendlyMessage);
                        break;
                    case KubectlErrorType.ConnectionFailed:
                        userFriendlyMessage = `Cannot connect to cluster '${context}'. The cluster may be unreachable or down.`;
                        vscode.window.showWarningMessage(userFriendlyMessage);
                        break;
                    case KubectlErrorType.Timeout:
                        userFriendlyMessage = `Connection to cluster '${context}' timed out. The cluster may be slow to respond.`;
                        vscode.window.showWarningMessage(userFriendlyMessage);
                        break;
                    case KubectlErrorType.BinaryNotFound:
                        userFriendlyMessage = `kubectl is not installed or not in PATH. Please install kubectl to manage Kubernetes clusters.`;
                        vscode.window.showErrorMessage(userFriendlyMessage);
                        break;
                    default:
                        userFriendlyMessage = `Failed to load ArgoCD Application: ${error.getUserMessage()}`;
                        vscode.window.showErrorMessage(userFriendlyMessage);
                        break;
                }
            } else {
                // Generic error handling
                userFriendlyMessage = `Failed to load ArgoCD Application: ${errorMessage}`;
                vscode.window.showErrorMessage(userFriendlyMessage);
            }
            
            // Send error to webview (ErrorState component will display it)
            panel.webview.postMessage({
                type: 'error',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
        }
    }

    /**
     * Post a resource graph snapshot to the webview.
     */
    public static postResourceGraph(
        panel: vscode.WebviewPanel,
        graph: ApplicationResourceGraph,
        meta: {
            topologySource: TopologySource;
            refreshedAt: string;
            truncated?: boolean;
            totalManagedCount?: number;
            skippedInvalidResourceRows?: boolean;
        }
    ): void {
        panel.webview.postMessage(
            buildResourceGraphMessage({
                graph,
                topologySource: meta.topologySource,
                refreshedAt: meta.refreshedAt,
                truncated: meta.truncated,
                totalManagedCount: meta.totalManagedCount,
                skippedInvalidResourceRows: meta.skippedInvalidResourceRows
            })
        );
    }

    private static panelKey(context: string, namespace: string, applicationName: string): string {
        return `${context}:${namespace}:${applicationName}`;
    }

    private static applicationKey(
        context: string,
        namespace: string,
        applicationName: string
    ): ApplicationKey {
        return { context, namespace, name: applicationName };
    }

    private static cancelPanelOperation(panelKey: string): void {
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo?.operationCancellation) {
            panelInfo.operationCancellation.cancel();
            panelInfo.operationCancellation.dispose();
            panelInfo.operationCancellation = undefined;
        }
        if (panelInfo) {
            panelInfo.operationInProgress = false;
        }
    }

    private static cancelGraphFetch(panelKey: string): void {
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo?.graphFetchCancellation) {
            panelInfo.graphFetchCancellation.cancel();
            panelInfo.graphFetchCancellation.dispose();
            panelInfo.graphFetchCancellation = undefined;
        }
    }

    private static beginGraphFetch(panelKey: string): vscode.CancellationToken {
        ArgoCDApplicationWebviewProvider.cancelGraphFetch(panelKey);
        const source = new vscode.CancellationTokenSource();
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo) {
            panelInfo.graphFetchCancellation = source;
        }
        return source.token;
    }

    private static endGraphFetch(panelKey: string): void {
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo?.graphFetchCancellation) {
            panelInfo.graphFetchCancellation.dispose();
            panelInfo.graphFetchCancellation = undefined;
        }
    }

    private static beginPanelOperation(panelKey: string): vscode.CancellationToken {
        ArgoCDApplicationWebviewProvider.cancelPanelOperation(panelKey);
        const source = new vscode.CancellationTokenSource();
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo) {
            panelInfo.operationCancellation = source;
            panelInfo.operationInProgress = true;
        }
        return source.token;
    }

    private static endPanelOperation(panelKey: string): void {
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (panelInfo?.operationCancellation) {
            panelInfo.operationCancellation.dispose();
            panelInfo.operationCancellation = undefined;
        }
        if (panelInfo) {
            panelInfo.operationInProgress = false;
        }
    }

    private static postOperationProgress(
        panel: vscode.WebviewPanel,
        phase: OperationPhase,
        message?: string
    ): void {
        panel.webview.postMessage({
            type: 'operationProgress',
            phase,
            ...(message !== undefined ? { message } : {})
        } satisfies ExtensionToWebviewMessage);
    }

    private static async reloadApplicationAfterTerminalOperation(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        argoCDService.invalidateCache(context);
        await ArgoCDApplicationWebviewProvider.postApplicationSnapshot(
            argoCDService,
            applicationName,
            namespace,
            context,
            panel
        );
    }

    private static formatOperationErrorMessage(
        error: unknown,
        applicationName: string,
        namespace: string,
        context: string,
        operationLabel: string
    ): string {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof ArgoCDNotFoundError) {
            return `Application not found: ${applicationName} in namespace ${namespace}. It may have been deleted.`;
        }
        if (error instanceof ArgoCDPermissionError) {
            return `Permission denied: Cannot ${operationLabel.toLowerCase()} application ${applicationName}. Check your RBAC permissions.`;
        }
        if (error instanceof KubectlError) {
            switch (error.type) {
                case KubectlErrorType.PermissionDenied:
                    return `Permission denied: Cannot ${operationLabel.toLowerCase()} application ${applicationName}. Check your RBAC permissions.`;
                case KubectlErrorType.ConnectionFailed:
                    return `Cannot connect to cluster '${context}'. The cluster may be unreachable.`;
                case KubectlErrorType.Timeout:
                    return `Connection to cluster '${context}' timed out. Please try again.`;
                default:
                    return `${operationLabel} failed: ${error.getUserMessage()}`;
            }
        }

        return errorMessage;
    }

    private static showOperationFailureNotification(
        error: unknown,
        userFriendlyMessage: string,
        operationLabel: string
    ): void {
        if (
            error instanceof KubectlError &&
            (error.type === KubectlErrorType.ConnectionFailed || error.type === KubectlErrorType.Timeout)
        ) {
            vscode.window.showWarningMessage(`${operationLabel} failed: ${userFriendlyMessage}`);
            return;
        }

        vscode.window.showErrorMessage(`${operationLabel} failed: ${userFriendlyMessage}`);
    }

    private static async runTrackOperation(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel,
        cancellationToken: vscode.CancellationToken,
        operationLabel: string
    ): Promise<'success' | 'failure' | 'cancelled'> {
        try {
            const result = await argoCDService.trackOperation(
                applicationName,
                namespace,
                context,
                OPERATION_TIMEOUT,
                (phase, message) => {
                    const webviewPhase: OperationPhase =
                        phase === 'Terminating' ? 'Running' : phase;
                    ArgoCDApplicationWebviewProvider.postOperationProgress(
                        panel,
                        webviewPhase,
                        message
                    );
                },
                cancellationToken
            );

            if (result.success) {
                await ArgoCDApplicationWebviewProvider.reloadApplicationAfterTerminalOperation(
                    argoCDService,
                    applicationName,
                    namespace,
                    context,
                    panel
                );
                return 'success';
            }

            const failureMessage = result.message || `${operationLabel} failed`;
            panel.webview.postMessage({
                type: 'error',
                message: failureMessage
            } satisfies ExtensionToWebviewMessage);
            vscode.window.showErrorMessage(`${operationLabel} failed: ${failureMessage}`);
            return 'failure';
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return 'cancelled';
            }

            const userFriendlyMessage = ArgoCDApplicationWebviewProvider.formatOperationErrorMessage(
                error,
                applicationName,
                namespace,
                context,
                operationLabel
            );
            ArgoCDApplicationWebviewProvider.postOperationProgress(
                panel,
                'Error',
                userFriendlyMessage
            );
            panel.webview.postMessage({
                type: 'error',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
            ArgoCDApplicationWebviewProvider.showOperationFailureNotification(
                error,
                userFriendlyMessage,
                operationLabel
            );
            return 'failure';
        }
    }

    private static formatGraphRebuildErrorMessage(
        error: unknown,
        applicationName: string,
        namespace: string,
        context: string
    ): string {
        return ArgoCDApplicationWebviewProvider.formatOperationErrorMessage(
            error,
            applicationName,
            namespace,
            context,
            'Resource graph rebuild'
        );
    }

    /**
     * Rebuild the resource graph from Application CRD data and post it to the webview.
     */
    private static async rebuildAndPostResourceGraph(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel,
        options?: {
            bypassCache?: boolean;
            application?: Awaited<ReturnType<ArgoCDService['getApplication']>>;
            invalidateOperatorTreeMemo?: boolean;
        }
    ): Promise<void> {
        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        const extensionContext = panelInfo?.extensionContext;

        if (options?.invalidateOperatorTreeMemo && panelInfo) {
            panelInfo.operatorTreeMemo = undefined;
        }

        const graphFetchToken = ArgoCDApplicationWebviewProvider.beginGraphFetch(panelKey);

        try {
            if (options?.bypassCache) {
                argoCDService.invalidateCache(context);
                if (panelInfo) {
                    panelInfo.operatorTreeMemo = undefined;
                }
            }

            const application =
                options?.application ??
                (await argoCDService.getApplication(applicationName, namespace, context));

            const applicationKey = ArgoCDApplicationWebviewProvider.applicationKey(
                context,
                namespace,
                applicationName
            );

            let incoming;
            let topologySource: TopologySource;
            let skippedInvalidResourceRows = false;

            if (extensionContext) {
                const built = await buildApplicationResourceGraph(
                    {
                        application,
                        applicationKey,
                        argoCDService,
                        extensionContext,
                        options: {
                            cancellationToken: graphFetchToken,
                            bypassOperatorCache: options?.bypassCache === true,
                            operatorTreeMemo: panelInfo?.operatorTreeMemo ?? null,
                            onOperatorTreeMemoUpdate: (memo) => {
                                if (panelInfo) {
                                    panelInfo.operatorTreeMemo = memo;
                                }
                            }
                        }
                    }
                );
                incoming = built.graph;
                topologySource = built.topologySource;
                skippedInvalidResourceRows = built.skippedInvalidResourceRows;
            } else {
                const built = buildCrdFlatApplicationResourceGraph({
                    application,
                    applicationKey
                });
                logAssemblyWarnings('crd_flat graph assembly', built.assemblyWarnings);
                incoming = built.graph;
                topologySource = 'crd_flat';
                skippedInvalidResourceRows = hasSkippedInvalidResourceRows(built.assemblyWarnings);
            }

            const { graph } = mergeApplicationResourceGraphSnapshots(panelInfo?.lastGraph, incoming);

            if (panelInfo) {
                panelInfo.lastGraph = graph;
            }

            ArgoCDApplicationWebviewProvider.postResourceGraph(panel, graph, {
                topologySource,
                refreshedAt: new Date().toISOString(),
                truncated: graph.truncated,
                skippedInvalidResourceRows
            });
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return;
            }

            const userFriendlyMessage = ArgoCDApplicationWebviewProvider.formatGraphRebuildErrorMessage(
                error,
                applicationName,
                namespace,
                context
            );
            console.warn(
                `Failed to rebuild resource graph for ${applicationName} in ${namespace} (${context}): ${userFriendlyMessage}`
            );

            const priorGraph = panelInfo?.lastGraph;
            if (priorGraph) {
                panel.webview.postMessage({
                    type: 'graphDegradation',
                    message: userFriendlyMessage
                } satisfies ExtensionToWebviewMessage);
                return;
            }

            panel.webview.postMessage({
                type: 'graphError',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
        } finally {
            ArgoCDApplicationWebviewProvider.endGraphFetch(panelKey);
        }
    }

    /**
     * Set up message handlers for webview communication.
     * 
     * @param panel The webview panel
     * @param argoCDService The ArgoCD service instance
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param extensionContext The VS Code extension context
     */
    private static setupMessageHandlers(
        panel: vscode.WebviewPanel,
        argoCDService: ArgoCDService,
        treeProvider: ClusterTreeProvider,
        applicationName: string,
        namespace: string,
        context: string,
        extensionContext: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (rawMessage: unknown) => {
                if (!isWebviewMessage(rawMessage)) {
                    console.warn('Ignoring invalid ArgoCD webview message:', rawMessage);
                    return;
                }

                const message: WebviewToExtensionMessage = rawMessage;

                switch (message.type) {
                    case 'sync':
                        await ArgoCDApplicationWebviewProvider.handleSync(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'refresh':
                        await ArgoCDApplicationWebviewProvider.handleRefresh(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'hardRefresh':
                        await ArgoCDApplicationWebviewProvider.handleHardRefresh(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'viewInTree':
                        await ArgoCDApplicationWebviewProvider.handleViewInTree(
                            treeProvider,
                            applicationName,
                            namespace,
                            context
                        );
                        break;
                    
                    case 'navigateToResource':
                        await ArgoCDApplicationWebviewProvider.handleNavigateToResource(
                            treeProvider,
                            context,
                            message.kind,
                            message.name,
                            message.namespace,
                            ArgoCDApplicationWebviewProvider.openPanels.get(
                                ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName)
                            )?.destinationNamespace
                        );
                        break;

                    case 'graphRefresh':
                        await ArgoCDApplicationWebviewProvider.rebuildAndPostResourceGraph(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel,
                            { bypassCache: message.bypassCache }
                        );
                        break;

                    case 'resourceAction':
                        await ArgoCDApplicationWebviewProvider.handleResourceAction(
                            panel,
                            treeProvider,
                            context,
                            message,
                            ArgoCDApplicationWebviewProvider.openPanels.get(
                                ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName)
                            )?.destinationNamespace
                        );
                        break;
                    
                    case 'ready':
                        // Webview is ready, data will be loaded automatically
                        console.log('ArgoCD application webview ready');
                        break;
                }
            },
            null,
            extensionContext.subscriptions
        );
    }

    /**
     * Handle sync action from webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async handleSync(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);

        if (panelInfo?.operationInProgress) {
            panel.webview.postMessage({
                type: 'error',
                message: 'A sync operation is already in progress.'
            } satisfies ExtensionToWebviewMessage);
            return;
        }

        ArgoCDApplicationWebviewProvider.postOperationProgress(
            panel,
            'Running',
            'Syncing application...'
        );
        const cancellationToken = ArgoCDApplicationWebviewProvider.beginPanelOperation(panelKey);

        try {
            await argoCDService.syncApplication(applicationName, namespace, context);

            const outcome = await ArgoCDApplicationWebviewProvider.runTrackOperation(
                argoCDService,
                applicationName,
                namespace,
                context,
                panel,
                cancellationToken,
                'Sync'
            );

            if (outcome === 'success') {
                vscode.window.showInformationMessage(
                    `Successfully synced ArgoCD Application: ${applicationName}`
                );
            }
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return;
            }

            const userFriendlyMessage = ArgoCDApplicationWebviewProvider.formatOperationErrorMessage(
                error,
                applicationName,
                namespace,
                context,
                'Sync'
            );

            ArgoCDApplicationWebviewProvider.postOperationProgress(
                panel,
                'Error',
                userFriendlyMessage
            );
            panel.webview.postMessage({
                type: 'error',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
            ArgoCDApplicationWebviewProvider.showOperationFailureNotification(
                error,
                userFriendlyMessage,
                'Sync'
            );
        } finally {
            ArgoCDApplicationWebviewProvider.endPanelOperation(panelKey);
        }
    }

    /**
     * Dispatch resource graph tile actions through the kind capability registry.
     */
    private static async handleResourceAction(
        panel: vscode.WebviewPanel,
        treeProvider: ClusterTreeProvider,
        context: string,
        message: ResourceActionWebviewMessage,
        destinationNamespace?: string
    ): Promise<void> {
        await dispatchResourceAction(
            {
                panel,
                treeProvider,
                context,
                kubeconfigPath: treeProvider.getKubeconfigPath() ?? '',
                destinationNamespace
            },
            message
        );
    }

    /**
     * Handle refresh action from webview.
     *
     * Refresh patches the Application CRD like sync. When the CRD still reports
     * `lastOperation.phase` as Running or Terminating, poll until terminal; otherwise
     * a single reload is sufficient.
     */
    private static async handleRefresh(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);

        try {
            await argoCDService.refreshApplication(applicationName, namespace, context);
            argoCDService.invalidateCache(context);

            const application = await argoCDService.getApplication(applicationName, namespace, context);
            const phase = application.lastOperation?.phase;
            const needsTracking = phase === 'Running' || phase === 'Terminating';

            if (!needsTracking) {
                await ArgoCDApplicationWebviewProvider.postApplicationSnapshot(
                    argoCDService,
                    applicationName,
                    namespace,
                    context,
                    panel,
                    application
                );
                vscode.window.showInformationMessage(
                    `Successfully refreshed ArgoCD Application: ${applicationName}`
                );
                return;
            }

            const cancellationToken = ArgoCDApplicationWebviewProvider.beginPanelOperation(panelKey);
            try {
                const outcome = await ArgoCDApplicationWebviewProvider.runTrackOperation(
                    argoCDService,
                    applicationName,
                    namespace,
                    context,
                    panel,
                    cancellationToken,
                    'Refresh'
                );

                if (outcome === 'success') {
                    vscode.window.showInformationMessage(
                        `Successfully refreshed ArgoCD Application: ${applicationName}`
                    );
                }
            } finally {
                ArgoCDApplicationWebviewProvider.endPanelOperation(panelKey);
            }
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return;
            }

            const userFriendlyMessage = ArgoCDApplicationWebviewProvider.formatOperationErrorMessage(
                error,
                applicationName,
                namespace,
                context,
                'Refresh'
            );

            panel.webview.postMessage({
                type: 'error',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
            ArgoCDApplicationWebviewProvider.showOperationFailureNotification(
                error,
                userFriendlyMessage,
                'Refresh'
            );
        }
    }

    /**
     * Handle hard refresh action from webview.
     *
     * Uses the same post-patch polling rules as refresh when an operation is still active.
     */
    private static async handleHardRefresh(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);

        const confirm = await vscode.window.showWarningMessage(
            `Hard refresh will clear cache and may take longer. Continue for ${applicationName}?`,
            'Continue',
            'Cancel'
        );

        if (confirm !== 'Continue') {
            return;
        }

        try {
            await argoCDService.hardRefreshApplication(applicationName, namespace, context);
            argoCDService.invalidateCache(context);

            const application = await argoCDService.getApplication(applicationName, namespace, context);
            const phase = application.lastOperation?.phase;
            const needsTracking = phase === 'Running' || phase === 'Terminating';

            if (!needsTracking) {
                await ArgoCDApplicationWebviewProvider.postApplicationSnapshot(
                    argoCDService,
                    applicationName,
                    namespace,
                    context,
                    panel,
                    application
                );
                vscode.window.showInformationMessage(
                    `Successfully hard refreshed ArgoCD Application: ${applicationName}`
                );
                return;
            }

            const cancellationToken = ArgoCDApplicationWebviewProvider.beginPanelOperation(panelKey);
            try {
                const outcome = await ArgoCDApplicationWebviewProvider.runTrackOperation(
                    argoCDService,
                    applicationName,
                    namespace,
                    context,
                    panel,
                    cancellationToken,
                    'Hard refresh'
                );

                if (outcome === 'success') {
                    vscode.window.showInformationMessage(
                        `Successfully hard refreshed ArgoCD Application: ${applicationName}`
                    );
                }
            } finally {
                ArgoCDApplicationWebviewProvider.endPanelOperation(panelKey);
            }
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return;
            }

            const userFriendlyMessage = ArgoCDApplicationWebviewProvider.formatOperationErrorMessage(
                error,
                applicationName,
                namespace,
                context,
                'Hard refresh'
            );

            panel.webview.postMessage({
                type: 'error',
                message: userFriendlyMessage
            } satisfies ExtensionToWebviewMessage);
            ArgoCDApplicationWebviewProvider.showOperationFailureNotification(
                error,
                userFriendlyMessage,
                'Hard refresh'
            );
        }
    }

    /**
     * Handle view in tree action from webview.
     * Focuses the tree view and reveals the open Argo CD Application.
     */
    private static async handleViewInTree(
        treeProvider: ClusterTreeProvider,
        applicationName: string,
        applicationNamespace: string,
        panelContext: string
    ): Promise<void> {
        const contextMatches = await treeProvider.isCurrentContext(panelContext);
        if (!contextMatches) {
            vscode.window.showWarningMessage(
                `Cannot reveal ${applicationName} in tree: active cluster context does not match this application`
            );
            return;
        }

        try {
            const result = await revealApplicationInTree(
                treeProvider,
                applicationName,
                applicationNamespace
            );

            if (result.success) {
                return;
            }

            if (result.treeUnavailable) {
                vscode.window.showErrorMessage(
                    'Cannot reveal application in tree: cluster tree is unavailable'
                );
                return;
            }

            if (result.notFound) {
                vscode.window.showWarningMessage(
                    `Argo CD Application "${applicationName}" was not found in the cluster tree`
                );
                return;
            }

            vscode.window.showErrorMessage(
                `Failed to view in tree: ${result.error ?? 'unknown error'}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to view in tree: ${errorMessage}`);
        }
    }

    /**
     * Handle navigate to resource action from the Details tab.
     * Delegates to the shared tree reveal helper for supported kinds.
     */
    private static async handleNavigateToResource(
        treeProvider: ClusterTreeProvider,
        panelContext: string,
        kind: string,
        name: string,
        namespace: string,
        destinationNamespace?: string
    ): Promise<void> {
        if (!NAVIGATE_TREE_SUPPORTED_KINDS.has(kind)) {
            vscode.window.showErrorMessage(
                `Navigate to tree is not supported for kind ${kind}`
            );
            return;
        }

        const result = await revealManagedResourceInTree(
            { treeProvider, panelContext },
            kind,
            name,
            namespace,
            { destinationNamespace }
        );

        if (result.success) {
            return;
        }

        if (result.reason === 'tree_unavailable' || result.reason === 'context_mismatch') {
            vscode.window.showWarningMessage(result.message ?? `Failed to navigate to ${kind} ${name}`);
            return;
        }

        if (result.reason === 'not_found') {
            vscode.window.showWarningMessage(result.message ?? `Failed to navigate to ${kind} ${name}`);
            return;
        }

        vscode.window.showErrorMessage(
            result.message ?? `Failed to navigate to resource: ${result.detail ?? 'unknown error'}`
        );
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
}

