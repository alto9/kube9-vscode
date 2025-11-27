import { execFile } from 'child_process';
import { promisify } from 'util';
import { WorkloadCounts, NodeInfo, OperatorDashboardData, OperatorMetrics } from './types';
import { ConfigurationCommands } from '../kubectl/ConfigurationCommands';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 5000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Type for the kubectl execution function.
 * Used internally and exposed for testing.
 */
export type KubectlExecFn = (
    command: string,
    args: string[],
    options: { timeout?: number; maxBuffer?: number; env?: NodeJS.ProcessEnv }
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Internal kubectl execution function.
 * Can be overridden via _setExecFn for testing.
 */
let kubectlExecFn: KubectlExecFn = execFileAsync;

/**
 * Interface for kubectl namespace list response.
 */
interface NamespaceListResponse {
    items?: Array<{
        metadata?: {
            name?: string;
        };
    }>;
}

/**
 * Interface for kubectl workload list response.
 */
interface WorkloadListResponse {
    items?: Array<unknown>;
}

/**
 * Interface for kubectl node list response.
 */
interface NodeListResponse {
    items?: Array<{
        metadata?: {
            name?: string;
        };
        status?: {
            conditions?: Array<{
                type?: string;
                status?: string;
            }>;
            capacity?: {
                cpu?: string;
                memory?: string;
            };
        };
    }>;
}

/**
 * Interface for operator dashboard data from ConfigMap.
 */
interface OperatorDashboardDataRaw {
    namespaceCount?: number;
    workloads?: {
        deployments?: number;
        statefulsets?: number;
        daemonsets?: number;
        replicasets?: number;
        jobs?: number;
        cronjobs?: number;
        pods?: number;
    };
    nodes?: {
        totalNodes?: number;
        readyNodes?: number;
        cpuCapacity?: string;
        memoryCapacity?: string;
    };
    operatorMetrics?: {
        collectorsRunning?: number;
        dataPointsCollected?: number;
        lastCollectionTime?: string;
    };
    lastUpdated?: string;
}

/**
 * Utility class for querying kubectl to gather dashboard statistics.
 */
export class DashboardDataProvider {
    /**
     * Retrieves the count of namespaces in the cluster.
     * Uses kubectl get namespaces command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Number of namespaces, or 0 on error
     */
    public static async getNamespaceCount(
        kubeconfigPath: string,
        contextName: string
    ): Promise<number> {
        try {
            // Execute kubectl get namespaces with JSON output
            const { stdout } = await kubectlExecFn(
                'kubectl',
                [
                    'get',
                    'namespaces',
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
            const response: NamespaceListResponse = JSON.parse(stdout);
            
            // Return the count of namespaces
            return response.items?.length || 0;
        } catch (error: unknown) {
            // kubectl failed - return 0 as default
            console.log(`Namespace count query failed for context ${contextName}:`, error);
            return 0;
        }
    }

    /**
     * Retrieves counts of different workload types across all namespaces.
     * Queries kubectl for deployments, statefulsets, daemonsets, replicasets, jobs, cronjobs, and pods.
     * All queries execute in parallel for performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns WorkloadCounts object with counts for all workload types
     */
    public static async getWorkloadCounts(
        kubeconfigPath: string,
        contextName: string
    ): Promise<WorkloadCounts> {
        // Define queries for all workload types
        const queries = [
            { key: 'deployments', resource: 'deployments.apps' },
            { key: 'statefulsets', resource: 'statefulsets.apps' },
            { key: 'daemonsets', resource: 'daemonsets.apps' },
            { key: 'replicasets', resource: 'replicasets.apps' },
            { key: 'jobs', resource: 'jobs.batch' },
            { key: 'cronjobs', resource: 'cronjobs.batch' },
            { key: 'pods', resource: 'pods' }
        ];

        // Execute all queries in parallel
        const results = await Promise.allSettled(
            queries.map(async ({ key, resource }) => {
                try {
                    const { stdout } = await kubectlExecFn(
                        'kubectl',
                        [
                            'get',
                            resource,
                            '--all-namespaces',
                            '--output=json',
                            `--kubeconfig=${kubeconfigPath}`,
                            `--context=${contextName}`
                        ],
                        {
                            timeout: KUBECTL_TIMEOUT_MS,
                            maxBuffer: 50 * 1024 * 1024,
                            env: { ...process.env }
                        }
                    );

                    const response: WorkloadListResponse = JSON.parse(stdout);
                    return { key, count: response.items?.length || 0 };
                } catch (error) {
                    // On error, return 0 for this workload type
                    console.log(`Workload query failed for ${resource} in context ${contextName}:`, error);
                    return { key, count: 0 };
                }
            })
        );

        // Build the workload counts object from results
        const counts: WorkloadCounts = {
            deployments: 0,
            statefulsets: 0,
            daemonsets: 0,
            replicasets: 0,
            jobs: 0,
            cronjobs: 0,
            pods: 0
        };

        results.forEach((result, index) => {
            const key = queries[index].key as keyof WorkloadCounts;
            if (result.status === 'fulfilled') {
                counts[key] = result.value.count;
            } else {
                counts[key] = 0;
            }
        });

        return counts;
    }

    /**
     * Retrieves node information including health status and capacity.
     * Uses kubectl get nodes command with JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns NodeInfo object with node statistics
     */
    public static async getNodeInfo(
        kubeconfigPath: string,
        contextName: string
    ): Promise<NodeInfo> {
        try {
            // Execute kubectl get nodes with JSON output
            const { stdout } = await kubectlExecFn(
                'kubectl',
                [
                    'get',
                    'nodes',
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024,
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: NodeListResponse = JSON.parse(stdout);
            const nodes = response.items || [];

            // Count total nodes
            const totalNodes = nodes.length;

            // Count ready nodes
            const readyNodes = nodes.filter(node => {
                const conditions = node.status?.conditions || [];
                const readyCondition = conditions.find(c => c.type === 'Ready');
                return readyCondition?.status === 'True';
            }).length;

            // Aggregate CPU and memory capacity
            let totalCpu = 0;
            let totalMemory = 0;

            nodes.forEach(node => {
                const capacity = node.status?.capacity;
                if (capacity) {
                    totalCpu += this.parseCpuString(capacity.cpu || '0');
                    totalMemory += this.parseMemoryString(capacity.memory || '0');
                }
            });

            return {
                totalNodes,
                readyNodes,
                cpuCapacity: this.formatCpu(totalCpu),
                memoryCapacity: this.formatMemory(totalMemory)
            };
        } catch (error: unknown) {
            // kubectl failed - return default values
            console.log(`Node info query failed for context ${contextName}:`, error);
            return {
                totalNodes: 0,
                readyNodes: 0,
                cpuCapacity: 'N/A',
                memoryCapacity: 'N/A'
            };
        }
    }

    /**
     * Retrieves operator-provided dashboard data from the kube9-dashboard-data ConfigMap.
     * This data is pre-aggregated by the operator for better performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns OperatorDashboardData object with all dashboard statistics, or null if ConfigMap doesn't exist
     */
    public static async getOperatorDashboardData(
        kubeconfigPath: string,
        contextName: string
    ): Promise<OperatorDashboardData | null> {
        try {
            // Query the operator dashboard data ConfigMap
            const result = await ConfigurationCommands.getConfigMap(
                'kube9-dashboard-data',
                'kube9-system',
                kubeconfigPath,
                contextName
            );

            // Handle errors (ConfigMap not found is expected if operator not providing data)
            if (result.error || !result.configMap) {
                console.log(`Operator dashboard data ConfigMap not found for context ${contextName} (expected if operator not installed)`);
                return null;
            }

            // Check if ConfigMap has data field
            if (!result.configMap.data || !result.configMap.data.dashboard) {
                console.log(`Operator dashboard data ConfigMap has no dashboard data for context ${contextName}`);
                return null;
            }

            // Parse the dashboard JSON data
            let dashboardData: OperatorDashboardDataRaw;
            try {
                dashboardData = JSON.parse(result.configMap.data.dashboard) as OperatorDashboardDataRaw;
            } catch (parseError) {
                const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                console.log(`Failed to parse operator dashboard data JSON for context ${contextName}:`, errorMessage);
                return null;
            }

            // Validate and extract required fields with null safety
            if (!dashboardData) {
                console.log(`Operator dashboard data is empty for context ${contextName}`);
                return null;
            }

            // Extract namespace count
            const namespaceCount = typeof dashboardData.namespaceCount === 'number' 
                ? dashboardData.namespaceCount 
                : 0;

            // Extract workload counts
            const workloads: WorkloadCounts = {
                deployments: dashboardData.workloads?.deployments || 0,
                statefulsets: dashboardData.workloads?.statefulsets || 0,
                daemonsets: dashboardData.workloads?.daemonsets || 0,
                replicasets: dashboardData.workloads?.replicasets || 0,
                jobs: dashboardData.workloads?.jobs || 0,
                cronjobs: dashboardData.workloads?.cronjobs || 0,
                pods: dashboardData.workloads?.pods || 0
            };

            // Extract node information
            const nodes: NodeInfo = {
                totalNodes: dashboardData.nodes?.totalNodes || 0,
                readyNodes: dashboardData.nodes?.readyNodes || 0,
                cpuCapacity: dashboardData.nodes?.cpuCapacity || 'N/A',
                memoryCapacity: dashboardData.nodes?.memoryCapacity || 'N/A'
            };

            // Extract operator metrics
            const operatorMetrics: OperatorMetrics = {
                collectorsRunning: dashboardData.operatorMetrics?.collectorsRunning || 0,
                dataPointsCollected: dashboardData.operatorMetrics?.dataPointsCollected || 0,
                lastCollectionTime: this.parseDate(dashboardData.operatorMetrics?.lastCollectionTime)
            };

            // Extract last updated timestamp
            const lastUpdated = this.parseDate(dashboardData.lastUpdated);

            return {
                namespaceCount,
                workloads,
                nodes,
                operatorMetrics,
                lastUpdated
            };
        } catch (error: unknown) {
            // Unexpected error - log and return null
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`Unexpected error querying operator dashboard data for context ${contextName}:`, errorMessage);
            return null;
        }
    }

    /**
     * Parses an ISO date string to a Date object.
     * Returns current date if parsing fails.
     * 
     * @param dateString ISO date string
     * @returns Date object
     */
    private static parseDate(dateString: string | undefined): Date {
        if (!dateString) {
            return new Date();
        }

        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return new Date();
            }
            return date;
        } catch (error) {
            return new Date();
        }
    }

    /**
     * Parses a Kubernetes CPU string to millicores.
     * Examples: "2" -> 2000, "500m" -> 500, "1.5" -> 1500
     * 
     * @param cpuString CPU string from Kubernetes
     * @returns CPU in millicores
     */
    private static parseCpuString(cpuString: string): number {
        if (!cpuString || cpuString === '0') {
            return 0;
        }

        // If the string ends with 'm', it's already in millicores
        if (cpuString.endsWith('m')) {
            return parseInt(cpuString.slice(0, -1), 10);
        }

        // Otherwise, it's in cores, convert to millicores
        return parseFloat(cpuString) * 1000;
    }

    /**
     * Parses a Kubernetes memory string to bytes.
     * Examples: "1Ki" -> 1024, "1Mi" -> 1048576, "1Gi" -> 1073741824
     * 
     * @param memoryString Memory string from Kubernetes
     * @returns Memory in bytes
     */
    private static parseMemoryString(memoryString: string): number {
        if (!memoryString || memoryString === '0') {
            return 0;
        }

        // Kubernetes memory units - names match K8s standard
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const units: { [key: string]: number } = {
            'Ki': 1024,
            'Mi': 1024 * 1024,
            'Gi': 1024 * 1024 * 1024,
            'Ti': 1024 * 1024 * 1024 * 1024,
            'K': 1000,
            'M': 1000 * 1000,
            'G': 1000 * 1000 * 1000,
            'T': 1000 * 1000 * 1000 * 1000
        };

        // Try to match a unit suffix
        for (const [unit, multiplier] of Object.entries(units)) {
            if (memoryString.endsWith(unit)) {
                const value = parseFloat(memoryString.slice(0, -unit.length));
                return value * multiplier;
            }
        }

        // No unit, assume bytes
        return parseFloat(memoryString);
    }

    /**
     * Formats millicores to a human-readable CPU string.
     * Examples: 2000 -> "2", 500 -> "0.5", 1500 -> "1.5"
     * 
     * @param millicores CPU in millicores
     * @returns Formatted CPU string
     */
    private static formatCpu(millicores: number): string {
        if (millicores === 0) {
            return '0';
        }

        const cores = millicores / 1000;
        return cores.toFixed(cores < 1 ? 1 : 0);
    }

    /**
     * Formats bytes to a human-readable memory string.
     * Examples: 1024 -> "1 Ki", 1048576 -> "1 Mi", 1073741824 -> "1 Gi"
     * 
     * @param bytes Memory in bytes
     * @returns Formatted memory string
     */
    private static formatMemory(bytes: number): string {
        if (bytes === 0) {
            return '0';
        }

        const units = ['', 'Ki', 'Mi', 'Gi', 'Ti'];
        let value = bytes;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    }

    /**
     * Set the kubectl execution function for testing purposes.
     * This allows tests to mock kubectl responses without complex require interception.
     * 
     * @param fn - The mock execution function, or null to restore default
     * @internal
     */
    public static _setExecFn(fn: KubectlExecFn | null): void {
        if (fn === null) {
            kubectlExecFn = execFileAsync;
        } else {
            kubectlExecFn = fn;
        }
    }

    /**
     * Reset the kubectl execution function to the default.
     * 
     * @internal
     */
    public static _resetExecFn(): void {
        kubectlExecFn = execFileAsync;
    }
}

