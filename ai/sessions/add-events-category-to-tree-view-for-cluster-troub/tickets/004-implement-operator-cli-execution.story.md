---
story_id: 004-implement-operator-cli-execution
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: completed
---

# Implement Operator CLI Execution

## Objective

Implement the operator CLI execution logic in EventsProvider using Kubernetes client Exec API. This includes pod discovery, command building, and JSON parsing.

## Context

This story implements the core functionality of executing the operator CLI via Kubernetes Exec API (not kubectl process spawning). Must discover operator pod and execute command.

## Files to Create/Modify

- `src/services/EventsProvider.ts` (modify)

## Implementation

Add these methods to EventsProvider:

```typescript
import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

// Inside EventsProvider class:

/**
 * Execute operator CLI command using Kubernetes client Exec API
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
        
        const ws = exec.exec(
            'kube9-system',
            podName,
            'kube9-operator',
            commandArgs,
            null as any, // stdout stream
            null as any, // stderr stream
            null as any, // stdin stream
            false, // tty
            (status) => {
                if (status.status === 'Success') {
                    resolve(stdout);
                } else {
                    reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                }
            }
        );
        
        // Capture stdout/stderr
        ws.on('message', (channel, data) => {
            if (channel === 1) { // stdout
                stdout += data.toString();
            } else if (channel === 2) { // stderr
                stderr += data.toString();
            }
        });
    });
}

/**
 * Get operator pod name from deployment
 */
private async getOperatorPodName(apiClient: any): Promise<string> {
    const pods = await apiClient.getCoreApi().listNamespacedPod('kube9-system');
    const operatorPod = pods.body.items.find((pod: any) => 
        pod.metadata?.labels?.['app'] === 'kube9-operator'
    );
    
    if (!operatorPod || !operatorPod.metadata?.name) {
        throw new Error('kube9-operator pod not found');
    }
    
    return operatorPod.metadata.name;
}

/**
 * Build operator CLI query command with filters
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
 * Parse JSON event response from operator CLI
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
 * Apply client-side filters (e.g., search text)
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
```

Update `getEvents()` method:

```typescript
async getEvents(
    clusterContext: string,
    filters?: EventFilters
): Promise<KubernetesEvent[]> {
    const activeFilters = filters || this.getFilters(clusterContext);
    
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
```

## Acceptance Criteria

- [ ] `executeOperatorCLI()` implemented using Kubernetes Exec API
- [ ] `getOperatorPodName()` discovers operator pod by label
- [ ] `buildQueryCommand()` constructs command with filter args
- [ ] `parseEventResponse()` parses JSON response
- [ ] `applyFilters()` applies client-side filters (search)
- [ ] `getEvents()` fully implemented with all steps
- [ ] Error handling for pod not found
- [ ] Error handling for CLI execution failures
- [ ] Error handling for JSON parsing failures

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventsProvider section)
- API Client: `src/kubernetes/apiClient.ts`
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 30 minutes

