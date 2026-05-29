import * as vscode from 'vscode';
import { ArgoCDService } from './ArgoCDService';
import { PortForwardManager, PortForwardStatus } from './PortForwardManager';
import {
    readBooleanSetting,
    readContextScopedSetting,
    readNumberSetting
} from './contextSettings';

export type ArgoCDAccessMode = 'direct' | 'portForward';

export interface ArgoCDRestAuthContext {
    available: true;
    baseUrl: string;
    bearerToken: string;
    tlsInsecure: boolean;
}

export interface ArgoCDRestAuthUnavailable {
    available: false;
    reason: string;
}

export type ArgoCDRestAuthResolution = ArgoCDRestAuthContext | ArgoCDRestAuthUnavailable;

const ARGOCD_SERVER_SERVICE = 'argocd-server';
const DEFAULT_PORT_FORWARD_LOCAL_PORT = 8443;
const SECRET_KEY_PREFIX = 'kube9.argocd.bearerToken.';

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

function redactReason(message: string): string {
    return message
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/token[=:]\s*\S+/gi, 'token=[redacted]')
        .replace(/kubeconfig[=:]\s*\S+/gi, 'kubeconfig=[redacted]');
}

export function bearerTokenSecretKey(context: string): string {
    return `${SECRET_KEY_PREFIX}${context}`;
}

export class ArgoCDRestAuthResolver {
    constructor(
        private readonly extensionContext: vscode.ExtensionContext,
        private readonly argoCDService: ArgoCDService,
        private readonly portForwardManager: PortForwardManager = PortForwardManager.getInstance()
    ) {}

    async resolve(context: string): Promise<ArgoCDRestAuthResolution> {
        const restEnabled = readBooleanSetting('kube9', 'argocd.restEnabled', false);
        if (!restEnabled) {
            return { available: false, reason: 'Argo CD REST enrichment is disabled' };
        }

        const bearerToken = await this.extensionContext.secrets.get(bearerTokenSecretKey(context));
        if (!bearerToken || bearerToken.trim() === '') {
            return { available: false, reason: 'Argo CD API bearer token is not configured for this context' };
        }

        const accessMode =
            vscode.workspace.getConfiguration('kube9').get<'direct' | 'portForward'>('argocd.accessMode') ??
            'direct';
        const tlsInsecure = readBooleanSetting('kube9', 'argocd.tlsInsecure', false);

        try {
            if (accessMode === 'portForward') {
                const baseUrl = await this.resolvePortForwardBaseUrl(context);
                if (!baseUrl) {
                    return {
                        available: false,
                        reason: 'Could not establish a port-forward to the Argo CD API server'
                    };
                }
                return {
                    available: true,
                    baseUrl: normalizeBaseUrl(baseUrl),
                    bearerToken: bearerToken.trim(),
                    tlsInsecure
                };
            }

            const serverUrl = readContextScopedSetting('kube9', 'argocd.serverUrl', context);
            if (!serverUrl) {
                return {
                    available: false,
                    reason: 'Argo CD server URL is not configured for this context'
                };
            }

            return {
                available: true,
                baseUrl: normalizeBaseUrl(serverUrl),
                bearerToken: bearerToken.trim(),
                tlsInsecure
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { available: false, reason: redactReason(message) };
        }
    }

    private async resolvePortForwardBaseUrl(context: string): Promise<string | undefined> {
        const installation = await this.argoCDService.isInstalled(context);
        if (!installation.installed || !installation.namespace) {
            return undefined;
        }

        const preferredLocalPort = readNumberSetting(
            'kube9',
            'argocd.portForwardLocalPort',
            DEFAULT_PORT_FORWARD_LOCAL_PORT
        );

        const existing = this.portForwardManager
            .getAllForwards()
            .find(
                (forward) =>
                    forward.context === context &&
                    forward.namespace === installation.namespace &&
                    forward.resourceType === 'service' &&
                    forward.resourceName === ARGOCD_SERVER_SERVICE &&
                    forward.status === PortForwardStatus.Connected
            );

        if (existing) {
            return `http://127.0.0.1:${existing.localPort}`;
        }

        const forward = await this.portForwardManager.startForward({
            resourceType: 'service',
            serviceName: ARGOCD_SERVER_SERVICE,
            namespace: installation.namespace,
            context,
            localPort: preferredLocalPort,
            remotePort: 443
        });

        return `http://127.0.0.1:${forward.localPort}`;
    }
}
