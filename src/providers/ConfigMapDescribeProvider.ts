/**
 * ConfigMap Describe Provider interfaces.
 * Type definitions for ConfigMap information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all ConfigMap information for display in the webview.
 */
export interface ConfigMapDescribeData {
    /** Overview information including name, namespace, age, and immutable status */
    overview: ConfigMapOverview;
    /** Data keys and values */
    data: ConfigMapData;
    /** Usage information showing which Pods/resources reference this ConfigMap */
    usage: ConfigMapUsage;
    /** ConfigMap metadata including labels and annotations */
    metadata: ConfigMapMetadata;
}

/**
 * Overview information for a ConfigMap including name, namespace, age, and immutable status.
 */
export interface ConfigMapOverview {
    /** ConfigMap name */
    name: string;
    /** Namespace where the ConfigMap is located */
    namespace: string;
    /** Age of the ConfigMap (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
    /** Whether the ConfigMap is immutable */
    immutable: boolean;
    /** Total number of data keys */
    dataKeys: number;
    /** Total number of binary data keys */
    binaryDataKeys: number;
    /** Total size of data (approximate) */
    dataSize: string;
}

/**
 * ConfigMap data information including data keys/values and binary data keys.
 */
export interface ConfigMapData {
    /** Regular data keys and their values */
    data: Record<string, string>;
    /** Binary data keys (base64 encoded) */
    binaryData: Record<string, string>;
    /** Total number of data keys */
    totalKeys: number;
}

/**
 * Usage information showing which Pods/resources reference this ConfigMap.
 */
export interface ConfigMapUsage {
    /** List of Pods using this ConfigMap */
    pods: PodUsageInfo[];
    /** Total number of Pods using this ConfigMap */
    totalPods: number;
}

/**
 * Information about a Pod using the ConfigMap.
 */
export interface PodUsageInfo {
    /** Pod name */
    name: string;
    /** Pod namespace */
    namespace: string;
    /** Pod phase */
    phase: string;
    /** How the ConfigMap is used (volume mount, env var, etc.) */
    usageType: 'volume' | 'env' | 'envFrom';
    /** Volume mount path (if used as volume) */
    mountPath?: string;
    /** Environment variable name (if used as env var) */
    envVarName?: string;
    /** Container name */
    containerName?: string;
}

/**
 * ConfigMap metadata including labels and annotations.
 */
export interface ConfigMapMetadata {
    /** Labels applied to the ConfigMap */
    labels: Record<string, string>;
    /** Annotations applied to the ConfigMap */
    annotations: Record<string, string>;
    /** ConfigMap UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting ConfigMap information for the Describe webview.
 * Fetches ConfigMap data from Kubernetes API and transforms it into structured data structures.
 */
export class ConfigMapDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches ConfigMap details from Kubernetes API and formats them for display.
     * 
     * @param name - ConfigMap name
     * @param namespace - ConfigMap namespace
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted ConfigMap data
     * @throws Error if ConfigMap cannot be fetched or if API calls fail
     */
    async getConfigMapDetails(
        name: string,
        namespace: string,
        context: string
    ): Promise<ConfigMapDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch ConfigMap object
        let configMap: k8s.V1ConfigMap;
        try {
            configMap = await this.k8sClient.core.readNamespacedConfigMap({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch ConfigMap ${name} in namespace ${namespace}: ${errorMessage}`);
        }

        // Find Pods using this ConfigMap
        let podsUsingConfigMap: PodUsageInfo[] = [];
        try {
            podsUsingConfigMap = await this.findPodsUsingConfigMap(name, namespace);
        } catch (error) {
            // Log but don't fail if Pods can't be fetched
            console.warn(`Failed to find Pods using ConfigMap ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(configMap),
            data: this.formatData(configMap),
            usage: {
                pods: podsUsingConfigMap,
                totalPods: podsUsingConfigMap.length
            },
            metadata: this.formatMetadata(configMap.metadata!)
        };
    }

    /**
     * Formats ConfigMap overview information.
     */
    private formatOverview(configMap: k8s.V1ConfigMap): ConfigMapOverview {
        const metadata = configMap.metadata;
        const data = configMap.data || {};
        const binaryData = configMap.binaryData || {};
        const immutable = configMap.immutable || false;

        // Calculate data size (approximate)
        let totalSize = 0;
        Object.values(data).forEach(value => {
            totalSize += new TextEncoder().encode(value).length;
        });
        Object.values(binaryData).forEach(value => {
            // Binary data is base64 encoded, so actual size is ~75% of encoded size
            totalSize += Math.floor(value.length * 0.75);
        });

        const dataSize = this.formatDataSize(totalSize);

        return {
            name: metadata?.name || 'Unknown',
            namespace: metadata?.namespace || 'Unknown',
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp),
            immutable: immutable,
            dataKeys: Object.keys(data).length,
            binaryDataKeys: Object.keys(binaryData).length,
            dataSize: dataSize
        };
    }

    /**
     * Formats ConfigMap data information.
     */
    private formatData(configMap: k8s.V1ConfigMap): ConfigMapData {
        const data = configMap.data || {};
        const binaryData = configMap.binaryData || {};

        return {
            data: data,
            binaryData: binaryData,
            totalKeys: Object.keys(data).length + Object.keys(binaryData).length
        };
    }

    /**
     * Finds Pods using this ConfigMap by listing all Pods in the namespace and checking:
     * - Volume mounts (volumes referencing ConfigMap)
     * - Environment variables (env vars from ConfigMap)
     * - EnvFrom (entire ConfigMap as env vars)
     */
    private async findPodsUsingConfigMap(configMapName: string, namespace: string): Promise<PodUsageInfo[]> {
        try {
            const response = await this.k8sClient.core.listNamespacedPod({
                namespace: namespace
            });
            const pods = response.items || [];

            const podsUsingConfigMap: PodUsageInfo[] = [];
            const seenPods = new Set<string>();

            pods.forEach((pod: k8s.V1Pod) => {
                const podName = pod.metadata?.name || 'Unknown';
                const podNamespace = pod.metadata?.namespace || namespace;
                const podKey = `${podNamespace}/${podName}`;

                // Check volumes for ConfigMap references
                const volumes = pod.spec?.volumes || [];
                volumes.forEach(volume => {
                    if (volume.configMap?.name === configMapName) {
                        // Find containers that mount this volume
                        const containers = [
                            ...(pod.spec?.containers || []),
                            ...(pod.spec?.initContainers || [])
                        ];
                        containers.forEach(container => {
                            const volumeMount = container.volumeMounts?.find(
                                mount => mount.name === volume.name
                            );
                            if (volumeMount) {
                                if (!seenPods.has(podKey)) {
                                    podsUsingConfigMap.push({
                                        name: podName,
                                        namespace: podNamespace,
                                        phase: pod.status?.phase || 'Unknown',
                                        usageType: 'volume',
                                        mountPath: volumeMount.mountPath,
                                        containerName: container.name
                                    });
                                    seenPods.add(podKey);
                                }
                            }
                        });
                    }
                });

                // Check environment variables for ConfigMap references
                const containers = [
                    ...(pod.spec?.containers || []),
                    ...(pod.spec?.initContainers || [])
                ];
                containers.forEach(container => {
                    // Check env vars from ConfigMap
                    container.env?.forEach(envVar => {
                        if (envVar.valueFrom?.configMapKeyRef?.name === configMapName) {
                            if (!seenPods.has(podKey)) {
                                podsUsingConfigMap.push({
                                    name: podName,
                                    namespace: podNamespace,
                                    phase: pod.status?.phase || 'Unknown',
                                    usageType: 'env',
                                    envVarName: envVar.name,
                                    containerName: container.name
                                });
                                seenPods.add(podKey);
                            }
                        }
                    });

                    // Check envFrom for entire ConfigMap
                    container.envFrom?.forEach(envFrom => {
                        if (envFrom.configMapRef?.name === configMapName) {
                            if (!seenPods.has(podKey)) {
                                podsUsingConfigMap.push({
                                    name: podName,
                                    namespace: podNamespace,
                                    phase: pod.status?.phase || 'Unknown',
                                    usageType: 'envFrom',
                                    containerName: container.name
                                });
                                seenPods.add(podKey);
                            }
                        }
                    });
                });
            });

            return podsUsingConfigMap;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to find Pods using ConfigMap ${configMapName}: ${errorMessage}`);
        }
    }

    /**
     * Formats ConfigMap metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): ConfigMapMetadata {
        return {
            labels: metadata.labels || {},
            annotations: metadata.annotations || {},
            uid: metadata.uid || 'Unknown',
            resourceVersion: metadata.resourceVersion || 'Unknown',
            creationTimestamp: metadata.creationTimestamp ? this.formatTimestamp(metadata.creationTimestamp) : 'Unknown'
        };
    }

    /**
     * Formats a timestamp (Date or string) to ISO string.
     */
    private formatTimestamp(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }
        return timestamp;
    }

    /**
     * Calculates age from timestamp and formats as human-readable string.
     */
    private calculateAge(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }

        try {
            const now = new Date();
            const then = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const diffMs = now.getTime() - then.getTime();

            if (isNaN(diffMs) || diffMs < 0) {
                return 'Unknown';
            }

            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                return `${days}d`;
            }
            if (hours > 0) {
                return `${hours}h`;
            }
            if (minutes > 0) {
                return `${minutes}m`;
            }
            return `${seconds}s`;
        } catch {
            return 'Unknown';
        }
    }

    /**
     * Formats data size in bytes to human-readable format.
     */
    private formatDataSize(bytes: number): string {
        if (bytes === 0) {
            return '0 B';
        }

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
    }
}
