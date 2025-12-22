---
spec_id: events-provider-updates-spec
name: Events Provider Updates Specification
description: Updates to EventsProvider to use dynamic namespace discovery
feature_id:
  - dynamic-namespace-discovery
  - event-viewer-panel
---

# Events Provider Updates Specification

## Overview

The existing `EventsProvider` service needs to be updated to use the `OperatorNamespaceResolver` for dynamic namespace discovery instead of hardcoded `'kube9-system'` references.

## Current Implementation Issues

**File**: `src/services/EventsProvider.ts`

Two hardcoded references to `'kube9-system'`:

1. **Line 190**: `exec.exec('kube9-system', podName, ...)`
2. **Line 234**: `await apiClient.core.listNamespacedPod({ namespace: 'kube9-system' })`

## Required Changes

### Import Namespace Resolver

Add import at top of file:

```typescript
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';
```

### Update executeOperatorCLI Method

**Current Implementation** (lines 170-222):

```typescript
private async executeOperatorCLI(
    clusterContext: string,
    command: string
): Promise<string> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(clusterContext);
    
    const podName = await this.getOperatorPodName(apiClient);
    
    const exec = new k8s.Exec(apiClient.getKubeConfig());
    const commandArgs = command.split(' ');
    
    return new Promise<string>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        exec.exec(
            'kube9-system',  // ❌ HARDCODED - Line 190
            podName,
            'kube9-operator',
            commandArgs,
            null,
            null,
            null,
            false,
            (status) => {
                if (status.status === 'Success') {
                    resolve(stdout);
                } else {
                    reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                }
            }
        ).then(ws => {
            ws.on('message', (data: Buffer) => {
                const channel = data[0];
                const content = data.slice(1).toString();
                
                if (channel === 1) {
                    stdout += content;
                } else if (channel === 2) {
                    stderr += content;
                }
            });
        }).catch(error => {
            reject(new Error(`Failed to execute operator CLI: ${error.message}`));
        });
    });
}
```

**Updated Implementation**:

```typescript
private async executeOperatorCLI(
    clusterContext: string,
    command: string
): Promise<string> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(clusterContext);
    
    // ✅ Resolve operator namespace dynamically
    const resolver = getOperatorNamespaceResolver();
    const namespace = await resolver.resolveNamespace(clusterContext);
    
    const podName = await this.getOperatorPodName(apiClient, namespace);
    
    const exec = new k8s.Exec(apiClient.getKubeConfig());
    const commandArgs = command.split(' ');
    
    return new Promise<string>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        exec.exec(
            namespace,  // ✅ DYNAMIC NAMESPACE
            podName,
            'kube9-operator',
            commandArgs,
            null,
            null,
            null,
            false,
            (status) => {
                if (status.status === 'Success') {
                    resolve(stdout);
                } else {
                    reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                }
            }
        ).then(ws => {
            ws.on('message', (data: Buffer) => {
                const channel = data[0];
                const content = data.slice(1).toString();
                
                if (channel === 1) {
                    stdout += content;
                } else if (channel === 2) {
                    stderr += content;
                }
            });
        }).catch(error => {
            reject(new Error(`Failed to execute operator CLI: ${error.message}`));
        });
    });
}
```

### Update getOperatorPodName Method

**Current Implementation** (lines 224-245):

```typescript
private async getOperatorPodName(apiClient: KubernetesApiClient): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({
        namespace: 'kube9-system'  // ❌ HARDCODED - Line 234
    });
    const operatorPod = pods.items.find(pod => 
        pod.metadata?.labels?.['app'] === 'kube9-operator'
    );
    
    if (!operatorPod || !operatorPod.metadata?.name) {
        throw new Error('kube9-operator pod not found');
    }
    
    return operatorPod.metadata.name;
}
```

**Updated Implementation**:

```typescript
/**
 * Get operator pod name from deployment
 * 
 * @param apiClient The Kubernetes API client
 * @param namespace The namespace where operator is installed
 * @returns The name of the operator pod
 * @throws Error if operator pod is not found
 */
private async getOperatorPodName(
    apiClient: KubernetesApiClient,
    namespace: string  // ✅ Accept namespace as parameter
): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({
        namespace: namespace  // ✅ DYNAMIC NAMESPACE
    });
    const operatorPod = pods.items.find(pod => 
        pod.metadata?.labels?.['app'] === 'kube9-operator'
    );
    
    if (!operatorPod || !operatorPod.metadata?.name) {
        throw new Error(`kube9-operator pod not found in namespace '${namespace}'`);
    }
    
    return operatorPod.metadata.name;
}
```

## Complete Updated Code

**File**: `src/services/EventsProvider.ts`

```typescript
import * as k8s from '@kubernetes/client-node';
import { KubernetesEvent, EventFilters, EventCache, DEFAULT_EVENT_FILTERS } from '../types/Events';
import { getKubernetesApiClient, KubernetesApiClient } from '../kubernetes/apiClient';
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';  // ✅ NEW IMPORT

export class EventsProvider {
    private cache: Map<string, EventCache> = new Map();
    private filters: Map<string, EventFilters> = new Map();
    private autoRefreshTimers: Map<string, NodeJS.Timeout> = new Map();

    async getEvents(
        clusterContext: string,
        filters?: EventFilters
    ): Promise<KubernetesEvent[]> {
        const activeFilters = filters || this.getFilters(clusterContext);
        
        const cached = this.cache.get(clusterContext);
        if (cached && this.filtersMatch(cached.filters, activeFilters)) {
            return cached.events;
        }
        
        const cmd = this.buildQueryCommand(activeFilters);
        const result = await this.executeOperatorCLI(clusterContext, cmd);
        const events = this.parseEventResponse(result);
        const filtered = this.applyFilters(events, activeFilters);
        const limited = filtered.slice(0, 500);
        
        this.cache.set(clusterContext, {
            events: limited,
            timestamp: Date.now(),
            filters: activeFilters
        });
        
        return limited;
    }

    // ... other methods unchanged (filtersMatch, getFilters, setFilter, etc.)

    /**
     * Execute operator CLI command using Kubernetes client Exec API
     * 
     * @param clusterContext The cluster context name
     * @param command The full command string to execute
     * @returns The stdout output from the command
     */
    private async executeOperatorCLI(
        clusterContext: string,
        command: string
    ): Promise<string> {
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(clusterContext);
        
        // ✅ Resolve operator namespace dynamically
        const resolver = getOperatorNamespaceResolver();
        const namespace = await resolver.resolveNamespace(clusterContext);
        
        // ✅ Pass namespace to getOperatorPodName
        const podName = await this.getOperatorPodName(apiClient, namespace);
        
        const exec = new k8s.Exec(apiClient.getKubeConfig());
        const commandArgs = command.split(' ');
        
        return new Promise<string>((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            exec.exec(
                namespace,  // ✅ DYNAMIC NAMESPACE
                podName,
                'kube9-operator',
                commandArgs,
                null,
                null,
                null,
                false,
                (status) => {
                    if (status.status === 'Success') {
                        resolve(stdout);
                    } else {
                        reject(new Error(`Operator CLI error: ${stderr || status.message}`));
                    }
                }
            ).then(ws => {
                ws.on('message', (data: Buffer) => {
                    const channel = data[0];
                    const content = data.slice(1).toString();
                    
                    if (channel === 1) {
                        stdout += content;
                    } else if (channel === 2) {
                        stderr += content;
                    }
                });
            }).catch(error => {
                reject(new Error(`Failed to execute operator CLI: ${error.message}`));
            });
        });
    }

    /**
     * Get operator pod name from deployment
     * 
     * @param apiClient The Kubernetes API client
     * @param namespace The namespace where operator is installed
     * @returns The name of the operator pod
     * @throws Error if operator pod is not found
     */
    private async getOperatorPodName(
        apiClient: KubernetesApiClient,
        namespace: string  // ✅ Accept namespace parameter
    ): Promise<string> {
        const pods = await apiClient.core.listNamespacedPod({
            namespace: namespace  // ✅ DYNAMIC NAMESPACE
        });
        const operatorPod = pods.items.find(pod => 
            pod.metadata?.labels?.['app'] === 'kube9-operator'
        );
        
        if (!operatorPod || !operatorPod.metadata?.name) {
            throw new Error(`kube9-operator pod not found in namespace '${namespace}'`);
        }
        
        return operatorPod.metadata.name;
    }

    // ... rest of methods unchanged (buildQueryCommand, parseEventResponse, etc.)
}
```

## Changes Summary

### Modified Methods

1. **executeOperatorCLI**:
   - Added namespace resolution using `OperatorNamespaceResolver`
   - Pass resolved namespace to `exec.exec()` instead of hardcoded value
   - Pass namespace to `getOperatorPodName()`

2. **getOperatorPodName**:
   - Added `namespace` parameter to method signature
   - Use dynamic namespace instead of hardcoded value
   - Improved error message to include namespace for debugging

### Added Dependencies

- Import `getOperatorNamespaceResolver` from `./OperatorNamespaceResolver`

### No Breaking Changes

- Public API of `EventsProvider` remains unchanged
- All existing method signatures are preserved
- Changes are internal implementation details only

## Error Handling

### Namespace Resolution Failure

```typescript
try {
    const namespace = await resolver.resolveNamespace(clusterContext);
    // ... use namespace
} catch (error) {
    throw new Error(
        `Failed to resolve operator namespace for cluster '${clusterContext}': ${error.message}`
    );
}
```

### Pod Not Found in Resolved Namespace

The error message now includes the namespace:

```typescript
throw new Error(`kube9-operator pod not found in namespace '${namespace}'`);
```

This helps users understand where the extension is looking and debug configuration issues.

## Testing Considerations

### Unit Tests

Mock the `OperatorNamespaceResolver`:

```typescript
jest.mock('./OperatorNamespaceResolver', () => ({
    getOperatorNamespaceResolver: () => ({
        resolveNamespace: jest.fn().mockResolvedValue('test-namespace')
    })
}));
```

### Integration Tests

Test with operator in:
- Default `'kube9-system'` namespace
- Custom namespace (e.g., `'my-kube9'`)
- Per-cluster configured namespaces

### Edge Cases

- Operator not installed (pod not found)
- Namespace doesn't exist
- Permission denied for namespace access
- Multiple operator pods in namespace

## Performance Impact

- **First Call**: Additional ~100-500ms for namespace resolution
- **Cached Calls**: No performance impact (namespace cached)
- **Overall**: Negligible impact on user experience

## Migration Path

1. **Phase 1**: Implement `OperatorNamespaceResolver`
2. **Phase 2**: Update `EventsProvider` (this spec)
3. **Phase 3**: Update other services (OperatorStatusClient, DashboardDataProvider, etc.)
4. **Phase 4**: Test with operator in custom namespace
5. **Phase 5**: Deploy to users

## Backward Compatibility

- Default namespace remains `'kube9-system'`
- Existing installations continue to work
- No user action required unless using custom namespace
- Settings are optional (auto-detection is primary)

## Documentation Updates

Update EventsProvider documentation to mention:
- Dynamic namespace discovery
- How namespace is resolved
- How to configure custom namespace
- Troubleshooting namespace issues

