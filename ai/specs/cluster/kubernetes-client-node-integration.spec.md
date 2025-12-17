---
spec_id: kubernetes-client-node-integration
name: Kubernetes Client-Node Integration
description: Technical specification for replacing kubectl process spawning with @kubernetes/client-node library
feature_id:
  - api-client-performance
diagram_id:
  - api-client-architecture
---

# Kubernetes Client-Node Integration

## Overview

Replace kubectl process spawning with the `@kubernetes/client-node` library to eliminate process creation overhead, enable connection pooling, support parallel operations, and provide a foundation for intelligent caching. This change targets the tree view and resource fetching operations, maintaining backward compatibility with existing kubectl-based commands.

## Architecture

See [api-client-architecture](../../diagrams/cluster/api-client-architecture.diagram.md) for visual representation of the new architecture.

### Lazy Loading Strategy

To optimize initial tree load performance, especially with multiple clusters or unreachable clusters, cluster status checks are lazy-loaded when a cluster is first expanded rather than eagerly loaded on initial tree display.

**Initial Tree Load (Immediate)**:
- Clusters are displayed immediately from kubeconfig
- No connectivity checks performed
- No operator status queries
- No ArgoCD installation checks
- Tree appears instantly with all clusters visible

**First Cluster Expansion (Lazy Loading)**:
When a user expands a cluster for the first time:
1. `checkSingleClusterConnectivity()` - Checks cluster reachability
2. `checkOperatorStatus()` - Queries kube9-operator-status ConfigMap (5-minute cache)
3. `checkArgoCDStatus()` - Checks ArgoCD installation (5-minute cache)
4. Cluster item appearance updates asynchronously as checks complete

**Benefits**:
- **Instant tree load**: No waiting for unreachable clusters
- **Reduced API calls**: Only check clusters the user interacts with
- **Better UX**: Users can browse clusters immediately
- **Scalable**: Works efficiently with dozens of clusters

**Implementation Location**:
- `ClusterTreeProvider.getCategories()` - Triggers lazy loading on first expansion
- `ClusterTreeProvider.checkSingleClusterConnectivity()` - Lazy connectivity check
- `ClusterTreeProvider.checkOperatorStatus()` - Lazy operator status check
- `ClusterTreeProvider.checkArgoCDStatus()` - Lazy ArgoCD check

### Targeted Namespace Refresh

When a user changes the active namespace for a cluster, only the affected cluster item refreshes rather than rebuilding the entire tree.

**Namespace Change Flow**:
1. User selects "Set as Active Namespace" on a namespace item
2. `namespaceCommands.setActiveNamespaceCommand()` updates kubectl context
3. `ClusterTreeProvider.refreshForNamespaceChange(contextName)` called
4. Resource cache for that context invalidated using regex pattern
5. Only the specific cluster item is refreshed via `_onDidChangeTreeData.fire(clusterItem)`

**Benefits**:
- **50ms refresh time** instead of full tree rebuild
- **Preserves UI state** for other clusters
- **Efficient cache invalidation** - only affected context
- **Better user experience** - no flickering or delays

## Implementation Details

### Dependency Addition

Add the official Kubernetes JavaScript client library:

```json
{
  "dependencies": {
    "@kubernetes/client-node": "^0.21.0"
  }
}
```

### Core Client Initialization

**Location**: Create new file `src/kubernetes/apiClient.ts`

```typescript
import * as k8s from '@kubernetes/client-node';

export class KubernetesApiClient {
  private kubeConfig: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private batchApi: k8s.BatchV1Api;
  private networkingApi: k8s.NetworkingV1Api;
  
  constructor() {
    this.kubeConfig = new k8s.KubeConfig();
    this.kubeConfig.loadFromDefault();
    
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.batchApi = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
  }
  
  /**
   * Switch to a specific context
   */
  public setContext(contextName: string): void {
    this.kubeConfig.setCurrentContext(contextName);
    
    // Recreate API clients with new context
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.batchApi = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
  }
  
  /**
   * Get current context name
   */
  public getCurrentContext(): string {
    return this.kubeConfig.getCurrentContext();
  }
  
  /**
   * Get all configured contexts
   */
  public getContexts(): k8s.Context[] {
    return this.kubeConfig.getContexts();
  }
  
  // API accessor methods
  public get core(): k8s.CoreV1Api {
    return this.coreApi;
  }
  
  public get apps(): k8s.AppsV1Api {
    return this.appsApi;
  }
  
  public get batch(): k8s.BatchV1Api {
    return this.batchApi;
  }
  
  public get networking(): k8s.NetworkingV1Api {
    return this.networkingApi;
  }
}

// Singleton instance
let apiClientInstance: KubernetesApiClient | null = null;

export function getKubernetesApiClient(): KubernetesApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new KubernetesApiClient();
  }
  return apiClientInstance;
}

export function resetKubernetesApiClient(): void {
  apiClientInstance = null;
}
```

### Resource Fetching Methods

**Location**: Create new file `src/kubernetes/resourceFetchers.ts`

```typescript
import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient } from './apiClient';

export interface FetchOptions {
  timeout?: number;
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
}

/**
 * Fetch all nodes in the cluster
 */
export async function fetchNodes(options: FetchOptions = {}): Promise<k8s.V1Node[]> {
  const client = getKubernetesApiClient();
  
  try {
    const response = await client.core.listNode(
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // continue
      options.fieldSelector,
      options.labelSelector,
      undefined, // limit
      undefined, // resourceVersion
      undefined, // resourceVersionMatch
      undefined, // sendInitialEvents
      options.timeout || 10 // timeoutSeconds
    );
    
    return response.body.items;
  } catch (error) {
    handleApiError(error, 'fetch nodes');
    throw error;
  }
}

/**
 * Fetch all namespaces in the cluster
 */
export async function fetchNamespaces(options: FetchOptions = {}): Promise<k8s.V1Namespace[]> {
  const client = getKubernetesApiClient();
  
  try {
    const response = await client.core.listNamespace(
      undefined,
      undefined,
      undefined,
      options.fieldSelector,
      options.labelSelector,
      undefined,
      undefined,
      undefined,
      undefined,
      options.timeout || 10
    );
    
    return response.body.items;
  } catch (error) {
    handleApiError(error, 'fetch namespaces');
    throw error;
  }
}

/**
 * Fetch pods (optionally filtered by namespace)
 */
export async function fetchPods(options: FetchOptions = {}): Promise<k8s.V1Pod[]> {
  const client = getKubernetesApiClient();
  
  try {
    const response = options.namespace
      ? await client.core.listNamespacedPod(
          options.namespace,
          undefined,
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        )
      : await client.core.listPodForAllNamespaces(
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        );
    
    return response.body.items;
  } catch (error) {
    handleApiError(error, 'fetch pods');
    throw error;
  }
}

/**
 * Fetch deployments (optionally filtered by namespace)
 */
export async function fetchDeployments(options: FetchOptions = {}): Promise<k8s.V1Deployment[]> {
  const client = getKubernetesApiClient();
  
  try {
    const response = options.namespace
      ? await client.apps.listNamespacedDeployment(
          options.namespace,
          undefined,
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        )
      : await client.apps.listDeploymentForAllNamespaces(
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        );
    
    return response.body.items;
  } catch (error) {
    handleApiError(error, 'fetch deployments');
    throw error;
  }
}

/**
 * Fetch services (optionally filtered by namespace)
 */
export async function fetchServices(options: FetchOptions = {}): Promise<k8s.V1Service[]> {
  const client = getKubernetesApiClient();
  
  try {
    const response = options.namespace
      ? await client.core.listNamespacedService(
          options.namespace,
          undefined,
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        )
      : await client.core.listServiceForAllNamespaces(
          undefined,
          undefined,
          options.fieldSelector,
          options.labelSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          options.timeout || 10
        );
    
    return response.body.items;
  } catch (error) {
    handleApiError(error, 'fetch services');
    throw error;
  }
}

/**
 * Parallel resource fetching for tree view initialization
 */
export async function fetchClusterResources(): Promise<{
  nodes: k8s.V1Node[];
  namespaces: k8s.V1Namespace[];
  pods: k8s.V1Pod[];
}> {
  const [nodes, namespaces, pods] = await Promise.all([
    fetchNodes(),
    fetchNamespaces(),
    fetchPods()
  ]);
  
  return { nodes, namespaces, pods };
}

/**
 * Handle API errors with user-friendly messages
 */
function handleApiError(error: any, operation: string): void {
  if (error.response) {
    const status = error.response.statusCode;
    const message = error.response.body?.message || 'Unknown error';
    
    if (status === 401) {
      console.error(`Authentication failed while trying to ${operation}: ${message}`);
    } else if (status === 403) {
      console.error(`Permission denied while trying to ${operation}: ${message}`);
    } else if (status === 404) {
      console.error(`Resource not found while trying to ${operation}: ${message}`);
    } else if (status >= 500) {
      console.error(`Server error while trying to ${operation}: ${message}`);
    } else {
      console.error(`API error while trying to ${operation} (${status}): ${message}`);
    }
  } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    console.error(`Connection failed while trying to ${operation}: ${error.message}`);
  } else {
    console.error(`Unexpected error while trying to ${operation}:`, error);
  }
}
```

### Caching Strategy

**Location**: Create new file `src/kubernetes/cache.ts`

See [api-client-caching-strategy](./api-client-caching-strategy.spec.md) for detailed caching specification.

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export class ResourceCache {
  private cache: Map<string, CacheEntry<any>>;
  
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Store data in cache with TTL
   */
  public set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * Retrieve data from cache if valid
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Invalidate specific cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Invalidate all cache entries matching pattern
   */
  public invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
  }
}

// Singleton cache instance
const resourceCache = new ResourceCache();

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  NODES: 30000,           // 30 seconds
  NAMESPACES: 30000,      // 30 seconds
  PODS: 5000,             // 5 seconds
  DEPLOYMENTS: 10000,     // 10 seconds
  SERVICES: 30000,        // 30 seconds
  CLUSTER_INFO: 60000     // 60 seconds
};

export function getResourceCache(): ResourceCache {
  return resourceCache;
}
```

### Integration with Existing Commands

**Migration Strategy**: Phase 1 - Core Resources

Update the following files to use the new API client:

1. **`src/kubectl/NodeCommands.ts`** → Use `fetchNodes()`
2. **`src/kubectl/NamespaceCommands.ts`** → Use `fetchNamespaces()`
3. **`src/kubectl/PodCommands.ts`** → Use `fetchPods()`
4. **`src/tree/ClusterTreeProvider.ts`** → Use `fetchClusterResources()` for parallel loading

**Example migration** for `NodeCommands.ts`:

```typescript
// BEFORE (using kubectl)
async function listNodes(): Promise<NodeInfo[]> {
  const { stdout } = await execFileAsync(
    'kubectl',
    ['get', 'nodes', '--output=json'],
    { timeout: 5000, maxBuffer: 50 * 1024 * 1024 }
  );
  const response = JSON.parse(stdout);
  return response.items;
}

// AFTER (using @kubernetes/client-node)
import { fetchNodes } from '../kubernetes/resourceFetchers';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';

async function listNodes(): Promise<k8s.V1Node[]> {
  const cache = getResourceCache();
  const cacheKey = 'nodes';
  
  // Check cache first
  const cached = cache.get<k8s.V1Node[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  const nodes = await fetchNodes({ timeout: 10 });
  
  // Store in cache
  cache.set(cacheKey, nodes, CACHE_TTL.NODES);
  
  return nodes;
}
```

### Kubeconfig Compatibility

The `@kubernetes/client-node` library provides full compatibility with kubectl kubeconfig:

**Supported Authentication Methods**:
- Certificate-based authentication (client-certificate, client-key)
- Token-based authentication (token, tokenFile)
- Username/password (basic auth)
- Exec providers (e.g., aws-iam-authenticator, gcp, azure)
- OIDC authentication
- Cloud provider authentication plugins

**Kubeconfig Loading**:
```typescript
// Load from default location (~/.kube/config)
kubeConfig.loadFromDefault();

// Or load from specific file
kubeConfig.loadFromFile('/path/to/kubeconfig');

// Or load from string
kubeConfig.loadFromString(configYaml);

// Or load from kubectl's current config
kubeConfig.loadFromCluster(); // For in-cluster config
```

**Context Management**:
```typescript
// List all contexts
const contexts = kubeConfig.getContexts();

// Get current context
const currentContext = kubeConfig.getCurrentContext();

// Switch context
kubeConfig.setCurrentContext('minikube');

// Get cluster information for context
const cluster = kubeConfig.getCluster(currentContext);
const user = kubeConfig.getUser(currentContext);
```

### Error Handling

**Error Types**:

| Error Code | Description | User Action |
|------------|-------------|-------------|
| 401 | Authentication failed | Check credentials in kubeconfig |
| 403 | Permission denied (RBAC) | Contact cluster administrator |
| 404 | Resource not found | Verify resource exists |
| 408 | Request timeout | Check network connectivity |
| 500-599 | Server errors | Check cluster health |
| ETIMEDOUT | Connection timeout | Verify cluster is reachable |
| ECONNREFUSED | Connection refused | Check cluster endpoint |
| ENOTFOUND | DNS resolution failed | Verify cluster address |

**Error Handling Pattern**:
```typescript
try {
  const resources = await fetchPods({ namespace: 'default' });
  return resources;
} catch (error: any) {
  if (error.response?.statusCode === 403) {
    vscode.window.showErrorMessage(
      'Permission denied: You do not have access to list pods. Check your RBAC permissions.'
    );
  } else if (error.code === 'ETIMEDOUT') {
    vscode.window.showErrorMessage(
      'Connection timeout: Unable to reach cluster. Check your network connection.'
    );
  } else {
    vscode.window.showErrorMessage(
      `Failed to fetch resources: ${error.message}`
    );
  }
  throw error;
}
```

### Performance Metrics

**Expected Improvements**:

| Operation | Before (kubectl) | After (API client) | Improvement |
|-----------|------------------|-------------------|-------------|
| List nodes | 200-500ms | 50-100ms | 60-75% faster |
| List namespaces | 200-500ms | 50-100ms | 60-75% faster |
| List pods (all ns) | 500-1000ms | 100-200ms | 70-80% faster |
| Tree view load | 1000-2000ms | 200-400ms | 70-80% faster |
| Context switch | 300-700ms | 50-150ms | 70-80% faster |

**Overhead Breakdown**:
- **Process spawning**: 50-200ms (eliminated)
- **TCP connection**: 20-100ms (reused via connection pooling)
- **JSON parsing**: ~10ms (same for both)
- **kubectl CLI overhead**: 30-100ms (eliminated)

### Testing Requirements

**Unit Tests**:
- API client initialization
- Resource fetching methods
- Cache get/set/invalidate operations
- Error handling for various HTTP status codes
- Context switching behavior

**Integration Tests**:
- Kubeconfig loading and parsing
- Authentication with different methods
- API calls to real test cluster
- Connection pooling verification
- Cache TTL expiration

**Performance Tests**:
- Measure tree view load time before/after
- Verify parallel loading works correctly
- Ensure caching reduces API calls
- Benchmark large cluster performance

## Best Practices

1. **Always use caching for cluster-level resources** (nodes, namespaces)
2. **Use shorter TTLs for dynamic resources** (pods, replica counts)
3. **Invalidate cache on user-triggered refresh**
4. **Use parallel fetching for independent resources**
5. **Handle errors gracefully with user-friendly messages**
6. **Maintain kubectl as fallback for complex operations** (exec, port-forward, logs)
7. **Reuse API client instances across operations**
8. **Set appropriate timeouts for API calls** (10-30 seconds)

## Migration Phases

### Phase 1: Core Resources (Week 1)
- Migrate node, namespace, pod fetching
- Update ClusterTreeProvider for parallel loading
- Add caching layer
- **Success Criteria**: Tree view loads 50%+ faster

### Phase 2: Workload Resources (Week 2)
- Migrate deployment, statefulset, daemonset fetching
- Update workload commands
- Extend caching to workload resources
- **Success Criteria**: All tree view operations use API client

### Phase 3: Additional Resources (Week 3)
- Migrate service, configmap, secret fetching
- Update remaining command files
- **Success Criteria**: No kubectl process spawning for read operations

### Phase 4: Optimization (Week 4)
- Fine-tune cache TTLs
- Implement smarter invalidation strategies
- Add performance monitoring
- **Success Criteria**: Performance parity with Microsoft Kubernetes extension

## Rollback Strategy

**Keep kubectl as fallback**:
```typescript
async function fetchNodesWithFallback(): Promise<any[]> {
  try {
    // Try API client first
    return await fetchNodes();
  } catch (error) {
    console.warn('API client failed, falling back to kubectl:', error);
    // Fall back to kubectl
    return await fetchNodesViaKubectl();
  }
}
```

**Feature flag for gradual rollout**:
```typescript
const USE_API_CLIENT = vscode.workspace
  .getConfiguration('kube9')
  .get<boolean>('useApiClient', true);

if (USE_API_CLIENT) {
  return await fetchNodes();
} else {
  return await fetchNodesViaKubectl();
}
```

