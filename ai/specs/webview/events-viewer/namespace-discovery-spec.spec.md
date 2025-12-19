---
spec_id: namespace-discovery-spec
name: Namespace Discovery Specification
description: Technical specification for OperatorNamespaceResolver service that dynamically discovers kube9-operator namespace
feature_id:
  - dynamic-namespace-discovery
diagram_id:
  - namespace-discovery-flow
---

# Namespace Discovery Specification

## Overview

The `OperatorNamespaceResolver` service provides dynamic discovery of the kube9-operator namespace, eliminating hardcoded 'kube9-system' references. It implements a three-tier resolution strategy with caching for performance.

## Problem Statement

Current codebase has hardcoded `'kube9-system'` references in:
- `EventsProvider.ts` (lines 190, 234)
- `OperatorStatusClient.ts` (line 90)
- `DashboardDataProvider.ts` (line 313)
- `AIRecommendationsQuery.ts` (line 46)

This breaks when operator is installed in custom namespaces.

## Solution Architecture

### OperatorNamespaceResolver Service

**File**: `src/services/OperatorNamespaceResolver.ts`

```typescript
import * as vscode from 'vscode';
import { KubernetesApiClient, getKubernetesApiClient } from '../kubernetes/apiClient';

export class OperatorNamespaceResolver {
    /**
     * Cache of resolved namespaces per cluster context
     * Key: cluster context name
     * Value: namespace string
     */
    private namespaceCache: Map<string, string> = new Map();

    /**
     * Default namespace used as last resort
     */
    private static readonly DEFAULT_NAMESPACE = 'kube9-system';

    /**
     * ConfigMap name used by operator for status
     */
    private static readonly STATUS_CONFIGMAP_NAME = 'kube9-operator-status';

    /**
     * Resolve operator namespace for a cluster context
     * 
     * Resolution order:
     * 1. Check cache
     * 2. Read from operator status ConfigMap (if namespace field exists)
     * 3. Read from VS Code settings (kube9.operatorNamespace)
     * 4. Fall back to default 'kube9-system'
     * 
     * @param clusterContext Cluster context name
     * @returns Resolved namespace
     * @throws Error if cluster is not accessible
     */
    async resolveNamespace(clusterContext: string): Promise<string> {
        // 1. Check cache
        const cached = this.namespaceCache.get(clusterContext);
        if (cached) {
            return cached;
        }

        // 2. Try to discover from ConfigMap
        try {
            const namespaceFromConfigMap = await this.discoverFromConfigMap(clusterContext);
            if (namespaceFromConfigMap) {
                this.namespaceCache.set(clusterContext, namespaceFromConfigMap);
                console.log(`Operator namespace discovered from ConfigMap: ${namespaceFromConfigMap}`);
                return namespaceFromConfigMap;
            }
        } catch (error) {
            console.warn(`Failed to discover namespace from ConfigMap: ${(error as Error).message}`);
        }

        // 3. Try settings
        const namespaceFromSettings = this.getNamespaceFromSettings(clusterContext);
        if (namespaceFromSettings) {
            this.namespaceCache.set(clusterContext, namespaceFromSettings);
            console.log(`Using operator namespace from settings: ${namespaceFromSettings}`);
            return namespaceFromSettings;
        }

        // 4. Fall back to default
        const defaultNamespace = OperatorNamespaceResolver.DEFAULT_NAMESPACE;
        this.namespaceCache.set(clusterContext, defaultNamespace);
        console.warn(`Using default operator namespace: ${defaultNamespace}`);
        return defaultNamespace;
    }

    /**
     * Discover namespace from operator status ConfigMap
     * 
     * Bootstrap strategy:
     * - Try settings namespace first
     * - Fall back to default namespace
     * - Look for ConfigMap in those namespaces
     * - Extract namespace field from ConfigMap if present
     * 
     * @param clusterContext Cluster context name
     * @returns Namespace from ConfigMap or null
     */
    private async discoverFromConfigMap(clusterContext: string): Promise<string | null> {
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(clusterContext);

        // Bootstrap: determine where to look for ConfigMap
        const candidateNamespaces = [
            this.getNamespaceFromSettings(clusterContext),
            OperatorNamespaceResolver.DEFAULT_NAMESPACE
        ].filter(Boolean) as string[];

        // Try each candidate namespace
        for (const namespace of candidateNamespaces) {
            try {
                const configMap = await apiClient.core.readNamespacedConfigMap({
                    name: OperatorNamespaceResolver.STATUS_CONFIGMAP_NAME,
                    namespace: namespace
                });

                // Check if ConfigMap has namespace field
                const namespaceField = configMap.data?.['namespace'];
                if (namespaceField) {
                    // Validate it matches or warn
                    if (namespaceField !== namespace) {
                        console.warn(
                            `ConfigMap found in '${namespace}' but indicates namespace: '${namespaceField}'. ` +
                            `Using '${namespaceField}' from ConfigMap.`
                        );
                    }
                    return namespaceField;
                }

                // ConfigMap found but no namespace field, assume current namespace
                return namespace;
            } catch (error) {
                // ConfigMap not found in this namespace, try next
                continue;
            }
        }

        return null;
    }

    /**
     * Get operator namespace from VS Code settings
     * 
     * Settings structure:
     * - String: applies to all clusters
     * - Object: per-cluster configuration
     * 
     * @param clusterContext Cluster context name
     * @returns Namespace from settings or null
     */
    private getNamespaceFromSettings(clusterContext: string): string | null {
        const config = vscode.workspace.getConfiguration('kube9');
        const namespaceConfig = config.get<string | Record<string, string>>('operatorNamespace');

        if (!namespaceConfig) {
            return null;
        }

        // String config applies to all clusters
        if (typeof namespaceConfig === 'string') {
            return namespaceConfig;
        }

        // Object config is per-cluster
        if (typeof namespaceConfig === 'object') {
            return namespaceConfig[clusterContext] || null;
        }

        return null;
    }

    /**
     * Invalidate cached namespace for a cluster
     * Call this when operator status changes or namespace might have changed
     * 
     * @param clusterContext Cluster context name
     */
    invalidateCache(clusterContext: string): void {
        this.namespaceCache.delete(clusterContext);
        console.log(`Namespace cache invalidated for cluster: ${clusterContext}`);
    }

    /**
     * Get cached namespace without triggering discovery
     * 
     * @param clusterContext Cluster context name
     * @returns Cached namespace or undefined
     */
    getCachedNamespace(clusterContext: string): string | undefined {
        return this.namespaceCache.get(clusterContext);
    }

    /**
     * Clear all cached namespaces
     * Useful for testing or after major configuration changes
     */
    clearCache(): void {
        this.namespaceCache.clear();
        console.log('All namespace cache cleared');
    }

    /**
     * Validate that operator exists in resolved namespace
     * Optional validation step to ensure discovery is correct
     * 
     * @param clusterContext Cluster context name
     * @param namespace Namespace to validate
     * @returns True if operator pod found, false otherwise
     */
    async validateNamespace(clusterContext: string, namespace: string): Promise<boolean> {
        try {
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(clusterContext);

            const pods = await apiClient.core.listNamespacedPod({
                namespace: namespace,
                labelSelector: 'app=kube9-operator'
            });

            const operatorPods = pods.items.filter(pod => 
                pod.metadata?.labels?.['app'] === 'kube9-operator'
            );

            if (operatorPods.length === 0) {
                console.warn(`No operator pods found in namespace: ${namespace}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Failed to validate namespace ${namespace}: ${(error as Error).message}`);
            return false;
        }
    }
}

// Singleton instance
let resolverInstance: OperatorNamespaceResolver | null = null;

/**
 * Get singleton instance of OperatorNamespaceResolver
 */
export function getOperatorNamespaceResolver(): OperatorNamespaceResolver {
    if (!resolverInstance) {
        resolverInstance = new OperatorNamespaceResolver();
    }
    return resolverInstance;
}
```

## Migration of Existing Code

### 1. OperatorStatusClient

**Before**:
```typescript
const STATUS_NAMESPACE = 'kube9-system'; // Hardcoded

async getOperatorStatus(clusterContext: string): Promise<OperatorStatus> {
    const configMap = await this.apiClient.core.readNamespacedConfigMap({
        name: 'kube9-operator-status',
        namespace: STATUS_NAMESPACE // Hardcoded
    });
    // ...
}
```

**After**:
```typescript
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

async getOperatorStatus(clusterContext: string): Promise<OperatorStatus> {
    const resolver = getOperatorNamespaceResolver();
    const namespace = await resolver.resolveNamespace(clusterContext);
    
    const configMap = await this.apiClient.core.readNamespacedConfigMap({
        name: 'kube9-operator-status',
        namespace: namespace // Dynamic
    });
    // ...
}
```

### 2. EventsProvider

**Before**:
```typescript
exec.exec(
    'kube9-system', // Hardcoded
    podName,
    'kube9-operator',
    commandArgs,
    // ...
);

const pods = await apiClient.core.listNamespacedPod({
    namespace: 'kube9-system' // Hardcoded
});
```

**After**:
```typescript
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

private async executeOperatorCLI(
    clusterContext: string,
    command: string
): Promise<string> {
    const resolver = getOperatorNamespaceResolver();
    const namespace = await resolver.resolveNamespace(clusterContext);
    
    const podName = await this.getOperatorPodName(apiClient, namespace);
    
    exec.exec(
        namespace, // Dynamic
        podName,
        'kube9-operator',
        commandArgs,
        // ...
    );
}

private async getOperatorPodName(
    apiClient: KubernetesApiClient,
    namespace: string
): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({
        namespace: namespace // Dynamic
    });
    // ...
}
```

### 3. DashboardDataProvider

**Before**:
```typescript
const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-operator-status',
    namespace: 'kube9-system' // Hardcoded (line 313)
});
```

**After**:
```typescript
import { getOperatorNamespaceResolver } from '../services/OperatorNamespaceResolver';

const resolver = getOperatorNamespaceResolver();
const namespace = await resolver.resolveNamespace(clusterContext);

const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-operator-status',
    namespace: namespace // Dynamic
});
```

### 4. AIRecommendationsQuery

**Before**:
```typescript
const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-ai-recommendations',
    namespace: 'kube9-system' // Hardcoded (line 46)
});
```

**After**:
```typescript
import { getOperatorNamespaceResolver } from '../services/OperatorNamespaceResolver';

const resolver = getOperatorNamespaceResolver();
const namespace = await resolver.resolveNamespace(clusterContext);

const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-ai-recommendations',
    namespace: namespace // Dynamic
});
```

## VS Code Settings Schema

**File**: `package.json` (contributes.configuration)

```json
{
  "kube9.operatorNamespace": {
    "type": ["string", "object"],
    "default": null,
    "markdownDescription": "Custom namespace for kube9-operator. Leave empty for auto-detection.\n\n**String example** (applies to all clusters):\n```json\n\"kube9.operatorNamespace\": \"my-kube9\"\n```\n\n**Object example** (per-cluster):\n```json\n\"kube9.operatorNamespace\": {\n  \"production\": \"kube9-prod\",\n  \"staging\": \"kube9-staging\"\n}\n```"
  }
}
```

## Operator Status ConfigMap Enhancement

The operator should include its namespace in the status ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-operator-status
  namespace: kube9-custom  # Whatever namespace it's in
data:
  namespace: kube9-custom  # NEW: Self-report namespace
  status: enabled
  version: 1.0.0
  # ... other fields
```

## Cache Invalidation Strategy

Invalidate cache when:

1. **Operator status changes**: After operator upgrade/reinstall
2. **Cluster context switches**: Already handled (cache is per-context)
3. **Settings change**: Listen to configuration changes
4. **Explicit user action**: Command to refresh namespace

```typescript
// Listen to settings changes
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('kube9.operatorNamespace')) {
        const resolver = getOperatorNamespaceResolver();
        resolver.clearCache();
    }
});
```

## Error Handling

### Namespace Not Found

```typescript
try {
    const namespace = await resolver.resolveNamespace(clusterContext);
    // Use namespace
} catch (error) {
    vscode.window.showErrorMessage(
        `Failed to resolve operator namespace: ${error.message}. ` +
        `Please configure kube9.operatorNamespace in settings.`
    );
    // Fall back to basic mode or handle gracefully
}
```

### Validation Failure

```typescript
const namespace = await resolver.resolveNamespace(clusterContext);
const isValid = await resolver.validateNamespace(clusterContext, namespace);

if (!isValid) {
    vscode.window.showWarningMessage(
        `Operator not found in namespace '${namespace}'. ` +
        `Please check your configuration or operator installation.`
    );
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('OperatorNamespaceResolver', () => {
    it('should return cached namespace on second call', async () => {
        const resolver = new OperatorNamespaceResolver();
        const namespace1 = await resolver.resolveNamespace('test-cluster');
        const namespace2 = await resolver.resolveNamespace('test-cluster');
        expect(namespace1).toBe(namespace2);
        // Verify only one API call was made
    });

    it('should read from settings when ConfigMap not found', async () => {
        // Mock settings to return 'my-namespace'
        // Mock ConfigMap API to return 404
        const resolver = new OperatorNamespaceResolver();
        const namespace = await resolver.resolveNamespace('test-cluster');
        expect(namespace).toBe('my-namespace');
    });

    it('should fall back to default when all else fails', async () => {
        // Mock settings to return null
        // Mock ConfigMap API to return 404
        const resolver = new OperatorNamespaceResolver();
        const namespace = await resolver.resolveNamespace('test-cluster');
        expect(namespace).toBe('kube9-system');
    });
});
```

### Integration Tests

- Test with operator in default 'kube9-system' namespace
- Test with operator in custom namespace
- Test with per-cluster settings configuration
- Test cache invalidation scenarios

## Performance Considerations

- **Caching**: First resolution may take 100-500ms, subsequent calls are instant
- **Bootstrap**: ConfigMap lookup is necessary but unavoidable
- **Settings**: Reading VS Code settings is very fast (<1ms)
- **Validation**: Optional, should be called sparingly

## Migration Checklist

- [ ] Create OperatorNamespaceResolver service
- [ ] Update OperatorStatusClient to use resolver
- [ ] Update EventsProvider to use resolver
- [ ] Update DashboardDataProvider to use resolver
- [ ] Update AIRecommendationsQuery to use resolver
- [ ] Add settings schema to package.json
- [ ] Add cache invalidation on settings change
- [ ] Remove all hardcoded 'kube9-system' references
- [ ] Add logging for debugging namespace resolution
- [ ] Update operator to include namespace in status ConfigMap
- [ ] Test with operator in custom namespace
- [ ] Update documentation

