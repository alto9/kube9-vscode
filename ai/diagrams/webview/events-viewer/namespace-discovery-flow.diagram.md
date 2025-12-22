---
diagram_id: namespace-discovery-flow
name: Namespace Discovery Flow
description: Three-tier namespace resolution strategy for discovering kube9-operator namespace
type: flows
spec_id:
  - namespace-discovery-spec
feature_id:
  - dynamic-namespace-discovery
---

# Namespace Discovery Flow

This diagram shows the three-tier resolution strategy for discovering the namespace where kube9-operator is installed.

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "default",
      "position": { "x": 400, "y": 50 },
      "data": {
        "label": "resolveNamespace()",
        "description": "Entry point"
      }
    },
    {
      "id": "check-cache",
      "type": "default",
      "position": { "x": 400, "y": 150 },
      "data": {
        "label": "Check Cache",
        "description": "namespaceCache.get(cluster)"
      }
    },
    {
      "id": "cache-hit",
      "type": "default",
      "position": { "x": 600, "y": 150 },
      "data": {
        "label": "Return Cached",
        "description": "Fast path (instant)"
      }
    },
    {
      "id": "tier1-configmap",
      "type": "default",
      "position": { "x": 200, "y": 250 },
      "data": {
        "label": "Tier 1: ConfigMap",
        "description": "discoverFromConfigMap()"
      }
    },
    {
      "id": "get-settings",
      "type": "default",
      "position": { "x": 200, "y": 350 },
      "data": {
        "label": "Get Settings Namespace",
        "description": "For bootstrap lookup"
      }
    },
    {
      "id": "try-settings-ns",
      "type": "default",
      "position": { "x": 200, "y": 450 },
      "data": {
        "label": "Try Settings Namespace",
        "description": "Look for ConfigMap"
      }
    },
    {
      "id": "try-default-ns",
      "type": "default",
      "position": { "x": 200, "y": 550 },
      "data": {
        "label": "Try Default Namespace",
        "description": "kube9-system"
      }
    },
    {
      "id": "configmap-found",
      "type": "default",
      "position": { "x": 400, "y": 450 },
      "data": {
        "label": "ConfigMap Found",
        "description": "Check namespace field"
      }
    },
    {
      "id": "tier2-settings",
      "type": "default",
      "position": { "x": 400, "y": 650 },
      "data": {
        "label": "Tier 2: Settings",
        "description": "getNamespaceFromSettings()"
      }
    },
    {
      "id": "settings-string",
      "type": "default",
      "position": { "x": 500, "y": 750 },
      "data": {
        "label": "String Config",
        "description": "Applies to all clusters"
      }
    },
    {
      "id": "settings-object",
      "type": "default",
      "position": { "x": 300, "y": 750 },
      "data": {
        "label": "Object Config",
        "description": "Per-cluster mapping"
      }
    },
    {
      "id": "tier3-default",
      "type": "default",
      "position": { "x": 400, "y": 850 },
      "data": {
        "label": "Tier 3: Default",
        "description": "kube9-system"
      }
    },
    {
      "id": "cache-result",
      "type": "default",
      "position": { "x": 400, "y": 950 },
      "data": {
        "label": "Cache & Return",
        "description": "namespaceCache.set()"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "check-cache",
      "label": "First step",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "check-cache",
      "target": "cache-hit",
      "label": "if cached",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e3",
      "source": "check-cache",
      "target": "tier1-configmap",
      "label": "if not cached",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "tier1-configmap",
      "target": "get-settings",
      "label": "Start",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "get-settings",
      "target": "try-settings-ns",
      "label": "if configured",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "get-settings",
      "target": "try-default-ns",
      "label": "else",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "try-settings-ns",
      "target": "configmap-found",
      "label": "found",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e8",
      "source": "try-settings-ns",
      "target": "try-default-ns",
      "label": "not found",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "try-default-ns",
      "target": "configmap-found",
      "label": "found",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e10",
      "source": "try-default-ns",
      "target": "tier2-settings",
      "label": "not found",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "configmap-found",
      "target": "cache-result",
      "label": "use namespace field",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e12",
      "source": "tier2-settings",
      "target": "settings-string",
      "label": "if string",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "tier2-settings",
      "target": "settings-object",
      "label": "if object",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "tier2-settings",
      "target": "tier3-default",
      "label": "if null",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "settings-string",
      "target": "cache-result",
      "label": "use value",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e16",
      "source": "settings-object",
      "target": "cache-result",
      "label": "use cluster value",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e17",
      "source": "tier3-default",
      "target": "cache-result",
      "label": "kube9-system",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Resolution Strategy

### Tier 1: ConfigMap Discovery (Primary)

The operator status ConfigMap is the source of truth. The challenge is finding it when we don't know which namespace it's in.

**Bootstrap Strategy:**
1. Get namespace from settings (if configured)
2. Try that namespace first
3. Fall back to default `kube9-system`
4. Look for `kube9-operator-status` ConfigMap
5. If found, read `namespace` field from ConfigMap data
6. Use that namespace (even if different from where we found it)

**ConfigMap Structure:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-operator-status
  namespace: kube9-custom
data:
  namespace: kube9-custom  # Self-reported namespace
  status: enabled
  version: 1.0.0
```

### Tier 2: VS Code Settings (Fallback)

If ConfigMap not found or doesn't have namespace field, check settings:

**String Configuration** (applies to all clusters):
```json
{
  "kube9.operatorNamespace": "my-kube9"
}
```

**Object Configuration** (per-cluster):
```json
{
  "kube9.operatorNamespace": {
    "production": "kube9-prod",
    "staging": "kube9-staging",
    "dev": "kube9-system"
  }
}
```

### Tier 3: Default (Last Resort)

If all else fails, use `'kube9-system'` as the default namespace.

## Caching Strategy

### Cache on First Resolution

```typescript
const namespace = await resolver.resolveNamespace('production');
// namespace is now cached for 'production' cluster
```

### Subsequent Calls Use Cache

```typescript
const namespace = await resolver.resolveNamespace('production');
// Returns cached value instantly (no API calls)
```

### Cache Invalidation

```typescript
// Manual invalidation
resolver.invalidateCache('production');

// On settings change
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('kube9.operatorNamespace')) {
        resolver.clearCache();
    }
});

// On operator status change
when operatorStatusUpdates() {
    resolver.invalidateCache(clusterContext);
}
```

## Performance

### Best Case (Cached)

- **Time**: < 1ms (memory lookup)
- **API Calls**: 0

### Tier 1 (ConfigMap Found)

- **Time**: 100-500ms
- **API Calls**: 1-2 (try settings namespace, then default if needed)

### Tier 2 (Settings)

- **Time**: 1-5ms (read VS Code settings)
- **API Calls**: 2-3 (tried ConfigMap, failed)

### Tier 3 (Default)

- **Time**: 1-5ms (no external calls)
- **API Calls**: 2-3 (tried ConfigMap, no settings)

## Error Handling

### ConfigMap API Errors

```typescript
try {
    const configMap = await apiClient.core.readNamespacedConfigMap({...});
    // Process ConfigMap
} catch (error) {
    // ConfigMap not found or not accessible
    // Continue to next tier
}
```

### Invalid Settings

```typescript
const namespaceConfig = config.get('operatorNamespace');
if (typeof namespaceConfig !== 'string' && typeof namespaceConfig !== 'object') {
    // Invalid config, skip to next tier
}
```

### All Tiers Fail

```typescript
// This should never happen in practice
// Default namespace is always available
return 'kube9-system';
```

## Migration Path

### Phase 1: Add Namespace Field to Operator

Operator includes namespace in status ConfigMap:

```yaml
data:
  namespace: ${OPERATOR_NAMESPACE}
```

### Phase 2: Implement Resolver Service

Create `OperatorNamespaceResolver` with three-tier strategy.

### Phase 3: Update Consumers

- EventsProvider
- OperatorStatusClient
- DashboardDataProvider
- AIRecommendationsQuery

### Phase 4: Test

- Operator in default namespace
- Operator in custom namespace
- Per-cluster configuration
- Settings override

### Phase 5: Deploy

Roll out to users with backward compatibility.

## Examples

### Example 1: Default Installation

- Operator in `kube9-system`
- No settings configured
- ConfigMap found in `kube9-system`
- Result: `kube9-system` (from ConfigMap)

### Example 2: Custom Installation

- Operator in `my-kube9-ns`
- No settings configured
- ConfigMap not in `kube9-system`
- ConfigMap found in `my-kube9-ns` (via search or future enhancement)
- Result: `my-kube9-ns` (from ConfigMap)

### Example 3: Settings Override

- Operator in `kube9-system`
- Settings: `"kube9.operatorNamespace": "custom-ns"`
- ConfigMap found in `custom-ns`
- Result: `custom-ns` (from ConfigMap in settings namespace)

### Example 4: Per-Cluster Settings

- Two clusters: `prod` and `dev`
- Settings: `{ "prod": "kube9-prod", "dev": "kube9-dev" }`
- ConfigMaps found in respective namespaces
- Result: `kube9-prod` for prod, `kube9-dev` for dev

## Validation

Optional validation step to confirm operator exists:

```typescript
const namespace = await resolver.resolveNamespace(cluster);
const isValid = await resolver.validateNamespace(cluster, namespace);
if (!isValid) {
    // Warn user, but continue using namespace
    console.warn(`Operator not found in namespace '${namespace}'`);
}
```

