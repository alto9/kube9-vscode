/**
 * Transformer module for converting Kubernetes V1Node and V1Pod[] data
 * into NodeDescribeData structure for webview display.
 */

import * as k8s from '@kubernetes/client-node';
import { parseKubernetesQuantity, formatQuantity } from '../utils/kubernetesQuantity';
import { formatRelativeTime } from '../utils/timeFormatting';

/**
 * Complete node information structure for webview display.
 */
export interface NodeDescribeData {
    name: string;
    overview: NodeOverview;
    resources: NodeResources;
    conditions: NodeCondition[];
    pods: NodePodInfo[];
    addresses: NodeAddress[];
    labels: Record<string, string>;
    taints: NodeTaint[];
    allocation: ResourceAllocation;
}

/**
 * Basic node metadata and system information.
 */
export interface NodeOverview {
    name: string;
    status: 'Ready' | 'NotReady' | 'Unknown';
    roles: string[];
    creationTimestamp: string;
    kubernetesVersion: string;
    containerRuntime: string;
    osImage: string;
    kernelVersion: string;
    architecture: string;
}

/**
 * Node capacity and allocatable resources.
 */
export interface NodeResources {
    cpu: ResourceMetric;
    memory: ResourceMetric;
    pods: ResourceMetric;
    ephemeralStorage: ResourceMetric;
}

/**
 * Individual resource metric with capacity, allocatable, used, and available.
 */
export interface ResourceMetric {
    capacity: string;
    capacityRaw: number;
    allocatable: string;
    allocatableRaw: number;
    used: string;
    usedRaw: number;
    available: string;
    availableRaw: number;
    unit: 'cores' | 'bytes' | 'count';
    usagePercentage: number;
}

/**
 * Node health conditions from Kubernetes status.
 */
export interface NodeCondition {
    type: 'Ready' | 'MemoryPressure' | 'DiskPressure' | 'PIDPressure' | 'NetworkUnavailable';
    status: 'True' | 'False' | 'Unknown';
    reason: string;
    message: string;
    lastTransitionTime: string;
    relativeTime: string;
}

/**
 * Information about pods running on the node.
 */
export interface NodePodInfo {
    name: string;
    namespace: string;
    status: string;
    cpuRequest: string;
    cpuRequestRaw: number; // Millicores
    memoryRequest: string;
    memoryRequestRaw: number; // Bytes
    cpuLimit: string;
    cpuLimitRaw: number; // Millicores
    memoryLimit: string;
    memoryLimitRaw: number; // Bytes
    restartCount: number;
    age: string;
}

/**
 * Node network addresses.
 */
export interface NodeAddress {
    type: 'Hostname' | 'InternalIP' | 'ExternalIP' | 'InternalDNS' | 'ExternalDNS';
    address: string;
}

/**
 * Node taints that affect pod scheduling.
 */
export interface NodeTaint {
    key: string;
    value: string;
    effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
}

/**
 * Aggregate resource allocation breakdown.
 */
export interface ResourceAllocation {
    cpu: AllocationMetric;
    memory: AllocationMetric;
}

/**
 * Individual allocation metric.
 */
export interface AllocationMetric {
    requests: string;
    requestsRaw: number;
    limits: string;
    limitsRaw: number;
    allocatable: string;
    allocatableRaw: number;
    requestsPercentage: number;
    limitsPercentage: number;
}

/**
 * Transforms raw Kubernetes V1Node and V1Pod[] data into NodeDescribeData structure.
 * 
 * @param v1Node - The Kubernetes V1Node object
 * @param v1Pods - Array of V1Pod objects running on the node
 * @returns Complete NodeDescribeData object ready for webview display
 */
export function transformNodeData(
    v1Node: k8s.V1Node,
    v1Pods: k8s.V1Pod[]
): NodeDescribeData {
    const nodeName = v1Node.metadata?.name || 'Unknown';
    
    return {
        name: nodeName,
        overview: extractNodeOverview(v1Node),
        resources: extractNodeResources(v1Node, v1Pods),
        conditions: extractNodeConditions(v1Node),
        pods: extractPodInfo(v1Pods),
        addresses: extractNodeAddresses(v1Node),
        labels: extractLabels(v1Node),
        taints: extractTaints(v1Node),
        allocation: extractResourceAllocation(v1Node, v1Pods)
    };
}

/**
 * Extracts node overview information from V1Node.
 */
function extractNodeOverview(v1Node: k8s.V1Node): NodeOverview {
    const metadata = v1Node.metadata || {};
    const status = v1Node.status || {};
    const nodeInfo = status.nodeInfo;
    
    // Determine status from Ready condition
    let nodeStatus: 'Ready' | 'NotReady' | 'Unknown' = 'Unknown';
    const readyCondition = status.conditions?.find(c => c.type === 'Ready');
    if (readyCondition) {
        if (readyCondition.status === 'True') {
            nodeStatus = 'Ready';
        } else {
            nodeStatus = 'NotReady';
        }
    }
    
    // Extract roles from labels
    const roles: string[] = [];
    const labels = metadata.labels || {};
    if (labels['node-role.kubernetes.io/control-plane']) {
        roles.push('control-plane');
    }
    if (labels['node-role.kubernetes.io/master']) {
        roles.push('master');
    }
    
    // Convert creationTimestamp to string if it's a Date
    let creationTimestamp = '';
    if (metadata.creationTimestamp) {
        creationTimestamp = typeof metadata.creationTimestamp === 'string' 
            ? metadata.creationTimestamp 
            : metadata.creationTimestamp.toISOString();
    }
    
    return {
        name: metadata.name || 'Unknown',
        status: nodeStatus,
        roles,
        creationTimestamp,
        kubernetesVersion: nodeInfo?.kubeletVersion || '',
        containerRuntime: nodeInfo?.containerRuntimeVersion || '',
        osImage: nodeInfo?.osImage || '',
        kernelVersion: nodeInfo?.kernelVersion || '',
        architecture: nodeInfo?.architecture || ''
    };
}

/**
 * Extracts and calculates node resource metrics.
 */
function extractNodeResources(v1Node: k8s.V1Node, v1Pods: k8s.V1Pod[]): NodeResources {
    const capacity = v1Node.status?.capacity || {};
    const allocatable = v1Node.status?.allocatable || {};
    
    // Calculate used resources from pod requests
    const { usedCpu, usedMemory, podCount } = calculateUsedResources(v1Pods);
    
    return {
        cpu: calculateResourceMetric(
            capacity.cpu || '0',
            allocatable.cpu || '0',
            usedCpu,
            'cores'
        ),
        memory: calculateResourceMetric(
            capacity.memory || '0',
            allocatable.memory || '0',
            usedMemory,
            'bytes'
        ),
        pods: calculateResourceMetric(
            capacity.pods || '0',
            allocatable.pods || '0',
            String(podCount),
            'count'
        ),
        ephemeralStorage: calculateResourceMetric(
            capacity['ephemeral-storage'] || '0',
            allocatable['ephemeral-storage'] || '0',
            '0', // Currently not calculated
            'bytes'
        )
    };
}

/**
 * Calculates used resources by summing pod requests.
 */
function calculateUsedResources(v1Pods: k8s.V1Pod[]): { usedCpu: string; usedMemory: string; podCount: number } {
    let totalCpuCores = 0;
    let totalMemoryBytes = 0;
    
    for (const pod of v1Pods) {
        const containers = pod.spec?.containers || [];
        for (const container of containers) {
            const resources = container.resources || {};
            const requests = resources.requests || {};
            
            // Sum CPU requests (convert to cores)
            if (requests.cpu) {
                const cpuCores = parseKubernetesQuantity(requests.cpu, 'cores');
                totalCpuCores += cpuCores;
            }
            
            // Sum memory requests
            if (requests.memory) {
                const memoryBytes = parseKubernetesQuantity(requests.memory, 'bytes');
                totalMemoryBytes += memoryBytes;
            }
        }
    }
    
    // Format CPU back to string (will be parsed again in calculateResourceMetric)
    // Convert cores to millicores string for consistency
    const usedCpu = totalCpuCores > 0 ? String(totalCpuCores) : '0';
    const usedMemory = totalMemoryBytes > 0 ? formatBytesQuantity(totalMemoryBytes) : '0';
    
    return {
        usedCpu,
        usedMemory,
        podCount: v1Pods.length
    };
}

/**
 * Formats bytes quantity back to Kubernetes format (e.g., "8Gi").
 */
function formatBytesQuantity(bytes: number): string {
    const units = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    // Round to avoid floating point issues
    const rounded = Math.round(size * 100) / 100;
    return `${rounded}${units[unitIndex]}`;
}

/**
 * Calculates a resource metric from capacity, allocatable, and used values.
 */
function calculateResourceMetric(
    capacity: string,
    allocatable: string,
    used: string,
    unit: 'cores' | 'bytes' | 'count'
): ResourceMetric {
    const capacityRaw = parseKubernetesQuantity(capacity, unit);
    const allocatableRaw = parseKubernetesQuantity(allocatable, unit);
    const usedRaw = parseKubernetesQuantity(used, unit);
    const availableRaw = Math.max(0, allocatableRaw - usedRaw);
    
    // Calculate usage percentage (avoid division by zero)
    const usagePercentage = allocatableRaw > 0 
        ? Math.round((usedRaw / allocatableRaw) * 100)
        : 0;
    
    return {
        capacity: formatQuantity(capacityRaw, unit),
        capacityRaw,
        allocatable: formatQuantity(allocatableRaw, unit),
        allocatableRaw,
        used: formatQuantity(usedRaw, unit),
        usedRaw,
        available: formatQuantity(availableRaw, unit),
        availableRaw,
        unit,
        usagePercentage
    };
}

/**
 * Extracts node conditions with relative time formatting.
 */
function extractNodeConditions(v1Node: k8s.V1Node): NodeCondition[] {
    const conditions = v1Node.status?.conditions || [];
    
    return conditions
        .filter(c => {
            // Only include known condition types
            const validTypes: string[] = ['Ready', 'MemoryPressure', 'DiskPressure', 'PIDPressure', 'NetworkUnavailable'];
            return validTypes.includes(c.type || '');
        })
        .map(c => {
            // Convert lastTransitionTime to string if it's a Date
            let lastTransitionTime = '';
            if (c.lastTransitionTime) {
                lastTransitionTime = typeof c.lastTransitionTime === 'string'
                    ? c.lastTransitionTime
                    : c.lastTransitionTime.toISOString();
            }
            
            return {
                type: c.type as NodeCondition['type'],
                status: (c.status || 'Unknown') as NodeCondition['status'],
                reason: c.reason || '',
                message: c.message || '',
                lastTransitionTime,
                relativeTime: lastTransitionTime ? formatRelativeTime(lastTransitionTime) : ''
            };
        });
}

/**
 * Extracts pod information from V1Pod array.
 */
function extractPodInfo(v1Pods: k8s.V1Pod[]): NodePodInfo[] {
    return v1Pods.map(pod => {
        const metadata = pod.metadata || {};
        const status = pod.status || {};
        const containers = pod.spec?.containers || [];
        const containerStatuses = status.containerStatuses || [];
        
        // Sum resource requests and limits across all containers
        let totalCpuRequestRaw = 0; // Will be in cores, convert to millicores later
        let totalMemoryRequestRaw = 0;
        let totalCpuLimitRaw = 0;
        let totalMemoryLimitRaw = 0;
        
        for (const container of containers) {
            const resources = container.resources || {};
            const requests = resources.requests || {};
            const limits = resources.limits || {};
            
            if (requests.cpu) {
                totalCpuRequestRaw += parseKubernetesQuantity(requests.cpu, 'cores');
            }
            if (requests.memory) {
                totalMemoryRequestRaw += parseKubernetesQuantity(requests.memory, 'bytes');
            }
            if (limits.cpu) {
                totalCpuLimitRaw += parseKubernetesQuantity(limits.cpu, 'cores');
            }
            if (limits.memory) {
                totalMemoryLimitRaw += parseKubernetesQuantity(limits.memory, 'bytes');
            }
        }
        
        // Convert CPU from cores to millicores for raw values
        const cpuRequestRawMillicores = totalCpuRequestRaw * 1000;
        const cpuLimitRawMillicores = totalCpuLimitRaw * 1000;
        
        // Format CPU requests/limits (convert cores to millicores string if < 1 core)
        const cpuRequest = totalCpuRequestRaw > 0 
            ? (totalCpuRequestRaw < 1 ? `${cpuRequestRawMillicores}m` : String(totalCpuRequestRaw))
            : '0';
        const cpuLimit = totalCpuLimitRaw > 0
            ? (totalCpuLimitRaw < 1 ? `${cpuLimitRawMillicores}m` : String(totalCpuLimitRaw))
            : '0';
        
        // Format memory requests/limits
        const memoryRequest = totalMemoryRequestRaw > 0 
            ? formatBytesQuantity(totalMemoryRequestRaw)
            : '0';
        const memoryLimit = totalMemoryLimitRaw > 0
            ? formatBytesQuantity(totalMemoryLimitRaw)
            : '0';
        
        // Sum restart counts from all container statuses
        const restartCount = containerStatuses.reduce((sum, cs) => sum + (cs.restartCount || 0), 0);
        
        // Calculate age from creation timestamp
        let age = '';
        if (metadata.creationTimestamp) {
            const creationTimestamp = typeof metadata.creationTimestamp === 'string'
                ? metadata.creationTimestamp
                : metadata.creationTimestamp.toISOString();
            age = formatRelativeTime(creationTimestamp);
        }
        
        return {
            name: metadata.name || 'Unknown',
            namespace: metadata.namespace || 'default',
            status: status.phase || 'Unknown',
            cpuRequest,
            cpuRequestRaw: cpuRequestRawMillicores,
            memoryRequest,
            memoryRequestRaw: totalMemoryRequestRaw,
            cpuLimit,
            cpuLimitRaw: cpuLimitRawMillicores,
            memoryLimit,
            memoryLimitRaw: totalMemoryLimitRaw,
            restartCount,
            age
        };
    });
}

/**
 * Extracts node addresses from V1Node status.
 */
function extractNodeAddresses(v1Node: k8s.V1Node): NodeAddress[] {
    const addresses = v1Node.status?.addresses || [];
    
    return addresses
        .filter(addr => {
            // Only include known address types
            const validTypes: string[] = ['Hostname', 'InternalIP', 'ExternalIP', 'InternalDNS', 'ExternalDNS'];
            return validTypes.includes(addr.type || '');
        })
        .map(addr => ({
            type: addr.type as NodeAddress['type'],
            address: addr.address || ''
        }));
}

/**
 * Extracts labels from V1Node metadata.
 */
function extractLabels(v1Node: k8s.V1Node): Record<string, string> {
    return v1Node.metadata?.labels || {};
}

/**
 * Extracts taints from V1Node spec.
 */
function extractTaints(v1Node: k8s.V1Node): NodeTaint[] {
    const taints = v1Node.spec?.taints || [];
    
    return taints.map(taint => ({
        key: taint.key || '',
        value: taint.value || '',
        effect: (taint.effect || 'NoSchedule') as NodeTaint['effect']
    }));
}

/**
 * Extracts aggregate resource allocation metrics.
 */
function extractResourceAllocation(v1Node: k8s.V1Node, v1Pods: k8s.V1Pod[]): ResourceAllocation {
    const allocatable = v1Node.status?.allocatable || {};
    const allocatableCpu = allocatable.cpu || '0';
    const allocatableMemory = allocatable.memory || '0';
    
    // Aggregate requests and limits from all pods
    let totalCpuRequestsRaw = 0; // In cores
    let totalCpuLimitsRaw = 0;
    let totalMemoryRequestsRaw = 0; // In bytes
    let totalMemoryLimitsRaw = 0;
    
    for (const pod of v1Pods) {
        const containers = pod.spec?.containers || [];
        for (const container of containers) {
            const resources = container.resources || {};
            const requests = resources.requests || {};
            const limits = resources.limits || {};
            
            if (requests.cpu) {
                totalCpuRequestsRaw += parseKubernetesQuantity(requests.cpu, 'cores');
            }
            if (limits.cpu) {
                totalCpuLimitsRaw += parseKubernetesQuantity(limits.cpu, 'cores');
            }
            if (requests.memory) {
                totalMemoryRequestsRaw += parseKubernetesQuantity(requests.memory, 'bytes');
            }
            if (limits.memory) {
                totalMemoryLimitsRaw += parseKubernetesQuantity(limits.memory, 'bytes');
            }
        }
    }
    
    const allocatableCpuRaw = parseKubernetesQuantity(allocatableCpu, 'cores');
    const allocatableMemoryRaw = parseKubernetesQuantity(allocatableMemory, 'bytes');
    
    // Calculate percentages
    const cpuRequestsPercentage = allocatableCpuRaw > 0
        ? Math.round((totalCpuRequestsRaw / allocatableCpuRaw) * 100)
        : 0;
    const cpuLimitsPercentage = allocatableCpuRaw > 0
        ? Math.round((totalCpuLimitsRaw / allocatableCpuRaw) * 100)
        : 0;
    const memoryRequestsPercentage = allocatableMemoryRaw > 0
        ? Math.round((totalMemoryRequestsRaw / allocatableMemoryRaw) * 100)
        : 0;
    const memoryLimitsPercentage = allocatableMemoryRaw > 0
        ? Math.round((totalMemoryLimitsRaw / allocatableMemoryRaw) * 100)
        : 0;
    
    return {
        cpu: {
            requests: formatQuantity(totalCpuRequestsRaw, 'cores'),
            requestsRaw: totalCpuRequestsRaw,
            limits: formatQuantity(totalCpuLimitsRaw, 'cores'),
            limitsRaw: totalCpuLimitsRaw,
            allocatable: formatQuantity(allocatableCpuRaw, 'cores'),
            allocatableRaw: allocatableCpuRaw,
            requestsPercentage: cpuRequestsPercentage,
            limitsPercentage: cpuLimitsPercentage
        },
        memory: {
            requests: formatQuantity(totalMemoryRequestsRaw, 'bytes'),
            requestsRaw: totalMemoryRequestsRaw,
            limits: formatQuantity(totalMemoryLimitsRaw, 'bytes'),
            limitsRaw: totalMemoryLimitsRaw,
            allocatable: formatQuantity(allocatableMemoryRaw, 'bytes'),
            allocatableRaw: allocatableMemoryRaw,
            requestsPercentage: memoryRequestsPercentage,
            limitsPercentage: memoryLimitsPercentage
        }
    };
}

