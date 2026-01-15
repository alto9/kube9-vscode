import * as vscode from 'vscode';
import { IconProvider } from './IconProvider';
import { GlobalState } from '../state/GlobalState';

/**
 * TutorialWebview displays the getting started tutorial in a webview.
 * This is a fallback for Cursor which doesn't support VS Code walkthroughs.
 */
export class TutorialWebview {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show the tutorial webview panel.
     * Creates a new panel or reveals the existing one.
     * 
     * @param context - The VS Code extension context
     */
    public static show(context: vscode.ExtensionContext): void {
        // Store the extension context for later use
        TutorialWebview.extensionContext = context;

        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (TutorialWebview.currentPanel) {
            TutorialWebview.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Tutorial',
            'Kube9 Getting Started Tutorial',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media', 'walkthrough')
                ]
            }
        );

        TutorialWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = TutorialWebview.getWebviewContent(panel.webview, context);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('TutorialWebview received message:', message.command, message);
                switch (message.command) {
                    case 'executeCommand':
                        try {
                            const commandId = message.commandId;
                            console.log(`Executing command: ${commandId}`);
                            
                            // Some commands require parameters - handle them gracefully
                            if (commandId === 'kube9.viewPodLogs' || commandId === 'kube9.scaleWorkload') {
                                // These commands require a treeItem parameter
                                vscode.window.showInformationMessage(
                                    `To use this feature, right-click a ${commandId === 'kube9.viewPodLogs' ? 'pod' : 'workload'} in the Kube9 tree view and select the option from the context menu.`
                                );
                                return;
                            }
                            
                            // For completeStep commands, handle walkthrough completion event errors gracefully
                            if (commandId === 'kube9.internal.completeStep3' || commandId === 'kube9.internal.completeStep4') {
                                try {
                                    // Execute the command
                                    await vscode.commands.executeCommand(commandId);
                                    console.log(`Command ${commandId} executed successfully`);
                                } catch (walkthroughError) {
                                    // The command might fail if walkthrough events aren't supported (Cursor)
                                    // But we still want to show the success message
                                    const walkthroughErrorMessage = walkthroughError instanceof Error ? walkthroughError.message : String(walkthroughError);
                                    console.warn(`Walkthrough completion event failed (non-critical): ${walkthroughErrorMessage}`);
                                    
                                    // Show the helpful message anyway
                                    if (commandId === 'kube9.internal.completeStep3') {
                                        vscode.window.showInformationMessage(
                                            'Great! When you connect a cluster, you can expand namespaces to explore resources.'
                                        );
                                    } else {
                                        vscode.window.showInformationMessage(
                                            'Connect a cluster to view resource details. Click any pod to see its current status, conditions, and events.'
                                        );
                                    }
                                }
                                return;
                            }
                            
                            // Execute the command
                            await vscode.commands.executeCommand(commandId);
                            console.log(`Command ${commandId} executed successfully`);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error(`Failed to execute command ${message.commandId}:`, errorMessage);
                            
                            // Provide helpful error messages
                            if (errorMessage.includes('command not found') || errorMessage.includes('Unknown command')) {
                                vscode.window.showWarningMessage(
                                    `Command "${message.commandId}" is not available. This feature may require additional setup.`
                                );
                            } else {
                                vscode.window.showErrorMessage(`Failed to execute command: ${errorMessage}`);
                            }
                        }
                        break;

                    case 'completeTutorial':
                        // Mark tutorial as complete
                        await context.globalState.update('kube9.tutorialCompleted', true);
                        await vscode.commands.executeCommand(
                            'setContext',
                            'kube9.tutorialCompleted',
                            true
                        );
                        // Save dismissal preference if checkbox was checked
                        if (message.doNotShowAgain) {
                            const globalState = GlobalState.getInstance();
                            await globalState.setWelcomeScreenDismissed(true);
                        }
                        vscode.window.showInformationMessage(
                            'Tutorial completed! You can replay it anytime from the Command Palette.'
                        );
                        panel.dispose();
                        break;

                    case 'dismiss': {
                        // Handle dismissal with checkbox state
                        const globalState = GlobalState.getInstance();
                        await globalState.setWelcomeScreenDismissed(message.doNotShowAgain);
                        panel.dispose();
                        break;
                    }

                    case 'openExternal':
                        // Open external URL
                        if (message.url && message.url.startsWith('https://')) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;

                    case 'close':
                        try {
                            panel.dispose();
                        } catch (error) {
                            console.error('Failed to close panel:', error);
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                TutorialWebview.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Generate the HTML content for the tutorial webview.
     * 
     * @param webview - The webview instance
     * @param context - The extension context
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const iconProvider = new IconProvider(context);
        const activityBarIcon = iconProvider.getKube9ActivityBarIcon();
        const iconHtml = activityBarIcon 
            ? `<img src="${activityBarIcon}" alt="Kube9 Icon" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px;" />`
            : '';
        const inlineIconHtml = activityBarIcon 
            ? `<img src="${activityBarIcon}" alt="Kube9 Icon" style="width: 18px; height: 18px; vertical-align: middle;" />`
            : '';

        // Get media file URIs
        const getMediaUri = (filename: string) => {
            return webview.asWebviewUri(
                vscode.Uri.joinPath(context.extensionUri, 'media', 'walkthrough', filename)
            );
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kube9 Getting Started Tutorial</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            line-height: 1.6;
        }

        .header {
            text-align: center;
            padding-bottom: 24px;
            border-bottom: 2px solid var(--vscode-widget-border);
        }

        .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 600;
        }

        .header p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .step {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 24px;
            margin-bottom: 24px;
            border-radius: 6px;
        }

        .step-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }

        .step-number {
            background: var(--vscode-focusBorder);
            color: var(--vscode-editor-background);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .step-title {
            font-size: 20px;
            font-weight: 600;
            margin: 0;
        }

        .step-description {
            margin: 16px 0;
            color: var(--vscode-foreground);
        }

        .step-description p {
            margin: 8px 0;
        }

        .step-image {
            max-width: 100%;
            border-radius: 4px;
            margin: 16px 0;
            border: 1px solid var(--vscode-widget-border);
        }

        .step-actions {
            margin-top: 16px;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-right: 8px;
            margin-top: 8px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 2px solid var(--vscode-widget-border);
        }

        .command-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            cursor: pointer;
        }

        .command-link:hover {
            text-decoration: underline;
        }

        .dont-show-container {
            padding: 16px 24px;
            margin-bottom: 24px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .dont-show-container label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            user-select: none;
        }

        .dont-show-container label:hover {
            color: var(--vscode-foreground);
        }

        .dont-show-container input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border: 1px solid var(--vscode-checkbox-border);
            background-color: var(--vscode-checkbox-background);
            border-radius: 3px;
            margin-right: 10px;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
            transition: background-color 0.1s ease, border-color 0.1s ease;
        }

        .dont-show-container input[type="checkbox"]:hover {
            border-color: var(--vscode-focusBorder);
        }

        .dont-show-container input[type="checkbox"]:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        .dont-show-container input[type="checkbox"]:checked {
            background-color: var(--vscode-checkbox-background);
            border-color: var(--vscode-focusBorder);
        }

        .dont-show-container input[type="checkbox"]:checked::before {
            content: "";
            position: absolute;
            left: 5px;
            top: 2px;
            width: 5px;
            height: 9px;
            border: solid var(--vscode-checkbox-foreground);
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        .section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 4px solid var(--vscode-focusBorder);
            padding: 28px;
            margin-bottom: 24px;
            border-radius: 6px;
        }

        .section h2 {
            margin-top: 0;
            margin-bottom: 16px;
            color: var(--vscode-foreground);
            font-size: 22px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            font-size: 24px;
            flex-shrink: 0;
        }

        .section p {
            margin: 12px 0;
            color: var(--vscode-foreground);
            font-size: 14px;
            line-height: 1.7;
        }

        .ecosystem-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }

        .ecosystem-card {
            background-color: var(--vscode-list-hoverBackground);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 16px;
            transition: all 0.2s ease;
        }

        .ecosystem-card:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
            transform: translateY(-2px);
        }

        .ecosystem-card h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .ecosystem-card p {
            margin: 0;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }

        .ecosystem-card a {
            display: inline-block;
            margin-top: 12px;
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
        }

        .ecosystem-card a:hover {
            color: var(--vscode-textLink-activeForeground);
            text-decoration: underline;
        }

        .steps {
            margin: 20px 0;
            padding-left: 28px;
            color: var(--vscode-foreground);
        }

        .steps li {
            margin: 12px 0;
            padding-left: 8px;
            line-height: 1.6;
        }

        .steps li::marker {
            color: var(--vscode-focusBorder);
            font-weight: 700;
        }

        .code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 3px 8px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-textPreformat-foreground);
            border: 1px solid var(--vscode-widget-border);
            white-space: nowrap;
        }

        .icon-inline-wrapper {
            display: inline-flex;
            align-items: center;
            vertical-align: middle;
            margin: 0 4px;
        }

        .icon-inline-wrapper img {
            display: inline-block;
            width: 18px;
            height: 18px;
            vertical-align: middle;
        }

        .info-message {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-left: 4px solid var(--vscode-inputValidation-infoBorder);
            padding: 16px 20px;
            border-radius: 4px;
            margin: 16px 0;
            color: var(--vscode-inputValidation-infoForeground);
        }

        .info-message strong {
            color: var(--vscode-inputValidation-infoForeground);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        ${iconHtml}
        <h1>Get Started with Kube9</h1>
    </div>

    <div class="dont-show-container">
        <label>
            <input type="checkbox" id="doNotShowAgain" />
            <span>Don't show this tutorial again</span>
        </label>
    </div>

    <div class="section">
        <h2><span class="section-icon">🌐</span> The Kube9 Ecosystem</h2>
        <p>Kube9 VS Code is part of a comprehensive suite of Kubernetes tools designed to work together:</p>
        
        <div class="ecosystem-grid">
            <div class="ecosystem-card">
                <h3>Kube9 Operator</h3>
                <p>Kubernetes operator that manages Kube9 resources and provides advanced cluster capabilities.</p>
                <a href="#" onclick="openExternal('https://github.com/alto9/kube9-operator'); return false;">View on GitHub →</a>
            </div>
            <div class="ecosystem-card">
                <h3>Kube9 VS Code</h3>
                <p>VS Code extension for Kubernetes cluster management (this extension).</p>
                <a href="#" onclick="openExternal('https://github.com/alto9/kube9-vscode'); return false;">View on GitHub →</a>
            </div>
            <div class="ecosystem-card">
                <h3>Kube9 Desktop</h3>
                <p>Desktop application for Kubernetes management with integrated development tools.</p>
                <a href="#" onclick="openExternal('https://kube9.io/getting-started'); return false;">Get Started</a>
            </div>
        </div>

        <p style="margin-top: 24px;">Learn more about the complete ecosystem at <a href="#" onclick="openExternal('https://alto9.github.io/'); return false;" class="command-link">alto9.github.io</a></p>
    </div>

    <div class="section">
        <h2><span class="section-icon">⚡</span> Quick Start Guide</h2>
        <ol class="steps">
            <li>Ensure you have a valid kubeconfig file (typically at <span class="code">~/.kube/config</span>)</li>
            <li>Click the <span class="icon-inline-wrapper">${inlineIconHtml}</span> icon in the VS Code activity bar (left sidebar)</li>
            <li>Select any cluster to open an interactive dashboard with real-time statistics</li>
            <li>Expand clusters to explore namespaces and Kubernetes resources</li>
            <li>Click on any resource to view detailed information</li>
        </ol>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">1</div>
            <h2 class="step-title">Explore the Cluster View</h2>
        </div>
        <div class="step-description">
            <p>Discover the Kube9 activity bar icon and learn about the tree structure that organizes clusters, namespaces, and resources.</p>
            <img src="${getMediaUri('01-cluster-view.png')}" alt="Kube9 activity bar icon and cluster tree view" class="step-image" />
        </div>
        <div class="step-actions">
            <button onclick="executeCommand('kube9ClusterView.focus')">Open Kube9 View</button>
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">2</div>
            <h2 class="step-title">Explore Cluster Organizer</h2>
        </div>
        <div class="step-description">
            <p>Learn how to customize your tree view organization with the Cluster Organizer. Organize clusters to tailor the interface to your workflow.</p>
            <img src="${getMediaUri('02-cluster-manager.png')}" alt="Cluster Manager UI showing customization options" class="step-image" />
        </div>
        <div class="step-actions">
            <button onclick="executeCommand('kube9.openClusterManager')">Open Cluster Organizer</button>
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">3</div>
            <h2 class="step-title">Navigate Resources</h2>
        </div>
        <div class="step-description">
            <p>Explore Kubernetes resources organized in a familiar hierarchical tree.</p>
            <img src="${getMediaUri('03-navigation.png')}" alt="Expanded namespace showing resource hierarchy" class="step-image" />
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">4</div>
            <h2 class="step-title">View Resources</h2>
        </div>
        <div class="step-description">
            <p>View detailed information about any resource by clicking on it. See current status, conditions, events, and more in the describe webview.</p>
            <img src="${getMediaUri('04-view-resource.png')}" alt="Resource describe webview showing pod status and details" class="step-image" />
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">5</div>
            <h2 class="step-title">View Pod Logs</h2>
        </div>
        <div class="step-description">
            <p>Access pod logs directly from the tree view for debugging and monitoring. Logs open in a dedicated viewer with filtering and search.</p>
            <div class="info-message">
                <strong>How to View Pod Logs:</strong> Right-click any pod in the Kube9 tree view and select View Logs from the context menu.
            </div>
            <img src="${getMediaUri('05-logs.png')}" alt="Pod logs viewer interface" class="step-image" />
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">6</div>
            <h2 class="step-title">View Events</h2>
        </div>
        <div class="step-description">
            <p>View cluster events in the Events Viewer. Events are displayed in a three-pane layout with filtering, sorting, and search capabilities.</p>
            <div class="info-message">
                <strong>Requires Kube9 Operator to be installed:</strong> Kube9 Operator provides advanced event tracking features that power the Events Viewer.
            </div>
            <img src="${getMediaUri('06-management.png')}" alt="Resource management operations including scale and delete" class="step-image" />
        </div>
    </div>

    <div class="step">
        <div class="step-header">
            <div class="step-number">7</div>
            <h2 class="step-title">Documentation</h2>
        </div>
        <div class="step-description">
            <p>You've learned the essentials! Find more help and resources:</p>
            <ul>
                <li>Use <strong>Cmd/Ctrl+Shift+P</strong> to access all Kube9 commands</li>
                <li>Right-click resources for context menus</li>
                <li>Check out <a href="https://alto9.github.io/kube9/" class="command-link" onclick="openExternal('https://alto9.github.io/kube9/')">our documentation</a> for detailed guides</li>
                <li>Join our <a href="https://github.com/alto9/kube9-vscode" class="command-link" onclick="openExternal('https://github.com/alto9/kube9-vscode')">community</a> for support</li>
            </ul>
            <p>Happy Kubernetes management! 🚀</p>
        </div>
    </div>

    <div class="footer">
        <button onclick="completeTutorial()" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">
            Complete Tutorial
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeCommand(commandId) {
            vscode.postMessage({
                command: 'executeCommand',
                commandId: commandId
            });
        }

        function openExternal(url) {
            vscode.postMessage({
                command: 'openExternal',
                url: url
            });
        }

        function completeTutorial() {
            const doNotShowAgain = document.getElementById('doNotShowAgain').checked;
            vscode.postMessage({
                command: 'completeTutorial',
                doNotShowAgain: doNotShowAgain
            });
        }

        // Handle checkbox change for dismiss
        document.addEventListener('DOMContentLoaded', () => {
            const checkbox = document.getElementById('doNotShowAgain');
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    // Optionally save immediately on change, or wait for close/complete
                });
            }
        });
    </script>
</body>
</html>`;
    }
}

