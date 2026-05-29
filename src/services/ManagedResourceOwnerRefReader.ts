/**
 * Reads metadata.ownerReferences from live Kubernetes objects for managed resources.
 */

import * as k8s from '@kubernetes/client-node';
import type { ArgoCDResource } from '../types/argocd';
import type { ManagedResourceKey } from '../types/applicationResourceGraph';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

export interface KubernetesOwnerReference {
    apiVersion?: string;
    kind?: string;
    name?: string;
    controller?: boolean;
}

export interface ResourceOwnerRefsResult {
    resourceKey: ManagedResourceKey;
    ownerReferences: KubernetesOwnerReference[];
}

export interface FetchOwnerRefsOutcome {
    results: ResourceOwnerRefsResult[];
    warnings: string[];
}

const CLUSTER_SCOPED_KINDS = new Set([
    'node',
    'namespace',
    'persistentvolume',
    'storageclass',
    'customresourcedefinition',
    'crd'
]);

function trimOrEmpty(value: string | undefined): string {
    return value?.trim() ?? '';
}

function toManagedResourceKey(row: ArgoCDResource): ManagedResourceKey {
    return {
        namespace: row.namespace,
        kind: trimOrEmpty(row.kind),
        name: trimOrEmpty(row.name)
    };
}

function formatResourceLabel(key: ManagedResourceKey): string {
    return `${key.kind}/${key.name}`;
}

function isNotFoundOrForbidden(error: unknown): boolean {
    const statusCode = (error as { response?: { statusCode?: number } }).response?.statusCode;
    return statusCode === 403 || statusCode === 404;
}

function readOwnerReferences(metadata: k8s.V1ObjectMeta | undefined): KubernetesOwnerReference[] {
    return (metadata?.ownerReferences ?? []).map((ownerRef) => ({
        apiVersion: ownerRef.apiVersion,
        kind: ownerRef.kind,
        name: ownerRef.name,
        controller: ownerRef.controller
    }));
}

async function readNamespacedObjectMetadata(
    apiClient: ReturnType<typeof getKubernetesApiClient>,
    kind: string,
    name: string,
    namespace: string
): Promise<k8s.V1ObjectMeta | undefined> {
    const kindLower = kind.toLowerCase();

    switch (kindLower) {
        case 'pod':
            return (await apiClient.core.readNamespacedPod({ name, namespace })).metadata;
        case 'service':
            return (await apiClient.core.readNamespacedService({ name, namespace })).metadata;
        case 'configmap':
            return (await apiClient.core.readNamespacedConfigMap({ name, namespace })).metadata;
        case 'secret':
            return (await apiClient.core.readNamespacedSecret({ name, namespace })).metadata;
        case 'persistentvolumeclaim':
            return (await apiClient.core.readNamespacedPersistentVolumeClaim({ name, namespace })).metadata;
        case 'deployment':
            return (await apiClient.apps.readNamespacedDeployment({ name, namespace })).metadata;
        case 'statefulset':
            return (await apiClient.apps.readNamespacedStatefulSet({ name, namespace })).metadata;
        case 'daemonset':
            return (await apiClient.apps.readNamespacedDaemonSet({ name, namespace })).metadata;
        case 'replicaset':
            return (await apiClient.apps.readNamespacedReplicaSet({ name, namespace })).metadata;
        case 'job':
            return (await apiClient.batch.readNamespacedJob({ name, namespace })).metadata;
        case 'cronjob':
            return (await apiClient.batch.readNamespacedCronJob({ name, namespace })).metadata;
        case 'ingress':
            return (await apiClient.networking.readNamespacedIngress({ name, namespace })).metadata;
        case 'networkpolicy':
            return (await apiClient.networking.readNamespacedNetworkPolicy({ name, namespace })).metadata;
        default:
            throw new Error(`Unsupported resource kind for owner-reference read: ${kind}`);
    }
}

async function readClusterScopedObjectMetadata(
    apiClient: ReturnType<typeof getKubernetesApiClient>,
    kind: string,
    name: string
): Promise<k8s.V1ObjectMeta | undefined> {
    const kindLower = kind.toLowerCase();

    switch (kindLower) {
        case 'node':
            return (await apiClient.core.readNode({ name })).metadata;
        case 'namespace':
            return (await apiClient.core.readNamespace({ name })).metadata;
        case 'persistentvolume':
            return (await apiClient.core.readPersistentVolume({ name })).metadata;
        case 'storageclass':
            return (await apiClient.storage.readStorageClass({ name })).metadata;
        default:
            throw new Error(`Unsupported cluster-scoped resource kind for owner-reference read: ${kind}`);
    }
}

export async function fetchManagedResourceOwnerReferences(
    contextName: string,
    resources: ArgoCDResource[]
): Promise<FetchOwnerRefsOutcome> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);

    const results: ResourceOwnerRefsResult[] = [];
    const warnings: string[] = [];

    for (const row of resources) {
        const resourceKey = toManagedResourceKey(row);
        if (!resourceKey.kind || !resourceKey.name) {
            warnings.push('Skipped owner-reference read: missing kind or name');
            continue;
        }

        const isClusterScoped = CLUSTER_SCOPED_KINDS.has(resourceKey.kind.toLowerCase());
        const namespace = resourceKey.namespace || 'default';

        try {
            const metadata = isClusterScoped
                ? await readClusterScopedObjectMetadata(apiClient, resourceKey.kind, resourceKey.name)
                : await readNamespacedObjectMetadata(
                      apiClient,
                      resourceKey.kind,
                      resourceKey.name,
                      namespace
                  );

            results.push({
                resourceKey,
                ownerReferences: readOwnerReferences(metadata)
            });
        } catch (error) {
            if (isNotFoundOrForbidden(error)) {
                warnings.push(
                    `Skipped owner-reference read for ${formatResourceLabel(resourceKey)}: access denied or not found`
                );
                continue;
            }

            const message = error instanceof Error ? error.message : String(error);
            warnings.push(
                `Skipped owner-reference read for ${formatResourceLabel(resourceKey)}: ${message}`
            );
        }
    }

    return { results, warnings };
}
