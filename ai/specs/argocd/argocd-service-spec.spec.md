---
spec_id: argocd-service-spec
feature_id: [argocd-detection, argocd-tree-view, argocd-actions]
diagram_id: [argocd-architecture, argocd-data-flow]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Service Specification

## Overview

The `ArgoCDService` is responsible for all ArgoCD-related operations in the kube9-vscode extension. It handles detection of ArgoCD installations, querying Application CRDs, parsing application status, executing actions (sync, refresh, hard refresh), and caching for performance. The service operates in two modes: consuming operator status (when kube9-operator is installed) or direct CRD detection (basic mode).

## Service Architecture

### Class: ArgoCDService

**Location**: `src/services/ArgoCDService.ts`

**Dependencies**:
- `KubectlCommands` - Execute kubectl commands
- `OperatorStatusClient` - Read operator status (when available)
- `CacheService` - Cache detection and application data

**Responsibilities**:
1. Detect ArgoCD installation in clusters
2. Query ArgoCD Application CRDs
3. Parse and transform CRD data into typed interfaces
4. Execute application actions (sync, refresh, hard refresh)
5. Cache results for performance
6. Handle errors gracefully

## Detection Methods

### Operated Mode Detection

When kube9-operator is installed, consume ArgoCD status from operator:

```typescript
async isInstalled(context: string): Promise<ArgoCDInstallationStatus> {
  // Check if operator is installed
  const operatorStatus = await operatorStatusClient.getStatus(context);
  
  if (operatorStatus && operatorStatus.argocd) {
    // Use operator's detection result
    return {
      installed: operatorStatus.argocd.detected,
      namespace: operatorStatus.argocd.namespace,
      version: operatorStatus.argocd.version,
      detectionMethod: 'operator'
    };
  }
  
  // Fall back to direct detection
  return this.directDetection(context);
}
```

**Operator Status Fields**:
- `operatorStatus.argocd.detected: boolean` - Whether ArgoCD is installed
- `operatorStatus.argocd.namespace: string` - ArgoCD namespace (e.g., "argocd")
- `operatorStatus.argocd.version: string` - ArgoCD version (e.g., "v2.8.4")
- `operatorStatus.argocd.lastChecked: string` - ISO timestamp of last check

### Basic Mode Detection

When operator is not available, fall back to direct CRD detection:

```typescript
async directDetection(context: string): Promise<ArgoCDInstallationStatus> {
  // Check for applications.argoproj.io CRD
  const crdExists = await this.checkCRDExists(context);
  
  if (!crdExists) {
    return {
      installed: false,
      detectionMethod: 'crd'
    };
  }
  
  // Find ArgoCD server deployment for version info
  const serverInfo = await this.findArgoCDServer(context);
  
  return {
    installed: true,
    namespace: serverInfo?.namespace || 'argocd',
    version: serverInfo?.version || 'unknown',
    detectionMethod: 'crd'
  };
}
```

**Detection Steps**:
1. Execute: `kubectl get crd applications.argoproj.io`
2. If CRD exists, ArgoCD is installed
3. Execute: `kubectl get deployments -A -l app.kubernetes.io/name=argocd-server -o json`
4. Extract namespace and version from deployment image

## Application Querying

### List All Applications

```typescript
async getApplications(context: string): Promise<ArgoCDApplication[]> {
  // Get ArgoCD namespace
  const installStatus = await this.isInstalled(context);
  if (!installStatus.installed) {
    return [];
  }
  
  // Query Application CRDs
  const result = await kubectl.exec(
    installStatus.namespace,
    'get',
    ['applications.argoproj.io', '-o', 'json'],
    context
  );
  
  // Parse and transform CRD data
  const applications = JSON.parse(result.stdout);
  return applications.items.map(item => this.parseApplication(item));
}
```

**kubectl Command**: `kubectl get applications.argoproj.io -n <namespace> -o json`

**Returns**: Array of `ArgoCDApplication` objects (see argocd-status-spec)

### Get Single Application

```typescript
async getApplication(
  name: string,
  namespace: string,
  context: string
): Promise<ArgoCDApplication> {
  const result = await kubectl.exec(
    namespace,
    'get',
    [`application.argoproj.io/${name}`, '-o', 'json'],
    context
  );
  
  const appData = JSON.parse(result.stdout);
  return this.parseApplication(appData);
}
```

**kubectl Command**: `kubectl get application.argoproj.io/<name> -n <namespace> -o json`

**Returns**: Single `ArgoCDApplication` object

## CRD Data Parsing

### Parse Application CRD

The service transforms raw Application CRD data into typed interfaces:

```typescript
private parseApplication(crdData: any): ArgoCDApplication {
  return {
    name: crdData.metadata.name,
    namespace: crdData.metadata.namespace,
    project: crdData.spec.project,
    
    // Sync status
    syncStatus: {
      status: crdData.status.sync.status, // "Synced" | "OutOfSync"
      revision: crdData.status.sync.revision,
      comparedTo: {
        source: {
          repoURL: crdData.spec.source.repoURL,
          path: crdData.spec.source.path,
          targetRevision: crdData.spec.source.targetRevision
        }
      }
    },
    
    // Health status
    healthStatus: {
      status: crdData.status.health.status, // "Healthy" | "Degraded" | "Progressing" | etc
      message: crdData.status.health.message
    },
    
    // Resource-level status (for drift details)
    resources: this.parseResources(crdData.status.resources || []),
    
    // Last operation
    lastOperation: this.parseOperation(crdData.status.operationState),
    
    // Timestamps
    createdAt: crdData.metadata.creationTimestamp,
    syncedAt: crdData.status.operationState?.finishedAt
  };
}
```

### Parse Resource Status

```typescript
private parseResources(resources: any[]): ArgoCDResource[] {
  return resources.map(resource => ({
    kind: resource.kind,
    name: resource.name,
    namespace: resource.namespace,
    syncStatus: resource.status, // "Synced" | "OutOfSync"
    healthStatus: resource.health?.status,
    message: resource.syncWave, // Optional sync message
    requiresPruning: resource.requiresPruning
  }));
}
```

## Application Actions

### Sync Application

Triggers ArgoCD to apply Git state to cluster:

```typescript
async syncApplication(
  name: string,
  namespace: string,
  context: string
): Promise<void> {
  // Patch Application CRD with refresh annotation
  const patch = {
    metadata: {
      annotations: {
        'argocd.argoproj.io/refresh': 'normal'
      }
    }
  };
  
  await kubectl.exec(
    namespace,
    'patch',
    [
      `application.argoproj.io/${name}`,
      '--type=merge',
      `-p=${JSON.stringify(patch)}`
    ],
    context
  );
  
  // Track operation until completion
  return this.trackOperation(name, namespace, context);
}
```

**kubectl Command**: `kubectl patch application.argoproj.io/<name> -n <namespace> --type=merge -p='{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'`

**Effect**: ArgoCD controller detects annotation and initiates sync operation

### Refresh Application

Updates application status by comparing Git vs cluster state:

```typescript
async refreshApplication(
  name: string,
  namespace: string,
  context: string
): Promise<void> {
  // Same as sync - ArgoCD determines operation type
  return this.syncApplication(name, namespace, context);
}
```

**Note**: Refresh uses same annotation as sync. ArgoCD controller determines whether sync is needed based on current state.

### Hard Refresh Application

Clears cache before comparing state:

```typescript
async hardRefreshApplication(
  name: string,
  namespace: string,
  context: string
): Promise<void> {
  // Patch with "hard" refresh value
  const patch = {
    metadata: {
      annotations: {
        'argocd.argoproj.io/refresh': 'hard'
      }
    }
  };
  
  await kubectl.exec(
    namespace,
    'patch',
    [
      `application.argoproj.io/${name}`,
      '--type=merge',
      `-p=${JSON.stringify(patch)}`
    ],
    context
  );
  
  return this.trackOperation(name, namespace, context);
}
```

**kubectl Command**: `kubectl patch application.argoproj.io/<name> -n <namespace> --type=merge -p='{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'`

**Effect**: ArgoCD clears cache, then compares Git vs cluster

## Operation Tracking

After triggering an action, track operation progress:

```typescript
async trackOperation(
  name: string,
  namespace: string,
  context: string,
  timeoutSeconds: number = 300
): Promise<OperationResult> {
  const startTime = Date.now();
  
  while (true) {
    // Check timeout
    if ((Date.now() - startTime) / 1000 > timeoutSeconds) {
      throw new Error('Operation timed out');
    }
    
    // Get application status
    const app = await this.getApplication(name, namespace, context);
    
    // Check operation state
    if (app.lastOperation) {
      const phase = app.lastOperation.phase;
      
      if (phase === 'Succeeded') {
        return { success: true, message: 'Operation completed' };
      }
      
      if (phase === 'Failed' || phase === 'Error') {
        return {
          success: false,
          message: app.lastOperation.message || 'Operation failed'
        };
      }
    }
    
    // Wait before polling again
    await this.sleep(2000); // 2 seconds
  }
}
```

**Polling Interval**: 2 seconds

**Timeout**: 5 minutes (300 seconds)

**Operation Phases**:
- `Running` - Operation in progress
- `Terminating` - Finalizing operation
- `Succeeded` - Operation completed successfully
- `Failed` - Operation failed with error
- `Error` - Operation encountered error

## Caching Strategy

### Detection Cache

Cache ArgoCD installation status per cluster:

**Cache Key**: `argocd:detection:${context}`

**Cache Duration**: 5 minutes

**Invalidation**: Manual tree refresh bypasses cache

```typescript
async isInstalled(context: string, bypassCache: boolean = false): Promise<ArgoCDInstallationStatus> {
  const cacheKey = `argocd:detection:${context}`;
  
  if (!bypassCache) {
    const cached = await cacheService.get<ArgoCDInstallationStatus>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const status = await this.detectArgoCD(context);
  await cacheService.set(cacheKey, status, 300); // 5 minutes
  return status;
}
```

### Application List Cache

Cache application list per cluster:

**Cache Key**: `argocd:applications:${context}`

**Cache Duration**: 30 seconds

**Invalidation**: After sync operations, manual refresh

```typescript
async getApplications(context: string, bypassCache: boolean = false): Promise<ArgoCDApplication[]> {
  const cacheKey = `argocd:applications:${context}`;
  
  if (!bypassCache) {
    const cached = await cacheService.get<ArgoCDApplication[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const apps = await this.queryApplications(context);
  await cacheService.set(cacheKey, apps, 30); // 30 seconds
  return apps;
}
```

## Error Handling

### RBAC Permission Errors

```typescript
try {
  const result = await kubectl.exec(...);
} catch (error) {
  if (error.message.includes('Forbidden')) {
    throw new ArgoCDPermissionError(
      'Permission denied: Cannot access ArgoCD Applications'
    );
  }
  throw error;
}
```

### Application Not Found

```typescript
try {
  const app = await this.getApplication(name, namespace, context);
} catch (error) {
  if (error.message.includes('NotFound')) {
    throw new ArgoCDNotFoundError(
      `Application ${name} not found in namespace ${namespace}`
    );
  }
  throw error;
}
```

### Network/Cluster Errors

```typescript
try {
  const apps = await this.getApplications(context);
} catch (error) {
  // Log error but don't crash
  logger.error('Failed to query ArgoCD applications', error);
  
  // Return cached data if available
  const cached = await cacheService.get(`argocd:applications:${context}`);
  if (cached) {
    return cached;
  }
  
  // Return empty array as fallback
  return [];
}
```

## Service Interface

```typescript
interface IArgoCDService {
  // Detection
  isInstalled(context: string, bypassCache?: boolean): Promise<ArgoCDInstallationStatus>;
  
  // Querying
  getApplications(context: string, bypassCache?: boolean): Promise<ArgoCDApplication[]>;
  getApplication(name: string, namespace: string, context: string): Promise<ArgoCDApplication>;
  
  // Actions
  syncApplication(name: string, namespace: string, context: string): Promise<void>;
  refreshApplication(name: string, namespace: string, context: string): Promise<void>;
  hardRefreshApplication(name: string, namespace: string, context: string): Promise<void>;
  
  // Operation tracking
  trackOperation(name: string, namespace: string, context: string, timeout?: number): Promise<OperationResult>;
}
```

## Integration Points

- **OperatorStatusClient**: Read ArgoCD status from operator ConfigMap
- **KubectlCommands**: Execute all kubectl operations
- **CacheService**: Store detection and application data
- **Logger**: Log errors and debug information
- **ClusterTreeProvider**: Consumes service for tree view display
- **ArgoCDWebview**: Consumes service for webview details

## Performance Considerations

1. **Caching**: 5-minute detection cache, 30-second application cache
2. **Lazy Loading**: Only query applications when category expanded
3. **Efficient Polling**: 2-second intervals for operation tracking
4. **Batch Operations**: Query all applications in single kubectl call
5. **Error Resilience**: Fall back to cached data on failures

## Configuration

No user configuration required. Service behavior adapts automatically based on:
- Operator presence (operated vs basic mode)
- ArgoCD namespace (from operator or auto-detected)
- RBAC permissions (graceful degradation)

## Testing Considerations

- Mock kubectl commands for unit tests
- Test both operated and basic detection modes
- Test CRD parsing with various application states
- Test operation tracking with different phases
- Test error handling for all failure scenarios
- Test caching behavior and invalidation

