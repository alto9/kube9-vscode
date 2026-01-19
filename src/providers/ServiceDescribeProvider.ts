/**
 * Service Describe Provider interfaces.
 * Type definitions for Service information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all Service information for display in the webview.
 */
export interface ServiceDescribeData {
    /** Overview information including type, IPs, ports, selectors, and session affinity */
    overview: ServiceOverview;
    /** Endpoint information showing Pod IPs and ports */
    endpoints: ServiceEndpoints;
    /** Events related to the service */
    events: ServiceEvent[];
    /** Service metadata including labels and annotations */
    metadata: ServiceMetadata;
}

/**
 * Overview information for a Service including type, IPs, ports, selectors, and session affinity.
 */
export interface ServiceOverview {
    /** Service name */
    name: string;
    /** Namespace where the Service is located */
    namespace: string;
    /** Service type (ClusterIP, NodePort, LoadBalancer, ExternalName) */
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    /** Service status with health calculation */
    status: ServiceStatus;
    /** Cluster IP address */
    clusterIP: string;
    /** External IPs (for LoadBalancer/NodePort services) */
    externalIPs: string[];
    /** Load balancer ingress IPs/hostnames */
    loadBalancerIngress: string[];
    /** Port mappings */
    ports: ServicePortDetails[];
    /** Label selectors for pods */
    selectors: Record<string, string>;
    /** Session affinity configuration */
    sessionAffinity: string;
    /** Session affinity config (client IP timeout) */
    sessionAffinityConfig?: {
        clientIP?: {
            timeoutSeconds?: number;
        };
    };
    /** Age of the Service (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * Service status information with health calculation.
 */
export interface ServiceStatus {
    /** Health status calculated from endpoints and events */
    health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

/**
 * Service port details including port, targetPort, nodePort, and protocol.
 */
export interface ServicePortDetails {
    /** Port number exposed by the service */
    port: number;
    /** Target port on pods (can be number or named port) */
    targetPort: string | number;
    /** Protocol used (TCP, UDP, or SCTP) */
    protocol: 'TCP' | 'UDP' | 'SCTP';
    /** Node port for NodePort/LoadBalancer services */
    nodePort?: number;
    /** Port name (if specified) */
    name?: string;
}

/**
 * Endpoint information showing Pod IPs and ports.
 */
export interface ServiceEndpoints {
    /** List of endpoint subsets */
    subsets: EndpointSubset[];
    /** Total number of endpoints */
    totalEndpoints: number;
}

/**
 * Endpoint subset containing addresses and ports.
 */
export interface EndpointSubset {
    /** List of endpoint addresses (Pod IPs) */
    addresses: EndpointAddress[];
    /** List of endpoint ports */
    ports: EndpointPort[];
}

/**
 * Endpoint address (Pod IP).
 */
export interface EndpointAddress {
    /** IP address */
    ip: string;
    /** Pod name (if available) */
    podName?: string;
    /** Node name (if available) */
    nodeName?: string;
}

/**
 * Endpoint port.
 */
export interface EndpointPort {
    /** Port number */
    port: number;
    /** Protocol */
    protocol: 'TCP' | 'UDP' | 'SCTP';
    /** Port name (if specified) */
    name?: string;
}

/**
 * Service event information for timeline display.
 */
export interface ServiceEvent {
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
 * Service metadata including labels and annotations.
 */
export interface ServiceMetadata {
    /** Labels applied to the Service */
    labels: Record<string, string>;
    /** Annotations applied to the Service */
    annotations: Record<string, string>;
    /** Service UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting Service information for the Describe webview.
 * Fetches Service data from Kubernetes API and transforms it into structured data structures.
 */
export class ServiceDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches Service details from Kubernetes API and formats them for display.
     * 
     * @param name - Service name
     * @param namespace - Service namespace
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted Service data
     * @throws Error if Service cannot be fetched or if API calls fail
     */
    async getServiceDetails(
        name: string,
        namespace: string,
        context: string
    ): Promise<ServiceDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch Service object
        let service: k8s.V1Service;
        try {
            service = await this.k8sClient.core.readNamespacedService({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch Service ${name} in namespace ${namespace}: ${errorMessage}`);
        }

        // Fetch Endpoints (may not exist for ExternalName services)
        let endpoints: k8s.V1Endpoints | undefined;
        try {
            endpoints = await this.k8sClient.core.readNamespacedEndpoints({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            // Endpoints may not exist for ExternalName services, so this is not a fatal error
            console.warn(`Failed to fetch Endpoints for Service ${name}:`, error);
        }

        // Fetch Service-related events
        let events: k8s.CoreV1Event[] = [];
        try {
            const serviceUid = service.metadata?.uid;
            if (serviceUid && namespace) {
                const fieldSelector = `involvedObject.name=${name},involvedObject.uid=${serviceUid}`;
                const eventsResponse = await this.k8sClient.core.listNamespacedEvent({
                    namespace: namespace,
                    fieldSelector: fieldSelector
                });
                events = eventsResponse.items || [];
                
                // Defensive filter to ensure Service-level events only
                events = events.filter(event => 
                    event.involvedObject?.kind === 'Service' && 
                    event.involvedObject?.name === name
                );
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for Service ${name}:`, error);
        }

        // Format endpoints first (needed for status calculation)
        const formattedEndpoints = this.formatEndpoints(endpoints);

        // Format data
        return {
            overview: this.formatOverview(service, formattedEndpoints),
            endpoints: formattedEndpoints,
            events: this.formatEvents(events),
            metadata: this.formatMetadata(service.metadata!)
        };
    }

    /**
     * Formats Service overview information.
     */
    private formatOverview(service: k8s.V1Service, endpoints: ServiceEndpoints): ServiceOverview {
        const spec = service.spec;
        const status = service.status;
        const metadata = service.metadata;

        const type = (spec?.type || 'ClusterIP') as ServiceOverview['type'];
        const clusterIP = spec?.clusterIP || 'None';
        const externalIPs = spec?.externalIPs || [];
        const loadBalancerIngress = status?.loadBalancer?.ingress?.map(ingress => 
            ingress.hostname || ingress.ip || 'Unknown'
        ) || [];
        const ports = (spec?.ports || []).map(port => ({
            port: port.port || 0,
            targetPort: port.targetPort || port.port || 0,
            protocol: (port.protocol || 'TCP') as 'TCP' | 'UDP' | 'SCTP',
            nodePort: port.nodePort,
            name: port.name
        }));
        const selectors = spec?.selector || {};
        const sessionAffinity = spec?.sessionAffinity || 'None';
        const sessionAffinityConfig = spec?.sessionAffinityConfig;

        return {
            name: metadata?.name || 'Unknown',
            namespace: metadata?.namespace || 'Unknown',
            type: type,
            status: this.calculateServiceStatus(service, endpoints),
            clusterIP: clusterIP,
            externalIPs: externalIPs,
            loadBalancerIngress: loadBalancerIngress,
            ports: ports,
            selectors: selectors,
            sessionAffinity: sessionAffinity,
            sessionAffinityConfig: sessionAffinityConfig?.clientIP ? {
                clientIP: {
                    timeoutSeconds: sessionAffinityConfig.clientIP.timeoutSeconds
                }
            } : undefined,
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp)
        };
    }

    /**
     * Calculates Service health status based on endpoints and events.
     */
    private calculateServiceStatus(service: k8s.V1Service, endpoints: ServiceEndpoints): ServiceStatus {
        const type = service.spec?.type || 'ClusterIP';
        
        // ExternalName services don't have endpoints, so they're always "Healthy" if they exist
        if (type === 'ExternalName') {
            return { health: 'Healthy' };
        }

        // For other service types, check if endpoints exist
        if (endpoints.totalEndpoints === 0) {
            // No endpoints means service is unhealthy (no pods backing it)
            return { health: 'Unhealthy' };
        }

        // Service has endpoints, so it's healthy
        return { health: 'Healthy' };
    }

    /**
     * Formats endpoint information.
     */
    private formatEndpoints(endpoints?: k8s.V1Endpoints): ServiceEndpoints {
        if (!endpoints || !endpoints.subsets) {
            return {
                subsets: [],
                totalEndpoints: 0
            };
        }

        const subsets: EndpointSubset[] = endpoints.subsets.map(subset => ({
            addresses: (subset.addresses || []).map(addr => ({
                ip: addr.ip || 'Unknown',
                podName: addr.targetRef?.name,
                nodeName: addr.nodeName
            })),
            ports: (subset.ports || []).map(port => ({
                port: port.port || 0,
                protocol: (port.protocol || 'TCP') as 'TCP' | 'UDP' | 'SCTP',
                name: port.name
            }))
        }));

        const totalEndpoints = subsets.reduce((sum, subset) => sum + subset.addresses.length, 0);

        return {
            subsets: subsets,
            totalEndpoints: totalEndpoints
        };
    }

    /**
     * Formats and groups Service events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): ServiceEvent[] {
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
     * Formats Service metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): ServiceMetadata {
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
