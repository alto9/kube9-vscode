import * as k8s from '@kubernetes/client-node';
import { KubernetesEvent, EventFilters, EventCache, DEFAULT_EVENT_FILTERS } from '../types/Events';
import { getKubernetesApiClient, KubernetesApiClient } from '../kubernetes/apiClient';
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

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
        
        // Limit to 100 events to keep UI responsive and avoid buffer issues
        const limited = filtered.slice(0, 100);
        
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
        
        // Resolve operator namespace dynamically
        const resolver = getOperatorNamespaceResolver();
        const namespace = await resolver.resolveNamespace(clusterContext);
        
        // Get operator pod name
        const podName = await this.getOperatorPodName(apiClient, namespace);
        
        // Use Kubernetes Exec API
        const exec = new k8s.Exec(apiClient.getKubeConfig());
        const commandArgs = command.split(' ');
        
        return new Promise<string>((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            // Create writable streams to capture output
            // Use larger highWaterMark to handle large responses (up to 1MB)
            const { Writable } = require('stream');
            
            const stdoutStream = new Writable({
                highWaterMark: 1024 * 1024, // 1MB buffer
                write(chunk: Buffer, _encoding: string, callback: () => void) {
                    stdout += chunk.toString();
                    callback();
                }
            });
            
            const stderrStream = new Writable({
                highWaterMark: 1024 * 1024, // 1MB buffer
                write(chunk: Buffer, _encoding: string, callback: () => void) {
                    stderr += chunk.toString();
                    callback();
                }
            });
            
            exec.exec(
                namespace,
                podName,
                'operator', // Container name in the kube9-operator pod
                commandArgs,
                stdoutStream, // stdout stream
                stderrStream, // stderr stream
                null, // stdin stream
                false, // tty
                (status) => {
                    if (status.status === 'Success') {
                        resolve(stdout);
                    } else {
                        reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                    }
                }
            ).catch(error => {
                reject(new Error(`Failed to execute operator CLI: ${error.message}`));
            });
        });
    }

    /**
     * Get operator pod name from deployment.
     * Discovers the kube9-operator pod by label.
     * 
     * @param apiClient The Kubernetes API client
     * @param namespace The namespace where operator is installed
     * @returns The name of the operator pod
     * @throws Error if operator pod is not found
     */
    private async getOperatorPodName(
        apiClient: KubernetesApiClient,
        namespace: string
    ): Promise<string> {
        const pods = await apiClient.core.listNamespacedPod({
            namespace: namespace
        });
        
        // Look for operator pod using standard Kubernetes label or legacy label
        // Filter to only Running pods
        const operatorPods = pods.items.filter(pod => {
            const labels = pod.metadata?.labels;
            const hasLabel = labels?.['app.kubernetes.io/name'] === 'kube9-operator' ||
                           labels?.['app'] === 'kube9-operator';
            const isRunning = pod.status?.phase === 'Running';
            const hasContainerReady = pod.status?.containerStatuses?.some(
                cs => cs.name === 'operator' && cs.ready === true
            );
            
            return hasLabel && isRunning && hasContainerReady;
        });
        
        if (operatorPods.length === 0) {
            // Provide more helpful error if pod exists but isn't ready
            const anyOperatorPod = pods.items.find(pod => {
                const labels = pod.metadata?.labels;
                return labels?.['app.kubernetes.io/name'] === 'kube9-operator' ||
                       labels?.['app'] === 'kube9-operator';
            });
            
            if (anyOperatorPod) {
                const containerStatus = anyOperatorPod.status?.containerStatuses?.find(cs => cs.name === 'operator');
                const podPhase = anyOperatorPod.status?.phase;
                
                if (containerStatus && !containerStatus.ready) {
                    const state = containerStatus.state;
                    if (state?.waiting) {
                        throw new Error(`kube9-operator pod is not ready: ${state.waiting.reason || 'Waiting'} - ${state.waiting.message || 'Container is waiting to start'}`);
                    } else if (state?.terminated) {
                        throw new Error(`kube9-operator container crashed: ${state.terminated.reason || 'Terminated'} (exit code ${state.terminated.exitCode}). Check pod logs: kubectl logs -n ${namespace} ${anyOperatorPod.metadata?.name}`);
                    }
                    throw new Error(`kube9-operator pod exists but container is not ready (pod phase: ${podPhase})`);
                }
            }
            
            throw new Error(`No running kube9-operator pod found in namespace '${namespace}'. Ensure the operator is deployed and running.`);
        }
        
        // Use the first running pod
        const operatorPod = operatorPods[0];
        if (!operatorPod.metadata?.name) {
            throw new Error(`kube9-operator pod has no name in namespace '${namespace}'`);
        }
        
        return operatorPod.metadata.name;
    }

    /**
     * Build operator CLI query command with filters.
     * Constructs the command string with appropriate filter arguments for the operator CLI.
     * 
     * Command structure: kube9-operator query events list [options]
     * 
     * @param filters The event filters to apply
     * @returns The complete command string
     */
    private buildQueryCommand(filters: EventFilters): string {
        const parts = ['kube9-operator', 'query', 'events', 'list'];
        
        // Object namespace filter
        if (filters.namespace && filters.namespace !== 'all') {
            parts.push(`--object-namespace=${filters.namespace}`);
        }
        
        // Type filter (cluster, operator, insight, assessment, health, system)
        if (filters.type && filters.type !== 'all') {
            parts.push(`--type=${filters.type}`);
        }
        
        // Since filter - convert to ISO 8601 if needed
        if (filters.since && filters.since !== 'all') {
            const sinceDate = this.parseSinceFilter(filters.since);
            if (sinceDate) {
                parts.push(`--since=${sinceDate}`);
            }
        }
        
        // Object kind filter
        if (filters.resourceType && filters.resourceType !== 'all') {
            parts.push(`--object-kind=${filters.resourceType}`);
        }
        
        // Limit to 100 events to keep response size manageable (< 64KB)
        parts.push('--limit=100');
        parts.push('--format=json');
        
        return parts.join(' ');
    }

    /**
     * Parse "since" filter value to ISO 8601 datetime.
     * Converts relative time strings (e.g., "1h", "24h", "7d") to ISO 8601 datetime strings.
     * 
     * @param since The since filter value (e.g., "1h", "24h", "7d", or ISO 8601 string)
     * @returns ISO 8601 datetime string or null if invalid
     */
    private parseSinceFilter(since: string): string | null {
        // If already an ISO 8601 string, return as-is
        if (since.includes('T') || since.includes('Z')) {
            return since;
        }
        
        // Parse relative time (e.g., "1h", "24h", "7d")
        const match = since.match(/^(\d+)([smhd])$/);
        if (!match) {
            return null;
        }
        
        const value = parseInt(match[1], 10);
        const unit = match[2];
        
        let milliseconds = 0;
        switch (unit) {
            case 's': milliseconds = value * 1000; break;
            case 'm': milliseconds = value * 60 * 1000; break;
            case 'h': milliseconds = value * 60 * 60 * 1000; break;
            case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
            default: return null;
        }
        
        const date = new Date(Date.now() - milliseconds);
        return date.toISOString();
    }

    /**
     * Parse JSON event response from operator CLI.
     * Filters out log lines, extracts the response, and transforms operator events to KubernetesEvent format.
     * 
     * @param output The raw output from operator CLI (may contain log lines + response)
     * @returns Array of parsed Kubernetes events
     * @throws Error if JSON parsing fails
     */
    private parseEventResponse(output: string): KubernetesEvent[] {
        try {
            const lines = output.trim().split('\n');
            
            // Find the start of the response JSON (first line that starts with "{" and is NOT a complete log line)
            let responseStartIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(line);
                        // If it's a complete JSON object with "level", it's a log line - skip it
                        if (parsed.level !== undefined) {
                            continue;
                        }
                        // Otherwise, this is the start of our response
                        responseStartIndex = i;
                        break;
                    } catch {
                        // Line starts with "{" but isn't complete JSON - this is the start of multi-line response
                        responseStartIndex = i;
                        break;
                    }
                }
            }
            
            // Join all lines from responseStartIndex onwards to reconstruct the multi-line JSON
            const responseJson = lines.slice(responseStartIndex).join('\n');
            
            if (!responseJson) {
                return [];
            }
            
            const data = JSON.parse(responseJson);
            const operatorEvents = data.events || [];
            
            // Transform operator events to KubernetesEvent format
            return operatorEvents.map((evt: any) => this.transformOperatorEvent(evt));
        } catch (error) {
            throw new Error(`Failed to parse event response: ${(error as Error).message}`);
        }
    }

    /**
     * Transform operator event format to KubernetesEvent format.
     * Operator events have different field names and structure than K8s events.
     * 
     * @param operatorEvent Event from operator CLI
     * @returns Transformed KubernetesEvent
     */
    private transformOperatorEvent(operatorEvent: any): KubernetesEvent {
        // Map severity to event type
        let type: 'Normal' | 'Warning' | 'Error' = 'Normal';
        if (operatorEvent.severity === 'error' || operatorEvent.severity === 'critical') {
            type = 'Error';
        } else if (operatorEvent.severity === 'warning') {
            type = 'Warning';
        }
        
        return {
            reason: operatorEvent.metadata?.reason || operatorEvent.event_type || 'Unknown',
            type: type,
            message: operatorEvent.description || operatorEvent.title || '',
            involvedObject: {
                kind: operatorEvent.object_kind || 'Unknown',
                namespace: operatorEvent.object_namespace || '',
                name: operatorEvent.object_name || ''
            },
            count: operatorEvent.metadata?.count || 1,
            firstTimestamp: operatorEvent.metadata?.first_timestamp || operatorEvent.created_at || new Date().toISOString(),
            lastTimestamp: operatorEvent.metadata?.last_timestamp || operatorEvent.created_at || new Date().toISOString()
        };
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

