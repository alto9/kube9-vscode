---
diagram_id: api-client-architecture
name: API Client Architecture
description: Visual comparison of kubectl process spawning vs direct Kubernetes API client architecture
type: components
spec_id:
  - kubernetes-client-node-integration
  - api-client-caching-strategy
feature_id:
  - api-client-performance
---

# API Client Architecture

This diagram shows the architectural transformation from kubectl process spawning to direct Kubernetes API client integration, highlighting the performance benefits of connection pooling, parallel operations, and intelligent caching.

```json
{
  "nodes": [
    {
      "id": "old-label",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": { 
        "label": "BEFORE: kubectl Process Spawning",
        "description": "Legacy architecture with process overhead"
      },
      "style": {
        "background": "#fee",
        "border": "2px solid #c44",
        "fontSize": 16,
        "fontWeight": "bold"
      }
    },
    {
      "id": "old-vscode",
      "type": "default",
      "position": { "x": 50, "y": 150 },
      "data": { 
        "label": "VS Code Extension",
        "description": "Tree provider and commands"
      }
    },
    {
      "id": "old-exec-1",
      "type": "default",
      "position": { "x": 50, "y": 250 },
      "data": { 
        "label": "Process 1\nkubectl get nodes",
        "description": "New process spawned"
      },
      "style": {
        "background": "#ffd",
        "border": "1px solid #cc6"
      }
    },
    {
      "id": "old-exec-2",
      "type": "default",
      "position": { "x": 180, "y": 250 },
      "data": { 
        "label": "Process 2\nkubectl get namespaces",
        "description": "Another process spawned"
      },
      "style": {
        "background": "#ffd",
        "border": "1px solid #cc6"
      }
    },
    {
      "id": "old-exec-3",
      "type": "default",
      "position": { "x": 310, "y": 250 },
      "data": { 
        "label": "Process 3\nkubectl get pods",
        "description": "Third process spawned"
      },
      "style": {
        "background": "#ffd",
        "border": "1px solid #cc6"
      }
    },
    {
      "id": "old-tcp-1",
      "type": "default",
      "position": { "x": 50, "y": 370 },
      "data": { 
        "label": "TCP Conn 1",
        "description": "New connection"
      },
      "style": {
        "background": "#ffe",
        "width": 100
      }
    },
    {
      "id": "old-tcp-2",
      "type": "default",
      "position": { "x": 180, "y": 370 },
      "data": { 
        "label": "TCP Conn 2",
        "description": "New connection"
      },
      "style": {
        "background": "#ffe",
        "width": 100
      }
    },
    {
      "id": "old-tcp-3",
      "type": "default",
      "position": { "x": 310, "y": 370 },
      "data": { 
        "label": "TCP Conn 3",
        "description": "New connection"
      },
      "style": {
        "background": "#ffe",
        "width": 100
      }
    },
    {
      "id": "old-k8s-api",
      "type": "default",
      "position": { "x": 150, "y": 490 },
      "data": { 
        "label": "Kubernetes API Server",
        "description": "Target cluster"
      },
      "style": {
        "background": "#326ce5",
        "color": "#fff",
        "width": 200
      }
    },
    {
      "id": "old-overhead",
      "type": "default",
      "position": { "x": 450, "y": 250 },
      "data": { 
        "label": "Performance Issues",
        "description": "50-200ms process overhead per call\n+ New TCP handshake each time\n+ Serial execution\n+ No caching"
      },
      "style": {
        "background": "#fdd",
        "border": "2px solid #c44",
        "fontSize": 11,
        "width": 220
      }
    },
    {
      "id": "new-label",
      "type": "default",
      "position": { "x": 800, "y": 50 },
      "data": { 
        "label": "AFTER: Direct API Client",
        "description": "Modern architecture with performance optimizations"
      },
      "style": {
        "background": "#efe",
        "border": "2px solid #4c4",
        "fontSize": 16,
        "fontWeight": "bold"
      }
    },
    {
      "id": "new-vscode",
      "type": "default",
      "position": { "x": 800, "y": 150 },
      "data": { 
        "label": "VS Code Extension",
        "description": "Tree provider and commands"
      }
    },
    {
      "id": "new-api-client",
      "type": "default",
      "position": { "x": 800, "y": 250 },
      "data": { 
        "label": "@kubernetes/client-node",
        "description": "API client singleton"
      },
      "style": {
        "background": "#dfd",
        "border": "2px solid #4c4",
        "width": 200
      }
    },
    {
      "id": "new-cache",
      "type": "default",
      "position": { "x": 1050, "y": 250 },
      "data": { 
        "label": "Resource Cache",
        "description": "Intelligent TTL-based caching"
      },
      "style": {
        "background": "#def",
        "border": "2px solid #69c"
      }
    },
    {
      "id": "new-tcp-pool",
      "type": "default",
      "position": { "x": 800, "y": 370 },
      "data": { 
        "label": "Connection Pool",
        "description": "Reused TCP connections"
      },
      "style": {
        "background": "#dfd",
        "border": "2px solid #4c4",
        "width": 200
      }
    },
    {
      "id": "new-k8s-api",
      "type": "default",
      "position": { "x": 850, "y": 490 },
      "data": { 
        "label": "Kubernetes API Server",
        "description": "Target cluster"
      },
      "style": {
        "background": "#326ce5",
        "color": "#fff",
        "width": 200
      }
    },
    {
      "id": "new-benefits",
      "type": "default",
      "position": { "x": 1100, "y": 370 },
      "data": { 
        "label": "Performance Benefits",
        "description": "✓ No process overhead\n✓ Connection reuse\n✓ Parallel operations\n✓ Intelligent caching\n✓ 50-80% faster"
      },
      "style": {
        "background": "#efe",
        "border": "2px solid #4c4",
        "fontSize": 11,
        "width": 200
      }
    }
  ],
  "edges": [
    {
      "id": "old-e1",
      "source": "old-vscode",
      "target": "old-exec-1",
      "label": "spawn",
      "type": "smoothstep",
      "animated": false
    },
    {
      "id": "old-e2",
      "source": "old-vscode",
      "target": "old-exec-2",
      "label": "spawn",
      "type": "smoothstep",
      "animated": false
    },
    {
      "id": "old-e3",
      "source": "old-vscode",
      "target": "old-exec-3",
      "label": "spawn",
      "type": "smoothstep",
      "animated": false
    },
    {
      "id": "old-e4",
      "source": "old-exec-1",
      "target": "old-tcp-1",
      "label": "new conn",
      "type": "smoothstep"
    },
    {
      "id": "old-e5",
      "source": "old-exec-2",
      "target": "old-tcp-2",
      "label": "new conn",
      "type": "smoothstep"
    },
    {
      "id": "old-e6",
      "source": "old-exec-3",
      "target": "old-tcp-3",
      "label": "new conn",
      "type": "smoothstep"
    },
    {
      "id": "old-e7",
      "source": "old-tcp-1",
      "target": "old-k8s-api",
      "label": "GET /api/v1/nodes",
      "type": "smoothstep"
    },
    {
      "id": "old-e8",
      "source": "old-tcp-2",
      "target": "old-k8s-api",
      "label": "GET /api/v1/namespaces",
      "type": "smoothstep"
    },
    {
      "id": "old-e9",
      "source": "old-tcp-3",
      "target": "old-k8s-api",
      "label": "GET /api/v1/pods",
      "type": "smoothstep"
    },
    {
      "id": "new-e1",
      "source": "new-vscode",
      "target": "new-api-client",
      "label": "direct call",
      "type": "smoothstep",
      "style": {
        "stroke": "#4c4",
        "strokeWidth": 2
      }
    },
    {
      "id": "new-e2",
      "source": "new-api-client",
      "target": "new-cache",
      "label": "check cache",
      "type": "smoothstep",
      "style": {
        "stroke": "#69c",
        "strokeWidth": 2
      }
    },
    {
      "id": "new-e3",
      "source": "new-cache",
      "target": "new-api-client",
      "label": "hit/miss",
      "type": "smoothstep",
      "style": {
        "stroke": "#69c",
        "strokeWidth": 2
      }
    },
    {
      "id": "new-e4",
      "source": "new-api-client",
      "target": "new-tcp-pool",
      "label": "reuse connection",
      "type": "smoothstep",
      "style": {
        "stroke": "#4c4",
        "strokeWidth": 2
      }
    },
    {
      "id": "new-e5",
      "source": "new-tcp-pool",
      "target": "new-k8s-api",
      "label": "parallel requests",
      "type": "smoothstep",
      "style": {
        "stroke": "#4c4",
        "strokeWidth": 2
      },
      "animated": true
    }
  ]
}
```

## Diagram Notes

### Key Architectural Changes

**BEFORE (kubectl Process Spawning)**:
1. **Process Overhead**: Each operation spawns a new kubectl process (50-200ms overhead)
2. **Connection Overhead**: Every process creates a new TCP connection to the Kubernetes API
3. **Serial Execution**: Operations run sequentially, not in parallel
4. **No Caching**: Every tree expansion makes fresh API calls
5. **JSON Parsing**: Additional overhead parsing kubectl's stdout

**AFTER (Direct API Client)**:
1. **No Process Overhead**: Direct JavaScript API calls, no process spawning
2. **Connection Pooling**: TCP connections are reused across multiple operations
3. **Parallel Operations**: Multiple resources fetched simultaneously with `Promise.all()`
4. **Intelligent Caching**: TTL-based caching reduces redundant API calls
5. **Native Objects**: API returns typed objects, no JSON parsing needed

### Performance Impact

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| List Nodes | 200-500ms | 50-100ms | 60-75% faster |
| List Namespaces | 200-500ms | 50-100ms | 60-75% faster |
| Tree View Load | 1000-2000ms | 200-400ms | 70-80% faster |
| Cached Resource | N/A | 1-5ms | 95-99% faster |

### Connection Pooling Benefits

The `@kubernetes/client-node` library uses the Node.js HTTP Agent with connection pooling by default:

- **Keep-Alive**: Connections remain open for reuse
- **Max Sockets**: Default 5 connections per host (configurable)
- **Idle Timeout**: Connections close after inactivity (typically 30s)
- **Automatic Management**: Agent handles connection lifecycle

This eliminates the TCP handshake overhead (typically 20-100ms) for repeated operations.

### Parallel Operation Example

```typescript
// BEFORE: Sequential (total: 600-1500ms)
const nodes = await executeKubectl(['get', 'nodes', '-o', 'json']);        // 200-500ms
const namespaces = await executeKubectl(['get', 'namespaces', '-o', 'json']); // 200-500ms
const pods = await executeKubectl(['get', 'pods', '-A', '-o', 'json']);    // 200-500ms

// AFTER: Parallel (total: 200-500ms)
const [nodes, namespaces, pods] = await Promise.all([
  fetchNodes(),        // All three run simultaneously
  fetchNamespaces(),   // sharing connection pool
  fetchPods()          // completing in ~same time as slowest
]);
```

### Caching Strategy

The cache layer provides:

1. **TTL-Based Expiration**: Different TTLs based on resource volatility
   - Nodes/Namespaces: 30s (relatively static)
   - Deployments/Services: 10-30s (moderate change)
   - Pods: 5s (highly dynamic)

2. **Context-Aware**: Separate cache entries per kubectl context

3. **Selective Invalidation**:
   - Manual refresh: Clears context cache
   - Resource mutation: Invalidates related entries
   - TTL expiration: Automatic removal

4. **Memory Management**:
   - Maximum total size: 100 MB
   - LRU eviction when limit reached
   - Prioritizes current context

### Migration Path

**Phase 1**: Core Resources (Nodes, Namespaces, Pods)
- Replace high-frequency operations first
- Keep kubectl as fallback

**Phase 2**: Workload Resources (Deployments, Services, etc.)
- Migrate remaining resource types

**Phase 3**: Optimization
- Fine-tune cache TTLs
- Implement predictive prefetching
- Add performance monitoring

### Authentication Compatibility

The API client supports all kubectl authentication methods:
- Certificate-based (client cert + key)
- Token-based (bearer tokens)
- Exec providers (aws-iam-authenticator, gcloud, etc.)
- OIDC authentication
- Cloud provider plugins

It reads credentials from the same kubeconfig file as kubectl, ensuring transparent compatibility.

