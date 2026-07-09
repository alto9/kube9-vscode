import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient } from './apiClient';

/**
 * Applies a strategic merge patch to a Kubernetes resource.
 * Uses KubernetesObjectApi so Content-Type is application/strategic-merge-patch+json,
 * unlike generated patchNamespaced* methods that send application/json-patch+json.
 */
export async function strategicMergePatch<T extends k8s.KubernetesObject>(
    resource: k8s.KubernetesObject,
    contextName: string,
    dryRun?: string
): Promise<T> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);
    const objectApi = k8s.KubernetesObjectApi.makeApiClient(apiClient.getKubeConfig());
    return objectApi.patch(
        resource,
        undefined,
        dryRun,
        undefined,
        undefined,
        k8s.PatchStrategy.StrategicMergePatch
    ) as Promise<T>;
}
