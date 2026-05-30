import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDRestAuthResolver, bearerTokenSecretKey } from '../../../services/ArgoCDRestAuthResolver';
import { buildResourceTreeUrl } from '../../../services/ArgoCDRestClient';
import type { ArgoCDService } from '../../../services/ArgoCDService';
import { PortForwardStatus } from '../../../services/PortForwardManager';

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

    test('returns unavailable when direct mode lacks server URL', async () => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                const values: Record<string, unknown> = {
                    'argocd.restEnabled': true,
                    'argocd.accessMode': 'direct',
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
        assert.strictEqual(result.available, false);
        if (!result.available) {
            assert.match(result.reason, /server url/i);
        }
    });

    test('resolves port-forward mode base URL from connected forward', async () => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                const values: Record<string, unknown> = {
                    'argocd.restEnabled': true,
                    'argocd.accessMode': 'portForward',
                    'argocd.tlsInsecure': false,
                    'argocd.portForwardLocalPort': 8443
                };
                return (values[key] ?? defaultValue) as T | undefined;
            }
        })) as typeof vscode.workspace.getConfiguration;

        const secrets = new Map<string, string>();
        secrets.set(bearerTokenSecretKey(contextName), 'secret-token');

        const argoCDService = {
            isInstalled: async () => ({ installed: true, namespace: 'argocd' })
        } as unknown as ArgoCDService;

        const portForwardManager = {
            getAllForwards: () => [
                {
                    context: contextName,
                    namespace: 'argocd',
                    resourceType: 'service' as const,
                    resourceName: 'argocd-server',
                    status: PortForwardStatus.Connected,
                    localPort: 9443
                }
            ],
            startForward: async () => {
                throw new Error('startForward should not be called when a connected forward exists');
            }
        };

        const resolver = new ArgoCDRestAuthResolver(
            {
                secrets: {
                    get: async (key: string) => secrets.get(key)
                }
            } as unknown as vscode.ExtensionContext,
            argoCDService,
            portForwardManager as never
        );

        const result = await resolver.resolve(contextName);
        assert.strictEqual(result.available, true);
        if (result.available) {
            assert.strictEqual(result.baseUrl, 'http://127.0.0.1:9443');
        }
    });

    test('redacts sensitive details from resolver errors', async () => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                const values: Record<string, unknown> = {
                    'argocd.restEnabled': true,
                    'argocd.accessMode': 'portForward',
                    'argocd.tlsInsecure': false,
                    'argocd.portForwardLocalPort': 8443
                };
                return (values[key] ?? defaultValue) as T | undefined;
            }
        })) as typeof vscode.workspace.getConfiguration;

        const secrets = new Map<string, string>();
        secrets.set(bearerTokenSecretKey(contextName), 'secret-token');

        const argoCDService = {
            isInstalled: async () => {
                throw new Error('Bearer super-secret-token kubeconfig=/home/user/.kube/config');
            }
        } as unknown as ArgoCDService;

        const resolver = new ArgoCDRestAuthResolver(
            {
                secrets: {
                    get: async (key: string) => secrets.get(key)
                }
            } as unknown as vscode.ExtensionContext,
            argoCDService
        );

        const result = await resolver.resolve(contextName);
        assert.strictEqual(result.available, false);
        if (!result.available) {
            assert.ok(!result.reason.includes('super-secret-token'));
            assert.ok(!result.reason.includes('/home/user/.kube/config'));
            assert.match(result.reason, /Bearer \[redacted\]/i);
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
