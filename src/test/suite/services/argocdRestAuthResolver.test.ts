import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDRestAuthResolver, bearerTokenSecretKey } from '../../../services/ArgoCDRestAuthResolver';
import { buildResourceTreeUrl } from '../../../services/ArgoCDRestClient';
import type { ArgoCDService } from '../../../services/ArgoCDService';

const originalGetConfiguration = vscode.workspace.getConfiguration;

suite('ArgoCDRestAuthResolver', () => {
    const contextName = 'minikube';

    teardown(() => {
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });

    setup(() => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                const values: Record<string, unknown> = {
                    'argocd.restEnabled': false,
                    'argocd.accessMode': 'direct',
                    'argocd.tlsInsecure': false,
                    'argocd.portForwardLocalPort': 8443,
                    'timeout.apiRequest': 30_000
                };
                return (values[key] ?? defaultValue) as T | undefined;
            }
        })) as typeof vscode.workspace.getConfiguration;
    });

    test('returns unavailable when REST enrichment is disabled', async () => {
        const resolver = new ArgoCDRestAuthResolver(
            { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext,
            {} as ArgoCDService
        );

        const result = await resolver.resolve(contextName);
        assert.strictEqual(result.available, false);
        if (!result.available) {
            assert.match(result.reason, /disabled/i);
        }
    });

    test('returns unavailable when bearer token is missing', async () => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                if (key === 'argocd.restEnabled') {
                    return true as T;
                }
                return defaultValue;
            }
        })) as typeof vscode.workspace.getConfiguration;

        const resolver = new ArgoCDRestAuthResolver(
            { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext,
            {} as ArgoCDService
        );

        const result = await resolver.resolve(contextName);
        assert.strictEqual(result.available, false);
        if (!result.available) {
            assert.match(result.reason, /token/i);
        }
    });

    test('resolves direct mode when URL and token are configured', async () => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                const values: Record<string, unknown> = {
                    'argocd.restEnabled': true,
                    'argocd.accessMode': 'direct',
                    'argocd.serverUrl': {
                        [contextName]: 'https://argocd.example.com/'
                    },
                    'argocd.tlsInsecure': false
                };
                return (values[key] ?? defaultValue) as T | undefined;
            }
        })) as typeof vscode.workspace.getConfiguration;

        const secrets = new Map<string, string>();
        secrets.set(bearerTokenSecretKey(contextName), 'secret-token');

        const resolver = new ArgoCDRestAuthResolver(
            {
                secrets: {
                    get: async (key: string) => secrets.get(key)
                }
            } as unknown as vscode.ExtensionContext,
            {} as ArgoCDService
        );

        const result = await resolver.resolve(contextName);
        assert.strictEqual(result.available, true);
        if (result.available) {
            assert.strictEqual(result.baseUrl, 'https://argocd.example.com');
            assert.strictEqual(result.bearerToken, 'secret-token');
            assert.strictEqual(result.tlsInsecure, false);
        }
    });
});

suite('ArgoCDRestClient URL builder', () => {
    test('includes appNamespace query parameter for namespaced applications', () => {
        const url = buildResourceTreeUrl('https://argocd.example.com', 'guestbook', 'argocd');
        assert.strictEqual(
            url,
            'https://argocd.example.com/api/v1/applications/guestbook/resource-tree?appNamespace=argocd'
        );
    });
});
