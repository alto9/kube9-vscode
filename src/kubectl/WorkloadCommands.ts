import * as k8s from '@kubernetes/client-node';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';
import { WorkloadEntry, WorkloadHealth } from '../types/workloadData';
import { fetchPods, fetchDeployments } from '../kubernetes/resourceFetchers';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Information about a Kubernetes deployment.
 */
export interface DeploymentInfo {
    /** Name of the deployment */
    name: string;
    /** Namespace of the deployment */
    namespace: string;
    /** Number of ready replicas */
    readyReplicas: number;
    /** Total number of desired replicas */
    replicas: number;
    /** Label selector for finding pods */
    selector: string;
}

/**
 * Information about a Kubernetes statefulset.
 */
export interface StatefulSetInfo {
    /** Name of the statefulset */
    name: string;
    /** Namespace of the statefulset */
    namespace: string;
    /** Number of ready replicas */
    readyReplicas: number;
    /** Total number of desired replicas */
    replicas: number;
    /** Label selector for finding pods */
    selector: string;
}

/**
 * Information about a Kubernetes daemonset.
 */
export interface DaemonSetInfo {
    /** Name of the daemonset */
    name: string;
    /** Namespace of the daemonset */
    namespace: string;
    /** Number of nodes with ready daemon pods */
    readyNodes: number;
    /** Total number of nodes where daemon should run */
    desiredNodes: number;
    /** Label selector for finding pods */
    selector: string;
}

/**
 * Information about a Kubernetes cronjob.
 */
export interface CronJobInfo {
    name: string;
    namespace: string;
    schedule: string;
    suspended: boolean;
    lastScheduleTime?: string;
}

/**
 * Information about a Kubernetes job.
 */
export interface JobInfo {
    name: string;
    namespace: string;
    selector: string;
}

/**
 * Information about a Kubernetes pod.
 */
export interface PodInfo {
    /** Name of the pod */
    name: string;
    /** Namespace of the pod */
    namespace: string;
    /** Status phase of the pod */
    phase: string;
}

/**
 * Result of a deployment query operation.
 */
export interface DeploymentsResult {
    /**
     * Array of deployment information, empty if query failed.
     */
    deployments: DeploymentInfo[];
    
    /**
     * Error information if the deployment query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a deployment details query operation.
 */
export interface DeploymentDetailsResult {
    /**
     * Complete V1Deployment object with full deployment details, undefined if query failed.
     */
    deployment?: k8s.V1Deployment;
    
    /**
     * Error information if the deployment query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a ReplicaSets query operation.
 */
export interface ReplicaSetsResult {
    /**
     * Array of V1ReplicaSet objects owned by the deployment, empty if query failed.
     */
    replicaSets: k8s.V1ReplicaSet[];
    
    /**
     * Error information if the ReplicaSet query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a statefulset query operation.
 */
export interface StatefulSetsResult {
    /**
     * Array of statefulset information, empty if query failed.
     */
    statefulsets: StatefulSetInfo[];
    
    /**
     * Error information if the statefulset query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a daemonset query operation.
 */
export interface DaemonSetsResult {
    /**
     * Array of daemonset information, empty if query failed.
     */
    daemonsets: DaemonSetInfo[];
    
    /**
     * Error information if the daemonset query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a cronjob query operation.
 */
export interface CronJobsResult {
    /**
     * Array of cronjob information, empty if query failed.
     */
    cronjobs: CronJobInfo[];
    
    /**
     * Error information if the cronjob query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a job query operation.
 */
export interface JobsResult {
    /**
     * Array of job information, empty if query failed.
     */
    jobs: JobInfo[];
    
    /**
     * Error information if the job query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a pod query operation.
 */
export interface PodsResult {
    /**
     * Array of pod information, empty if query failed.
     */
    pods: PodInfo[];
    
    /**
     * Error information if the pod query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a scale operation.
 */
export interface ScaleResult {
    /**
     * Whether the scale operation succeeded.
     */
    success: boolean;
    
    /**
     * Error information if the scale operation failed.
     */
    error?: KubectlError;
}


/**
 * Interface for kubectl pod response items.
 */
interface PodItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    status?: {
        phase?: string;
    };
}

/**
 * Interface for kubectl statefulset response items.
 */
interface StatefulSetItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        replicas?: number;
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
    status?: {
        readyReplicas?: number;
        replicas?: number;
    };
}

/**
 * Interface for kubectl statefulset list response.
 */
interface StatefulSetListResponse {
    items?: StatefulSetItem[];
}

/**
 * Interface for kubectl daemonset response items.
 */
interface DaemonSetItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
    status?: {
        desiredNumberScheduled?: number;
        numberReady?: number;
    };
}

/**
 * Interface for kubectl daemonset list response.
 */
interface DaemonSetListResponse {
    items?: DaemonSetItem[];
}

/**
 * Interface for kubectl pod list response.
 */
interface PodListResponse {
    items?: PodItem[];
}

/**
 * Interface for kubectl cronjob response items.
 */
interface CronJobItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        schedule?: string;
        suspend?: boolean;
    };
    status?: {
        lastScheduleTime?: string;
    };
}

/**
 * Interface for kubectl cronjob list response.
 */
interface CronJobListResponse {
    items?: CronJobItem[];
}

/**
 * Interface for kubectl job response items.
 */
interface JobItem {
    metadata?: {
        name?: string;
        namespace?: string;
        ownerReferences?: Array<{
            kind?: string;
            name?: string;
            uid?: string;
        }>;
    };
    spec?: {
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
}

/**
 * Interface for kubectl job list response.
 */
interface JobListResponse {
    items?: JobItem[];
}

/**
 * Interface for kubectl deployment response items with creationTimestamp.
 * Used by getDeploymentsForNamespace to return WorkloadEntry objects.
 */
interface DeploymentItemWithTimestamp {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        replicas?: number;
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
    status?: {
        readyReplicas?: number;
        replicas?: number;
    };
}

/**
 * Interface for kubectl statefulset response items with creationTimestamp.
 * Used by getStatefulSetsForNamespace to return WorkloadEntry objects.
 */
interface StatefulSetItemWithTimestamp {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        replicas?: number;
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
    status?: {
        readyReplicas?: number;
        replicas?: number;
    };
}

/**
 * Interface for kubectl daemonset response items with creationTimestamp.
 * Used by getDaemonSetsForNamespace to return WorkloadEntry objects.
 */
interface DaemonSetItemWithTimestamp {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        selector?: {
            matchLabels?: {
                [key: string]: string;
            };
        };
    };
    status?: {
        desiredNumberScheduled?: number;
        numberReady?: number;
    };
}

/**
 * Interface for kubectl cronjob response items with creationTimestamp.
 * Used by getCronJobsForNamespace to return WorkloadEntry objects.
 */
interface CronJobItemWithTimestamp {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        schedule?: string;
        suspend?: boolean;
        jobTemplate?: {
            spec?: {
                selector?: {
                    matchLabels?: {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    status?: {
        lastScheduleTime?: string;
    };
}

/**
 * Interface for kubectl workload list response with timestamps.
 */
interface WorkloadListResponse<T> {
    items?: T[];
}

/**
 * Utility class for kubectl workload operations.
 */
export class WorkloadCommands {
    /**
     * Retrieves the list of deployments using the Kubernetes API client.
     * Uses direct API calls with caching to improve performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @param namespace Optional namespace to filter deployments (if not provided, fetches from all namespaces)
     * @returns DeploymentsResult with deployments array and optional error information
     */
    public static async getDeployments(
        kubeconfigPath: string,
        contextName: string,
        namespace?: string
    ): Promise<DeploymentsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = namespace 
                ? `${contextName}:deployments:${namespace}`
                : `${contextName}:deployments`;
            const cached = cache.get<DeploymentInfo[]>(cacheKey);
            if (cached) {
                return { deployments: cached };
            }
            
            // Fetch from API
            const v1Deployments = await fetchDeployments({ 
                namespace, 
                timeout: 10 
            });
            
            // Transform k8s.V1Deployment[] to DeploymentInfo[] format
            const deployments: DeploymentInfo[] = v1Deployments.map(deploy => {
                const name = deploy.metadata?.name || 'Unknown';
                const deployNamespace = deploy.metadata?.namespace || 'default';
                const replicas = deploy.spec?.replicas || 0;
                const readyReplicas = deploy.status?.readyReplicas || 0;
                
                // Build label selector from matchLabels
                const matchLabels = deploy.spec?.selector?.matchLabels || {};
                const selector = Object.entries(matchLabels)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(',');
                
                return {
                    name,
                    namespace: deployNamespace,
                    readyReplicas,
                    replicas,
                    selector
                };
            });
            
            // Sort deployments by namespace, then by name
            deployments.sort((a, b) => {
                const nsCompare = a.namespace.localeCompare(b.namespace);
                return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
            });
            
            // Cache result
            cache.set(cacheKey, deployments, CACHE_TTL.DEPLOYMENTS);
            
            return { deployments };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Deployment query failed for context ${contextName}${namespace ? ` in namespace ${namespace}` : ''}: ${kubectlError.getDetails()}`);
            
            return {
                deployments: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves detailed information for a specific deployment from a cluster using the Kubernetes API client.
     * Uses direct API calls to fetch complete V1Deployment details.
     * 
     * @param deploymentName Name of the deployment to retrieve details for
     * @param namespace Namespace where the deployment is located
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns DeploymentDetailsResult with V1Deployment object and optional error information
     */
    public static async getDeploymentDetails(
        deploymentName: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<DeploymentDetailsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch single deployment from API
            const v1Deployment = await apiClient.apps.readNamespacedDeployment({
                name: deploymentName,
                namespace: namespace
            });
            
            return {
                deployment: v1Deployment,
                error: undefined
            };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Deployment details query failed for deployment ${deploymentName} in namespace ${namespace} in context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                deployment: undefined,
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of ReplicaSets owned by a specific deployment using the Kubernetes API client.
     * Uses direct API calls to fetch ReplicaSets and filters by owner reference.
     * 
     * @param deploymentName Name of the deployment to retrieve related ReplicaSets for
     * @param deploymentUid UID of the deployment to match owner references
     * @param namespace Namespace where the deployment and ReplicaSets are located
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns ReplicaSetsResult with ReplicaSets array and optional error information
     */
    public static async getRelatedReplicaSets(
        deploymentName: string,
        deploymentUid: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<ReplicaSetsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch all ReplicaSets in the namespace from API
            const response = await apiClient.apps.listNamespacedReplicaSet({
                namespace: namespace,
                timeoutSeconds: 10
            });
            
            const allReplicaSets = response.items || [];
            
            // Filter ReplicaSets by owner reference matching deployment UID
            const filtered = allReplicaSets.filter(rs =>
                rs.metadata?.ownerReferences?.some(ref =>
                    ref.kind === 'Deployment' &&
                    ref.name === deploymentName &&
                    ref.uid === deploymentUid
                )
            );
            
            return {
                replicaSets: filtered,
                error: undefined
            };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`ReplicaSet query failed for deployment ${deploymentName} in namespace ${namespace} in context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                replicaSets: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of statefulsets from all namespaces using kubectl.
     * Uses kubectl get statefulsets command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns StatefulSetsResult with statefulsets array and optional error information
     */
    public static async getStatefulSets(
        kubeconfigPath: string,
        contextName: string
    ): Promise<StatefulSetsResult> {
        try {
            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'statefulsets',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get statefulsets with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: StatefulSetListResponse = JSON.parse(stdout);
            
            // Extract statefulset information from the items array
            const statefulsets: StatefulSetInfo[] = response.items?.map((item: StatefulSetItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'default';
                const replicas = item.spec?.replicas || 0;
                const readyReplicas = item.status?.readyReplicas || 0;
                
                // Build label selector from matchLabels
                const matchLabels = item.spec?.selector?.matchLabels || {};
                const selector = Object.entries(matchLabels)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(',');
                
                return {
                    name,
                    namespace,
                    readyReplicas,
                    replicas,
                    selector
                };
            }) || [];
            
            // Sort statefulsets by namespace, then by name
            statefulsets.sort((a, b) => {
                const nsCompare = a.namespace.localeCompare(b.namespace);
                return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
            });
            
            return { statefulsets };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`StatefulSet query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                statefulsets: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of pods for a specific statefulset using kubectl.
     * Uses label selector to find pods belonging to the statefulset.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param statefulsetName Name of the statefulset
     * @param namespace Namespace of the statefulset
     * @param labelSelector Label selector for finding pods
     * @returns PodsResult with pods array and optional error information
     */
    public static async getPodsForStatefulSet(
        kubeconfigPath: string,
        contextName: string,
        statefulsetName: string,
        namespace: string,
        labelSelector: string
    ): Promise<PodsResult> {
        try {
            // If no label selector provided, return empty array
            if (!labelSelector) {
                return { pods: [] };
            }

            // Execute kubectl get pods with label selector
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'pods',
                    '-n',
                    namespace,
                    '--selector',
                    labelSelector,
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: PodListResponse = JSON.parse(stdout);
            
            // Extract pod information from the items array
            const pods: PodInfo[] = response.items?.map((item: PodItem) => {
                const name = item.metadata?.name || 'Unknown';
                const podNamespace = item.metadata?.namespace || namespace;
                const phase = item.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace: podNamespace,
                    phase
                };
            }) || [];
            
            // Sort pods alphabetically by name
            pods.sort((a, b) => a.name.localeCompare(b.name));
            
            return { pods };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for statefulset ${statefulsetName} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                pods: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of pods for a specific deployment using kubectl.
     * Uses label selector to find pods belonging to the deployment.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param deploymentName Name of the deployment
     * @param namespace Namespace of the deployment
     * @param labelSelector Label selector for finding pods
     * @returns PodsResult with pods array and optional error information
     */
    public static async getPodsForDeployment(
        kubeconfigPath: string,
        contextName: string,
        deploymentName: string,
        namespace: string,
        labelSelector: string
    ): Promise<PodsResult> {
        try {
            // If no label selector provided, return empty array
            if (!labelSelector) {
                return { pods: [] };
            }

            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:pods:${namespace}:${labelSelector}`;
            const cached = cache.get<PodInfo[]>(cacheKey);
            if (cached) {
                return { pods: cached };
            }

            // Fetch from API
            const v1Pods = await fetchPods({ 
                namespace, 
                labelSelector, 
                timeout: 10 
            });
            
            // Transform k8s.V1Pod[] to PodInfo[] format
            const pods: PodInfo[] = v1Pods.map(pod => {
                const name = pod.metadata?.name || 'Unknown';
                const podNamespace = pod.metadata?.namespace || namespace;
                const phase = pod.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace: podNamespace,
                    phase
                };
            });
            
            // Sort pods alphabetically by name
            pods.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache result
            cache.set(cacheKey, pods, CACHE_TTL.PODS);
            
            return { pods };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for deployment ${deploymentName} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                pods: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of daemonsets from all namespaces using kubectl.
     * Uses kubectl get daemonsets command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns DaemonSetsResult with daemonsets array and optional error information
     */
    public static async getDaemonSets(
        kubeconfigPath: string,
        contextName: string
    ): Promise<DaemonSetsResult> {
        try {
            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'daemonsets',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get daemonsets with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: DaemonSetListResponse = JSON.parse(stdout);
            
            // Extract daemonset information from the items array
            const daemonsets: DaemonSetInfo[] = response.items?.map((item: DaemonSetItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'default';
                const desiredNodes = item.status?.desiredNumberScheduled || 0;
                const readyNodes = item.status?.numberReady || 0;
                
                // Build label selector from matchLabels
                const matchLabels = item.spec?.selector?.matchLabels || {};
                const selector = Object.entries(matchLabels)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(',');
                
                return {
                    name,
                    namespace,
                    readyNodes,
                    desiredNodes,
                    selector
                };
            }) || [];
            
            // Sort daemonsets by namespace, then by name
            daemonsets.sort((a, b) => {
                const nsCompare = a.namespace.localeCompare(b.namespace);
                return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
            });
            
            return { daemonsets };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`DaemonSet query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                daemonsets: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of pods for a specific daemonset using kubectl.
     * Uses label selector to find pods belonging to the daemonset.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param daemonsetName Name of the daemonset
     * @param namespace Namespace of the daemonset
     * @param labelSelector Label selector for finding pods
     * @returns PodsResult with pods array and optional error information
     */
    public static async getPodsForDaemonSet(
        kubeconfigPath: string,
        contextName: string,
        daemonsetName: string,
        namespace: string,
        labelSelector: string
    ): Promise<PodsResult> {
        try {
            // If no label selector provided, return empty array
            if (!labelSelector) {
                return { pods: [] };
            }

            // Execute kubectl get pods with label selector
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'pods',
                    '-n',
                    namespace,
                    '--selector',
                    labelSelector,
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: PodListResponse = JSON.parse(stdout);
            
            // Extract pod information from the items array
            const pods: PodInfo[] = response.items?.map((item: PodItem) => {
                const name = item.metadata?.name || 'Unknown';
                const podNamespace = item.metadata?.namespace || namespace;
                const phase = item.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace: podNamespace,
                    phase
                };
            }) || [];
            
            // Sort pods alphabetically by name
            pods.sort((a, b) => a.name.localeCompare(b.name));
            
            return { pods };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for daemonset ${daemonsetName} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                pods: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of cronjobs from all namespaces using kubectl.
     * Uses kubectl get cronjobs command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns CronJobsResult with cronjobs array and optional error information
     */
    public static async getCronJobs(
        kubeconfigPath: string,
        contextName: string
    ): Promise<CronJobsResult> {
        try {
            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'cronjobs',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get cronjobs with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: CronJobListResponse = JSON.parse(stdout);
            
            // Extract cronjob information from the items array
            const cronjobs: CronJobInfo[] = response.items?.map((item: CronJobItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'default';
                const schedule = item.spec?.schedule || 'Unknown';
                const suspended = item.spec?.suspend || false;
                const lastScheduleTime = item.status?.lastScheduleTime;
                
                return {
                    name,
                    namespace,
                    schedule,
                    suspended,
                    lastScheduleTime
                };
            }) || [];
            
            // Sort cronjobs by namespace, then by name
            cronjobs.sort((a, b) => {
                const nsCompare = a.namespace.localeCompare(b.namespace);
                return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
            });
            
            return { cronjobs };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`CronJob query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                cronjobs: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of jobs owned by a specific cronjob using kubectl.
     * Queries all jobs in the namespace and filters by owner reference.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param cronjobName Name of the cronjob
     * @param namespace Namespace of the cronjob
     * @returns JobsResult with jobs array and optional error information
     */
    public static async getJobsForCronJob(
        kubeconfigPath: string,
        contextName: string,
        cronjobName: string,
        namespace: string
    ): Promise<JobsResult> {
        try {
            // Execute kubectl get jobs in the namespace
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'jobs',
                    '-n',
                    namespace,
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: JobListResponse = JSON.parse(stdout);
            
            // Filter jobs that are owned by this cronjob
            const jobs: JobInfo[] = response.items?.filter((item: JobItem) => {
                const ownerRefs = item.metadata?.ownerReferences || [];
                return ownerRefs.some(ref => 
                    ref.kind === 'CronJob' && ref.name === cronjobName
                );
            }).map((item: JobItem) => {
                const name = item.metadata?.name || 'Unknown';
                const jobNamespace = item.metadata?.namespace || namespace;
                
                // Build label selector from matchLabels
                const matchLabels = item.spec?.selector?.matchLabels || {};
                const selector = Object.entries(matchLabels)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(',');
                
                return {
                    name,
                    namespace: jobNamespace,
                    selector
                };
            }) || [];
            
            // Sort jobs alphabetically by name
            jobs.sort((a, b) => a.name.localeCompare(b.name));
            
            return { jobs };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Job query failed for cronjob ${cronjobName} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                jobs: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of pods for a specific job using kubectl.
     * Uses label selector to find pods belonging to the job.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param jobName Name of the job
     * @param namespace Namespace of the job
     * @param labelSelector Label selector for finding pods
     * @returns PodsResult with pods array and optional error information
     */
    public static async getPodsForJob(
        kubeconfigPath: string,
        contextName: string,
        jobName: string,
        namespace: string,
        labelSelector: string
    ): Promise<PodsResult> {
        try {
            // If no label selector provided, return empty array
            if (!labelSelector) {
                return { pods: [] };
            }

            // Execute kubectl get pods with label selector
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'pods',
                    '-n',
                    namespace,
                    '--selector',
                    labelSelector,
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: PodListResponse = JSON.parse(stdout);
            
            // Extract pod information from the items array
            const pods: PodInfo[] = response.items?.map((item: PodItem) => {
                const name = item.metadata?.name || 'Unknown';
                const podNamespace = item.metadata?.namespace || namespace;
                const phase = item.status?.phase || 'Unknown';
                
                return {
                    name,
                    namespace: podNamespace,
                    phase
                };
            }) || [];
            
            // Sort pods alphabetically by name
            pods.sort((a, b) => a.name.localeCompare(b.name));
            
            return { pods };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for job ${jobName} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                pods: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves deployments for a namespace and returns WorkloadEntry objects.
     * Used by the namespace webview to display workload information with health status.
     * 
     * @param namespace Namespace to query, or null for all namespaces
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Promise<WorkloadEntry[]> Array of workload entries with health field undefined
     * @throws Error if kubectl command fails
     */
    public static async getDeploymentsForNamespace(
        namespace: string | null,
        kubeconfigPath: string,
        contextName: string
    ): Promise<WorkloadEntry[]> {
        // Build kubectl command arguments
        const args = ['get', 'deployments'];
        
        // Handle namespace parameter
        if (namespace === null) {
            args.push('--all-namespaces');
        } else {
            args.push(`--namespace=${namespace}`);
        }
        
        args.push(
            '--output=json',
            `--kubeconfig=${kubeconfigPath}`,
            `--context=${contextName}`
        );

        // Execute kubectl get deployments with JSON output
        const { stdout } = await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        const response: WorkloadListResponse<DeploymentItemWithTimestamp> = JSON.parse(stdout);
        
        // Extract workload entry information from the items array
        const workloads: WorkloadEntry[] = response.items?.map((item: DeploymentItemWithTimestamp) => {
            const name = item.metadata?.name || 'Unknown';
            const itemNamespace = item.metadata?.namespace || 'default';
            const desiredReplicas = item.spec?.replicas || 0;
            const readyReplicas = item.status?.readyReplicas || 0;
            const creationTimestamp = item.metadata?.creationTimestamp || new Date().toISOString();
            
            // Build label selector from matchLabels
            const matchLabels = item.spec?.selector?.matchLabels || {};
            const selector = Object.entries(matchLabels)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');
            
            return {
                name,
                namespace: itemNamespace,
                health: undefined as unknown as WorkloadHealth, // Health will be calculated by health analyzer
                readyReplicas,
                desiredReplicas,
                selector,
                creationTimestamp
            };
        }) || [];
        
        // Sort workloads by namespace, then by name
        workloads.sort((a, b) => {
            const nsCompare = a.namespace.localeCompare(b.namespace);
            return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
        });
        
        return workloads;
    }

    /**
     * Retrieves statefulsets for a namespace and returns WorkloadEntry objects.
     * Used by the namespace webview to display workload information with health status.
     * 
     * @param namespace Namespace to query, or null for all namespaces
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Promise<WorkloadEntry[]> Array of workload entries with health field undefined
     * @throws Error if kubectl command fails
     */
    public static async getStatefulSetsForNamespace(
        namespace: string | null,
        kubeconfigPath: string,
        contextName: string
    ): Promise<WorkloadEntry[]> {
        // Build kubectl command arguments
        const args = ['get', 'statefulsets'];
        
        // Handle namespace parameter
        if (namespace === null) {
            args.push('--all-namespaces');
        } else {
            args.push(`--namespace=${namespace}`);
        }
        
        args.push(
            '--output=json',
            `--kubeconfig=${kubeconfigPath}`,
            `--context=${contextName}`
        );

        // Execute kubectl get statefulsets with JSON output
        const { stdout } = await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        const response: WorkloadListResponse<StatefulSetItemWithTimestamp> = JSON.parse(stdout);
        
        // Extract workload entry information from the items array
        const workloads: WorkloadEntry[] = response.items?.map((item: StatefulSetItemWithTimestamp) => {
            const name = item.metadata?.name || 'Unknown';
            const itemNamespace = item.metadata?.namespace || 'default';
            const desiredReplicas = item.spec?.replicas || 0;
            const readyReplicas = item.status?.readyReplicas || 0;
            const creationTimestamp = item.metadata?.creationTimestamp || new Date().toISOString();
            
            // Build label selector from matchLabels
            const matchLabels = item.spec?.selector?.matchLabels || {};
            const selector = Object.entries(matchLabels)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');
            
            return {
                name,
                namespace: itemNamespace,
                health: undefined as unknown as WorkloadHealth, // Health will be calculated by health analyzer
                readyReplicas,
                desiredReplicas,
                selector,
                creationTimestamp
            };
        }) || [];
        
        // Sort workloads by namespace, then by name
        workloads.sort((a, b) => {
            const nsCompare = a.namespace.localeCompare(b.namespace);
            return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
        });
        
        return workloads;
    }

    /**
     * Retrieves daemonsets for a namespace and returns WorkloadEntry objects.
     * Used by the namespace webview to display workload information with health status.
     * 
     * @param namespace Namespace to query, or null for all namespaces
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Promise<WorkloadEntry[]> Array of workload entries with health field undefined
     * @throws Error if kubectl command fails
     */
    public static async getDaemonSetsForNamespace(
        namespace: string | null,
        kubeconfigPath: string,
        contextName: string
    ): Promise<WorkloadEntry[]> {
        // Build kubectl command arguments
        const args = ['get', 'daemonsets'];
        
        // Handle namespace parameter
        if (namespace === null) {
            args.push('--all-namespaces');
        } else {
            args.push(`--namespace=${namespace}`);
        }
        
        args.push(
            '--output=json',
            `--kubeconfig=${kubeconfigPath}`,
            `--context=${contextName}`
        );

        // Execute kubectl get daemonsets with JSON output
        const { stdout } = await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        const response: WorkloadListResponse<DaemonSetItemWithTimestamp> = JSON.parse(stdout);
        
        // Extract workload entry information from the items array
        const workloads: WorkloadEntry[] = response.items?.map((item: DaemonSetItemWithTimestamp) => {
            const name = item.metadata?.name || 'Unknown';
            const itemNamespace = item.metadata?.namespace || 'default';
            const desiredReplicas = item.status?.desiredNumberScheduled || 0;
            const readyReplicas = item.status?.numberReady || 0;
            const creationTimestamp = item.metadata?.creationTimestamp || new Date().toISOString();
            
            // Build label selector from matchLabels
            const matchLabels = item.spec?.selector?.matchLabels || {};
            const selector = Object.entries(matchLabels)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');
            
            return {
                name,
                namespace: itemNamespace,
                health: undefined as unknown as WorkloadHealth, // Health will be calculated by health analyzer
                readyReplicas,
                desiredReplicas,
                selector,
                creationTimestamp
            };
        }) || [];
        
        // Sort workloads by namespace, then by name
        workloads.sort((a, b) => {
            const nsCompare = a.namespace.localeCompare(b.namespace);
            return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
        });
        
        return workloads;
    }

    /**
     * Retrieves cronjobs for a namespace and returns WorkloadEntry objects.
     * Used by the namespace webview to display workload information with health status.
     * Note: CronJobs don't have replicas, so both readyReplicas and desiredReplicas are set to 0.
     * 
     * @param namespace Namespace to query, or null for all namespaces
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Promise<WorkloadEntry[]> Array of workload entries with health field undefined
     * @throws Error if kubectl command fails
     */
    public static async getCronJobsForNamespace(
        namespace: string | null,
        kubeconfigPath: string,
        contextName: string
    ): Promise<WorkloadEntry[]> {
        // Build kubectl command arguments
        const args = ['get', 'cronjobs'];
        
        // Handle namespace parameter
        if (namespace === null) {
            args.push('--all-namespaces');
        } else {
            args.push(`--namespace=${namespace}`);
        }
        
        args.push(
            '--output=json',
            `--kubeconfig=${kubeconfigPath}`,
            `--context=${contextName}`
        );

        // Execute kubectl get cronjobs with JSON output
        const { stdout } = await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        const response: WorkloadListResponse<CronJobItemWithTimestamp> = JSON.parse(stdout);
        
        // Extract workload entry information from the items array
        const workloads: WorkloadEntry[] = response.items?.map((item: CronJobItemWithTimestamp) => {
            const name = item.metadata?.name || 'Unknown';
            const itemNamespace = item.metadata?.namespace || 'default';
            const creationTimestamp = item.metadata?.creationTimestamp || new Date().toISOString();
            
            // CronJobs don't have replicas
            const desiredReplicas = 0;
            const readyReplicas = 0;
            
            // Extract label selector from jobTemplate if available
            const matchLabels = item.spec?.jobTemplate?.spec?.selector?.matchLabels || {};
            const selector = Object.entries(matchLabels)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');
            
            return {
                name,
                namespace: itemNamespace,
                health: undefined as unknown as WorkloadHealth, // Health will be calculated by health analyzer
                readyReplicas,
                desiredReplicas,
                selector,
                creationTimestamp
            };
        }) || [];
        
        // Sort workloads by namespace, then by name
        workloads.sort((a, b) => {
            const nsCompare = a.namespace.localeCompare(b.namespace);
            return nsCompare !== 0 ? nsCompare : a.name.localeCompare(b.name);
        });
        
        return workloads;
    }

    /**
     * Retrieves the current replica count for a specific workload using kubectl.
     * Uses kubectl get command with jsonpath to extract the replica count.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param kind The workload kind (Deployment, StatefulSet, or ReplicaSet)
     * @param name Name of the workload
     * @param namespace Namespace of the workload
     * @returns Promise<number | null> The current replica count, or null if an error occurred
     */
    public static async getCurrentReplicaCount(
        kubeconfigPath: string,
        contextName: string,
        kind: 'Deployment' | 'StatefulSet' | 'ReplicaSet',
        name: string,
        namespace: string
    ): Promise<number | null> {
        try {
            // Convert kind to lowercase for kubectl command
            const kindLower = kind.toLowerCase();
            
            // Build kubectl command arguments
            const args = [
                'get',
                `${kindLower}/${name}`,
                '-n',
                namespace,
                '-o',
                'jsonpath={.spec.replicas}',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get command with jsonpath
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                    env: { ...process.env }
                }
            );

            // Parse the result
            const replicaString = stdout.trim();
            
            // Handle empty or missing replicas field
            if (!replicaString || replicaString === '') {
                return 0;
            }
            
            // Parse as integer
            const replicaCount = parseInt(replicaString, 10);
            
            // Check if parsing was successful
            if (isNaN(replicaCount)) {
                return 0;
            }
            
            return replicaCount;
        } catch (error: unknown) {
            // kubectl failed - return null to indicate error
            console.log(`Failed to get replica count for ${kind} ${name} in namespace ${namespace}: ${error}`);
            return null;
        }
    }

    /**
     * Scales a workload to a specified replica count using kubectl scale command.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @param kind The workload kind (Deployment, StatefulSet, or ReplicaSet)
     * @param name Name of the workload
     * @param namespace Namespace of the workload
     * @param replicas Desired number of replicas
     * @returns Promise<ScaleResult> Result indicating success or failure with error details
     */
    public static async scaleWorkload(
        kubeconfigPath: string,
        contextName: string,
        kind: 'Deployment' | 'StatefulSet' | 'ReplicaSet',
        name: string,
        namespace: string,
        replicas: number
    ): Promise<ScaleResult> {
        try {
            // Convert kind to lowercase for kubectl command
            const kindLower = kind.toLowerCase();
            
            // Build kubectl scale command arguments
            const args = [
                'scale',
                `${kindLower}/${name}`,
                `--replicas=${replicas}`,
                '-n',
                namespace,
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl scale command
            await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                    env: { ...process.env }
                }
            );

            // Scale operation succeeded
            return { success: true };
        } catch (error: unknown) {
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Scale operation failed for ${kind} ${name} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            return {
                success: false,
                error: kubectlError
            };
        }
    }
}

