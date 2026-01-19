/**
 * Secret Describe Provider interfaces.
 * Type definitions for Secret information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all Secret information for display in the webview.
 */
export interface SecretDescribeData {
    /** Overview information including type, namespace, and creation timestamp */
    overview: SecretOverview;
    /** Key information showing key names and sizes (NOT values) */
    keys: SecretKeys;
    /** Usage information showing which Pods/resources reference this Secret */
    usage: SecretUsage;
    /** Events related to the Secret */
    events: SecretEvent[];
    /** Secret metadata including labels and annotations */
    metadata: SecretMetadata;
}

/**
 * Overview information for a Secret including type, namespace, and creation timestamp.
 */
export interface SecretOverview {
    /** Secret name */
    name: string;
    /** Namespace where the Secret is located */
    namespace: string;
    /** Secret type (Opaque, TLS, ServiceAccount, etc.) */
    type: string;
    /** Age of the Secret (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * Key information showing key names and sizes (NOT actual values for security).
 */
export interface SecretKeys {
    /** List of key information */
    keys: SecretKeyInfo[];
    /** Total number of keys */
    totalKeys: number;
    /** Total size of all secret data in bytes */
    totalSize: number;
}

/**
 * Information about a single Secret key.
 */
export interface SecretKeyInfo {
    /** Key name */
    name: string;
    /** Size of the key value in bytes */
    size: number;
    /** Formatted size string (e.g., "1.2 KB") */
    sizeFormatted: string;
}

/**
 * Usage information showing which Pods/resources reference this Secret.
 */
export interface SecretUsage {
    /** List of Pods using this Secret */
    pods: PodUsageInfo[];
    /** Total number of Pods using this Secret */
    totalPods: number;
}

/**
 * Information about a Pod using the Secret.
 */
export interface PodUsageInfo {
    /** Pod name */
    name: string;
    /** Pod namespace */
    namespace: string;
    /** Pod phase */
    phase: string;
    /** How the Secret is used (e.g., "env", "volume") */
    usageType: 'env' | 'volume';
    /** For volume usage: mount path */
    mountPath?: string;
    /** For volume usage: whether the mount is read-only */
    readOnly?: boolean;
    /** For env usage: environment variable name */
    envVarName?: string;
}

/**
 * Secret event information for timeline display.
 */
export interface SecretEvent {
    /** Event type */
    type: 'Normal' | 'Warning';
    /** Event reason */
    reason: string;
    /** Event message */
    message: string;
    /** Number of times this event occurred (for grouped events) */
    count: number;
    /** First occurrence timestamp */
    firstTimestamp: string;
    /** Last occurrence timestamp */
    lastTimestamp: string;
    /** Source component that generated the event */
    source: string;
    /** Age of the event (formatted string) */
    age: string;
}

/**
 * Secret metadata including labels and annotations.
 */
export interface SecretMetadata {
    /** Labels applied to the Secret */
    labels: Record<string, string>;
    /** Annotations applied to the Secret */
    annotations: Record<string, string>;
    /** Secret UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting Secret information for the Describe webview.
 * Fetches Secret data from Kubernetes API and transforms it into structured data structures.
 * 
 * SECURITY: This provider NEVER extracts or returns actual secret values.
 * Only key names and sizes are returned.
 */
export class SecretDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches Secret details from Kubernetes API and formats them for display.
     * 
     * @param name - Secret name
     * @param namespace - Secret namespace
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted Secret data
     * @throws Error if Secret cannot be fetched or if API calls fail
     */
    async getSecretDetails(
        name: string,
        namespace: string,
        context: string
    ): Promise<SecretDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch Secret object
        let secret: k8s.V1Secret;
        try {
            secret = await this.k8sClient.core.readNamespacedSecret({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch Secret ${name} in namespace ${namespace}: ${errorMessage}`);
        }

        // Find Pods using this Secret
        let podsUsingSecret: PodUsageInfo[] = [];
        try {
            podsUsingSecret = await this.findPodsUsingSecret(name, namespace);
        } catch (error) {
            // Log but don't fail if Pods can't be fetched
            console.warn(`Failed to find Pods using Secret ${name}:`, error);
        }

        // Fetch Secret-related events
        let events: k8s.CoreV1Event[] = [];
        try {
            const secretUid = secret.metadata?.uid;
            if (secretUid && namespace) {
                const fieldSelector = `involvedObject.name=${name},involvedObject.uid=${secretUid}`;
                const eventsResponse = await this.k8sClient.core.listNamespacedEvent({
                    namespace: namespace,
                    fieldSelector: fieldSelector
                });
                events = eventsResponse.items || [];
                
                // Defensive filter to ensure Secret-level events only
                events = events.filter(event => 
                    event.involvedObject?.kind === 'Secret' && 
                    event.involvedObject?.name === name
                );
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for Secret ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(secret),
            keys: this.formatKeys(secret),
            usage: {
                pods: podsUsingSecret,
                totalPods: podsUsingSecret.length
            },
            events: this.formatEvents(events),
            metadata: this.formatMetadata(secret.metadata!)
        };
    }

    /**
     * Formats Secret overview information.
     */
    private formatOverview(secret: k8s.V1Secret): SecretOverview {
        const metadata = secret.metadata;
        const type = secret.type || 'Opaque';

        return {
            name: metadata?.name || 'Unknown',
            namespace: metadata?.namespace || 'Unknown',
            type: type,
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp)
        };
    }

    /**
     * Formats Secret keys information.
     * SECURITY: Only extracts key names and sizes, NEVER actual values.
     */
    private formatKeys(secret: k8s.V1Secret): SecretKeys {
        const data = secret.data || {};
        const keys: SecretKeyInfo[] = [];
        let totalSize = 0;

        Object.entries(data).forEach(([keyName, encodedValue]) => {
            // Calculate size from base64-encoded value
            // Base64 encoding increases size by ~33%, so we calculate original size
            const encodedSize = encodedValue ? Buffer.from(encodedValue, 'base64').length : 0;
            totalSize += encodedSize;

            keys.push({
                name: keyName,
                size: encodedSize,
                sizeFormatted: this.formatSize(encodedSize)
            });
        });

        return {
            keys: keys.sort((a, b) => a.name.localeCompare(b.name)),
            totalKeys: keys.length,
            totalSize: totalSize
        };
    }

    /**
     * Formats size in bytes to human-readable string.
     */
    private formatSize(bytes: number): string {
        if (bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    /**
     * Finds Pods using this Secret by listing all Pods in the namespace and checking:
     * - Volume mounts (secret volumes)
     * - Environment variables (secretKeyRef)
     */
    private async findPodsUsingSecret(secretName: string, namespace: string): Promise<PodUsageInfo[]> {
        try {
            const response = await this.k8sClient.core.listNamespacedPod({
                namespace: namespace
            });
            const pods = response.items || [];

            const podsUsingSecret: PodUsageInfo[] = [];

            pods.forEach((pod: k8s.V1Pod) => {
                const volumes = pod.spec?.volumes || [];
                const containers = [
                    ...(pod.spec?.containers || []),
                    ...(pod.spec?.initContainers || [])
                ];

                // Check if any volume references this Secret
                volumes.forEach(volume => {
                    if (volume.secret?.secretName === secretName) {
                        // Find containers that mount this volume
                        containers.forEach(container => {
                            const volumeMount = container.volumeMounts?.find(
                                mount => mount.name === volume.name
                            );
                            if (volumeMount) {
                                podsUsingSecret.push({
                                    name: pod.metadata?.name || 'Unknown',
                                    namespace: pod.metadata?.namespace || namespace,
                                    phase: pod.status?.phase || 'Unknown',
                                    usageType: 'volume',
                                    mountPath: volumeMount.mountPath,
                                    readOnly: volumeMount.readOnly || false
                                });
                            }
                        });
                    }
                });

                // Check if any container uses this Secret in environment variables
                containers.forEach(container => {
                    const envVars = container.env || [];
                    envVars.forEach(envVar => {
                        if (envVar.valueFrom?.secretKeyRef?.name === secretName) {
                            podsUsingSecret.push({
                                name: pod.metadata?.name || 'Unknown',
                                namespace: pod.metadata?.namespace || namespace,
                                phase: pod.status?.phase || 'Unknown',
                                usageType: 'env',
                                envVarName: envVar.name
                            });
                        }
                    });

                    // Also check envFrom for secrets
                    const envFrom = container.envFrom || [];
                    envFrom.forEach(envFromItem => {
                        if (envFromItem.secretRef?.name === secretName) {
                            podsUsingSecret.push({
                                name: pod.metadata?.name || 'Unknown',
                                namespace: pod.metadata?.namespace || namespace,
                                phase: pod.status?.phase || 'Unknown',
                                usageType: 'env',
                                envVarName: envFromItem.prefix ? `${envFromItem.prefix}*` : '*'
                            });
                        }
                    });
                });
            });

            // Remove duplicates (same Pod might use the Secret multiple ways)
            const uniquePods = new Map<string, PodUsageInfo>();
            podsUsingSecret.forEach(pod => {
                const key = `${pod.namespace}/${pod.name}-${pod.usageType}-${pod.mountPath || pod.envVarName || ''}`;
                if (!uniquePods.has(key)) {
                    uniquePods.set(key, pod);
                }
            });

            return Array.from(uniquePods.values());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to find Pods using Secret ${secretName}: ${errorMessage}`);
        }
    }

    /**
     * Formats and groups Secret events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): SecretEvent[] {
        // Group events by type and reason
        const grouped = new Map<string, k8s.CoreV1Event[]>();

        events.forEach(event => {
            const key = `${event.type || 'Normal'}-${event.reason || 'Unknown'}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(event);
        });

        // Format grouped events
        return Array.from(grouped.values()).map(group => {
            const first = group[0];
            const sorted = group.sort((a, b) => {
                const aTime = this.getEventTimestamp(a.lastTimestamp || a.firstTimestamp);
                const bTime = this.getEventTimestamp(b.lastTimestamp || b.firstTimestamp);
                return bTime.getTime() - aTime.getTime();
            });
            const last = sorted[0];

            return {
                type: (first.type || 'Normal') as 'Normal' | 'Warning',
                reason: first.reason || 'Unknown',
                message: first.message || 'No message',
                count: first.count || group.length,
                firstTimestamp: this.formatTimestamp(first.firstTimestamp) || 'Unknown',
                lastTimestamp: this.formatTimestamp(last.lastTimestamp || last.firstTimestamp) || 'Unknown',
                source: first.source?.component || 'Unknown',
                age: this.calculateAge(this.getEventTimestamp(last.lastTimestamp || last.firstTimestamp))
            };
        });
    }

    /**
     * Formats Secret metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): SecretMetadata {
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
     * Gets a Date object from a timestamp (Date or string).
     */
    private getEventTimestamp(timestamp?: string | Date): Date {
        if (!timestamp) {
            return new Date();
        }
        if (timestamp instanceof Date) {
            return timestamp;
        }
        return new Date(timestamp);
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
}
