import * as k8s from '@kubernetes/client-node';
import { KubernetesEvent, EventFilters, EventCache, DEFAULT_EVENT_FILTERS } from '../types/Events';
import { getKubernetesApiClient, KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * EventsProvider service.
 * Manages retrieval, caching, and filtering of Kubernetes events from the kube9-operator CLI.
 */
export class EventsProvider {
    private cache: Map<string, EventCache> = new Map();
    private filters: Map<string, EventFilters> = new Map();
    private autoRefreshTimers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Retrieve events from operator CLI.
     * 
     * @param clusterContext The cluster context name
     * @param filters Optional filter overrides
     * @returns Array of Kubernetes events
     */
    async getEvents(
        clusterContext: string,
        filters?: EventFilters
    ): Promise<KubernetesEvent[]> {
        const activeFilters = filters || this.getFilters(clusterContext);
        
        // Check cache first
        const cached = this.cache.get(clusterContext);
        if (cached && this.filtersMatch(cached.filters, activeFilters)) {
            // Return cached events if filters match
            return cached.events;
        }
        
        // Build CLI command with filters
        const cmd = this.buildQueryCommand(activeFilters);
        
        // Execute via Kubernetes Exec API
        const result = await this.executeOperatorCLI(clusterContext, cmd);
        
        // Parse JSON response
        const events = this.parseEventResponse(result);
        
        // Apply client-side filters
        const filtered = this.applyFilters(events, activeFilters);
        
        // Limit to 500 events
        const limited = filtered.slice(0, 500);
        
        // Cache results
        this.cache.set(clusterContext, {
            events: limited,
            timestamp: Date.now(),
            filters: activeFilters
        });
        
        return limited;
    }

    /**
     * Check if two filter objects are equal.
     * 
     * @param filters1 First filter object
     * @param filters2 Second filter object
     * @returns True if filters are equal
     */
    private filtersMatch(filters1: EventFilters, filters2: EventFilters): boolean {
        return (
            filters1.namespace === filters2.namespace &&
            filters1.type === filters2.type &&
            filters1.since === filters2.since &&
            filters1.resourceType === filters2.resourceType &&
            filters1.searchText === filters2.searchText
        );
    }

    /**
     * Get current filters for cluster.
     * 
     * @param clusterContext The cluster context name
     * @returns Current event filters for the cluster
     */
    getFilters(clusterContext: string): EventFilters {
        return this.filters.get(clusterContext) || { ...DEFAULT_EVENT_FILTERS };
    }

    /**
     * Set filter for cluster.
     * Merges the provided filter with existing filters and clears cache.
     * 
     * @param clusterContext The cluster context name
     * @param filter Partial filter updates to apply
     */
    setFilter(clusterContext: string, filter: Partial<EventFilters>): void {
        const currentFilters = this.getFilters(clusterContext);
        this.filters.set(clusterContext, { ...currentFilters, ...filter });
        this.clearCache(clusterContext);
    }

    /**
     * Clear all filters for cluster.
     * Resets filters to default values and clears cache.
     * 
     * @param clusterContext The cluster context name
     */
    clearFilters(clusterContext: string): void {
        this.filters.set(clusterContext, { ...DEFAULT_EVENT_FILTERS });
        this.clearCache(clusterContext);
    }

    /**
     * Clear cache for cluster.
     * Removes cached event data, forcing a fresh query on next getEvents call.
     * 
     * @param clusterContext The cluster context name
     */
    clearCache(clusterContext: string): void {
        this.cache.delete(clusterContext);
    }

    /**
     * Start auto-refresh for cluster.
     * Sets up a timer to call the refresh callback every 30 seconds.
     * 
     * @param clusterContext The cluster context name
     * @param refreshCallback Callback to invoke on each refresh interval
     */
    startAutoRefresh(clusterContext: string, refreshCallback: () => void): void {
        if (this.autoRefreshTimers.has(clusterContext)) {
            return; // Already running
        }
        
        const timer = setInterval(() => {
            refreshCallback();
        }, 30000); // 30 seconds
        
        this.autoRefreshTimers.set(clusterContext, timer);
    }

    /**
     * Stop auto-refresh for cluster.
     * Clears the refresh timer and removes it from the map.
     * 
     * @param clusterContext The cluster context name
     */
    stopAutoRefresh(clusterContext: string): void {
        const timer = this.autoRefreshTimers.get(clusterContext);
        if (timer) {
            clearInterval(timer);
            this.autoRefreshTimers.delete(clusterContext);
        }
    }

    /**
     * Check if auto-refresh is enabled for cluster.
     * 
     * @param clusterContext The cluster context name
     * @returns True if auto-refresh is currently running
     */
    isAutoRefreshEnabled(clusterContext: string): boolean {
        return this.autoRefreshTimers.has(clusterContext);
    }

    /**
     * Execute operator CLI command using Kubernetes client Exec API.
     * 
     * @param clusterContext The cluster context name
     * @param command The full command string to execute
     * @returns The stdout output from the command
     */
    private async executeOperatorCLI(
        clusterContext: string,
        command: string
    ): Promise<string> {
        // Get Kubernetes client for context
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(clusterContext);
        
        // Get operator pod name
        const podName = await this.getOperatorPodName(apiClient);
        
        // Use Kubernetes Exec API
        const exec = new k8s.Exec(apiClient.getKubeConfig());
        const commandArgs = command.split(' ');
        
        return new Promise<string>((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            exec.exec(
                'kube9-system',
                podName,
                'kube9-operator',
                commandArgs,
                null, // stdout stream - we'll capture via WebSocket
                null, // stderr stream - we'll capture via WebSocket
                null, // stdin stream
                false, // tty
                (status) => {
                    if (status.status === 'Success') {
                        resolve(stdout);
                    } else {
                        reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                    }
                }
            ).then(ws => {
                // Capture stdout/stderr from WebSocket
                // The first byte is the channel: 0=stdin, 1=stdout, 2=stderr, 3=error
                ws.on('message', (data: Buffer) => {
                    const channel = data[0];
                    const content = data.slice(1).toString();
                    
                    if (channel === 1) { // stdout
                        stdout += content;
                    } else if (channel === 2) { // stderr
                        stderr += content;
                    }
                });
            }).catch(error => {
                reject(new Error(`Failed to execute operator CLI: ${error.message}`));
            });
        });
    }

    /**
     * Get operator pod name from deployment.
     * Discovers the kube9-operator pod by label.
     * 
     * @param apiClient The Kubernetes API client
     * @returns The name of the operator pod
     * @throws Error if operator pod is not found
     */
    private async getOperatorPodName(apiClient: KubernetesApiClient): Promise<string> {
        const pods = await apiClient.core.listNamespacedPod({
            namespace: 'kube9-system'
        });
        const operatorPod = pods.items.find(pod => 
            pod.metadata?.labels?.['app'] === 'kube9-operator'
        );
        
        if (!operatorPod || !operatorPod.metadata?.name) {
            throw new Error('kube9-operator pod not found');
        }
        
        return operatorPod.metadata.name;
    }

    /**
     * Build operator CLI query command with filters.
     * Constructs the command string with appropriate filter arguments.
     * 
     * @param filters The event filters to apply
     * @returns The complete command string
     */
    private buildQueryCommand(filters: EventFilters): string {
        const parts = ['kube9-operator', 'query', 'events'];
        
        if (filters.namespace && filters.namespace !== 'all') {
            parts.push(`--namespace=${filters.namespace}`);
        }
        
        if (filters.type && filters.type !== 'all') {
            parts.push(`--type=${filters.type}`);
        }
        
        if (filters.since && filters.since !== 'all') {
            parts.push(`--since=${filters.since}`);
        }
        
        if (filters.resourceType && filters.resourceType !== 'all') {
            parts.push(`--resource-type=${filters.resourceType}`);
        }
        
        parts.push('--limit=500');
        parts.push('--format=json');
        
        return parts.join(' ');
    }

    /**
     * Parse JSON event response from operator CLI.
     * 
     * @param json The JSON string from operator CLI
     * @returns Array of parsed Kubernetes events
     * @throws Error if JSON parsing fails
     */
    private parseEventResponse(json: string): KubernetesEvent[] {
        try {
            const data = JSON.parse(json);
            return data.events || [];
        } catch (error) {
            throw new Error(`Failed to parse event response: ${(error as Error).message}`);
        }
    }

    /**
     * Apply client-side filters (e.g., search text).
     * Used for filters that can't be applied at the CLI level.
     * 
     * @param events Array of events to filter
     * @param filters The event filters to apply
     * @returns Filtered array of events
     */
    private applyFilters(
        events: KubernetesEvent[],
        filters: EventFilters
    ): KubernetesEvent[] {
        let filtered = events;
        
        // Search filter
        if (filters.searchText) {
            const search = filters.searchText.toLowerCase();
            filtered = filtered.filter(event =>
                event.message.toLowerCase().includes(search) ||
                event.reason.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    }
}

