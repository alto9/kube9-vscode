import * as vscode from 'vscode';
import { ArgoCDService } from '../services/ArgoCDService';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';
import { ArgoCDNotFoundError, ArgoCDPermissionError } from '../types/argocd';
import type { ApplicationKey, ApplicationResourceGraph, TopologySource } from '../types/applicationResourceGraph';
import { buildApplicationResourceGraph } from '../services/ApplicationResourceGraphBuilder';
import { buildCrdFlatApplicationResourceGraph } from '../services/ApplicationResourceGraphAssembler';
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
import { dispatchResourceAction } from '../services/KindCapabilityRegistry';
import { getWebviewHeaderStyleUri } from './webviewHeaderStyles';

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
    /** True while sync or refresh polling is active */
    operationInProgress?: boolean;
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

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                ArgoCDApplicationWebviewProvider.cancelPanelOperation(panelKey);
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">
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
            { application: resolvedApplication }
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
        }
    ): void {
        panel.webview.postMessage(
            buildResourceGraphMessage({
                graph,
                topologySource: meta.topologySource,
                refreshedAt: meta.refreshedAt,
                truncated: meta.truncated,
                totalManagedCount: meta.totalManagedCount
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
        options?: { bypassCache?: boolean; application?: Awaited<ReturnType<ArgoCDService['getApplication']>> }
    ): Promise<void> {
        const panelKey = ArgoCDApplicationWebviewProvider.panelKey(context, namespace, applicationName);
        const panelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        const extensionContext = panelInfo?.extensionContext;

        try {
            if (options?.bypassCache) {
                argoCDService.invalidateCache(context);
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

            if (extensionContext) {
                const built = await buildApplicationResourceGraph({
                    application,
                    applicationKey,
                    argoCDService,
                    extensionContext
                });
                incoming = built.graph;
                topologySource = built.topologySource;
            } else {
                const built = buildCrdFlatApplicationResourceGraph({
                    application,
                    applicationKey
                });
                incoming = built.graph;
                topologySource = 'crd_flat';
            }

            const { graph } = mergeApplicationResourceGraphSnapshots(panelInfo?.lastGraph, incoming);

            if (panelInfo) {
                panelInfo.lastGraph = graph;
            }

            ArgoCDApplicationWebviewProvider.postResourceGraph(panel, graph, {
                topologySource,
                refreshedAt: new Date().toISOString(),
                truncated: graph.truncated
            });
        } catch (error) {
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
                            applicationName
                        );
                        break;
                    
                    case 'navigateToResource':
                        await ArgoCDApplicationWebviewProvider.handleNavigateToResource(
                            treeProvider,
                            message.kind,
                            message.name,
                            message.namespace
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
                            message
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
        message: ResourceActionWebviewMessage
    ): Promise<void> {
        await dispatchResourceAction(
            {
                panel,
                treeProvider,
                context,
                kubeconfigPath: treeProvider.getKubeconfigPath() ?? ''
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
     * Focuses the tree view and attempts to reveal the application.
     * 
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the application
     */
    private static async handleViewInTree(
        treeProvider: ClusterTreeProvider,
        applicationName: string
    ): Promise<void> {
        try {
            // Focus tree view
            await vscode.commands.executeCommand('kube9.treeView.focus');

            // Refresh tree to ensure ArgoCD applications are loaded
            treeProvider.refresh();

            // Note: revealApplication method may not exist yet, so we just refresh
            // This can be enhanced when tree provider methods are available
            vscode.window.showInformationMessage(
                `Tree view focused. Look for ArgoCD Application: ${applicationName}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to view in tree: ${errorMessage}`);
        }
    }

    /**
     * Handle navigate to resource action from webview.
     * Focuses the tree view and attempts to reveal the resource.
     * 
     * @param treeProvider The cluster tree provider instance
     * @param kind The resource kind
     * @param name The resource name
     * @param namespace The resource namespace
     */
    private static async handleNavigateToResource(
        treeProvider: ClusterTreeProvider,
        kind: string,
        name: string,
        namespace: string
    ): Promise<void> {
        try {
            // Focus tree view
            await vscode.commands.executeCommand('kube9.treeView.focus');

            // Refresh tree to ensure resources are loaded
            treeProvider.refresh();

            // Note: revealResource method may not exist yet, so we just refresh
            // This can be enhanced when tree provider methods are available
            vscode.window.showInformationMessage(
                `Tree view focused. Look for ${kind} ${name} in namespace ${namespace}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to navigate to resource: ${errorMessage}`);
        }
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

