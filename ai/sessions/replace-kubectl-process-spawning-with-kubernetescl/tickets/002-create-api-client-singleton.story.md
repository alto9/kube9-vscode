---
story_id: 002-create-api-client-singleton
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Create Kubernetes API Client Singleton
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
diagram_id:
  - api-client-architecture
status: pending
estimated_minutes: 25
---

# Create Kubernetes API Client Singleton

## Objective

Create a singleton API client class that manages Kubernetes API connections with support for multiple contexts and API versions.

## Context

This is the core infrastructure that replaces kubectl process spawning. The singleton pattern ensures connection reuse and efficient resource management. The API client will load kubeconfig and provide access to different Kubernetes API groups (core, apps, batch, networking).

## Acceptance Criteria

- [ ] New file `src/kubernetes/apiClient.ts` created
- [ ] `KubernetesApiClient` class implements kubeconfig loading
- [ ] Supports multiple API groups (CoreV1, AppsV1, BatchV1, NetworkingV1)
- [ ] Singleton pattern implemented with getter function
- [ ] Context switching supported via `setContext()` method
- [ ] Current context retrieval via `getCurrentContext()` method
- [ ] All contexts listing via `getContexts()` method
- [ ] TypeScript types properly defined

## Implementation Steps

1. Create new file `src/kubernetes/apiClient.ts`
2. Import @kubernetes/client-node library
3. Define `KubernetesApiClient` class with:
   - Private kubeConfig property
   - Private API client properties (coreApi, appsApi, batchApi, networkingApi)
   - Constructor that loads kubeconfig from default location
   - setContext(contextName: string) method
   - getCurrentContext() method
   - getContexts() method
   - Getter methods for each API client
4. Implement singleton pattern:
   - Private module-level apiClientInstance variable
   - Export getKubernetesApiClient() function
   - Export resetKubernetesApiClient() function for testing
5. Add comprehensive JSDoc documentation

## Files to Create

- `src/kubernetes/apiClient.ts` - Main API client singleton

## Implementation Reference

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
  
  public setContext(contextName: string): void {
    this.kubeConfig.setCurrentContext(contextName);
    // Recreate API clients with new context
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.batchApi = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
  }
  
  public getCurrentContext(): string {
    return this.kubeConfig.getCurrentContext();
  }
  
  public getContexts(): k8s.Context[] {
    return this.kubeConfig.getContexts();
  }
  
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

## Testing

- Verify kubeconfig loads from default location (~/.kube/config)
- Test context switching between multiple contexts
- Confirm API clients update when context changes
- Verify singleton returns same instance on multiple calls
- Test reset function creates new instance on next call

## Notes

- The library automatically handles connection pooling via Node.js HTTP Agent
- Authentication methods (certificates, tokens, exec providers) are handled transparently
- Keep-alive connections are enabled by default
- Error handling for missing/invalid kubeconfig will be added in later stories

