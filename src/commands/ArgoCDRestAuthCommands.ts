import * as vscode from 'vscode';
import { getExtensionContext, getClusterTreeProvider } from '../extension';
import { ArgoCDRestAuthResolver, bearerTokenSecretKey } from '../services/ArgoCDRestAuthResolver';
import { ArgoCDRestClientError, testArgoCDRestConnection } from '../services/ArgoCDRestClient';
import { ArgoCDService } from '../services/ArgoCDService';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import { getContextInfo } from '../utils/kubectlContext';

function getArgoCDService(): ArgoCDService | undefined {
    const treeProvider = getClusterTreeProvider();
    const kubeconfigPath = treeProvider.getKubeconfigPath();

    if (!kubeconfigPath) {
        return undefined;
    }

    const operatorStatusClient = new OperatorStatusClient();
    return new ArgoCDService(operatorStatusClient, kubeconfigPath);
}

async function getActiveContextName(): Promise<string> {
    const contextInfo = await getContextInfo();
    return contextInfo.contextName;
}

export async function setArgoCDApiTokenCommand(): Promise<void> {
    try {
        const contextName = await getActiveContextName();
        const token = await vscode.window.showInputBox({
            title: 'Set Argo CD API Token',
            prompt: `Enter a bearer token for kubectl context "${contextName}"`,
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => (value.trim() === '' ? 'Token cannot be empty' : undefined)
        });

        if (token === undefined) {
            return;
        }

        await getExtensionContext().secrets.store(bearerTokenSecretKey(contextName), token.trim());
        vscode.window.showInformationMessage(
            `Argo CD API token saved for context "${contextName}".`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to set Argo CD API token:', message);
        vscode.window.showErrorMessage(`Failed to set Argo CD API token: ${message}`);
    }
}

export async function clearArgoCDApiTokenCommand(): Promise<void> {
    try {
        const contextName = await getActiveContextName();
        const secretKey = bearerTokenSecretKey(contextName);
        const existing = await getExtensionContext().secrets.get(secretKey);

        if (!existing) {
            vscode.window.showInformationMessage(
                `No Argo CD API token is configured for context "${contextName}".`
            );
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Clear the Argo CD API token for context "${contextName}"?`,
            { modal: true },
            'Clear',
            'Cancel'
        );

        if (confirmation !== 'Clear') {
            return;
        }

        await getExtensionContext().secrets.delete(secretKey);
        vscode.window.showInformationMessage(
            `Argo CD API token cleared for context "${contextName}".`
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to clear Argo CD API token:', message);
        vscode.window.showErrorMessage(`Failed to clear Argo CD API token: ${message}`);
    }
}

export async function testArgoCDApiConnectionCommand(): Promise<void> {
    try {
        const contextName = await getActiveContextName();
        const argoCDService = getArgoCDService();
        if (!argoCDService) {
            vscode.window.showErrorMessage('Unable to test connection: Kubeconfig not available');
            return;
        }

        const authResolver = new ArgoCDRestAuthResolver(getExtensionContext(), argoCDService);
        const auth = await authResolver.resolve(contextName);

        if (!auth.available) {
            vscode.window.showErrorMessage(
                auth.reason || 'Argo CD REST credentials are not configured for this context'
            );
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Testing Argo CD API connection...',
                cancellable: false
            },
            async () => {
                await testArgoCDRestConnection(auth);
            }
        );

        vscode.window.showInformationMessage(
            `Argo CD API connection succeeded for context "${contextName}".`
        );
    } catch (error) {
        const message =
            error instanceof ArgoCDRestClientError || error instanceof Error
                ? error.message
                : String(error);
        console.error('Argo CD API connection test failed:', message);
        vscode.window.showErrorMessage(`Argo CD API connection test failed: ${message}`);
    }
}
