---
actor_id: kubernetes-cluster
type: external
---

# Kubernetes Cluster Actor

## Overview

The Kubernetes Cluster is an external system actor that hosts containerized applications and provides the Kubernetes API for resource management. The kube9 VS Code Extension interacts with the cluster exclusively through the kubectl CLI.

## Type

External System Actor - Third-party system

## Characteristics

### Technical Profile
- **Type**: Distributed container orchestration platform
- **API**: Kubernetes API Server (RESTful)
- **Access Method**: kubectl CLI (from extension's perspective)
- **Authentication**: Certificate-based, token-based, or cloud provider credentials (via kubeconfig)
- **Deployment**: Can be any Kubernetes distribution (EKS, GKE, AKS, on-prem, minikube, k3s, etc.)

### Capabilities
- Host and orchestrate containerized applications
- Provide CRUD operations for Kubernetes resources
- Enforce RBAC permissions
- Maintain resource state and metadata
- Generate events for resource changes
- Store configuration in ConfigMaps and Secrets
- Execute commands in running containers (kubectl exec)

## Responsibilities

### Resource Management
- Store and maintain all Kubernetes resources
- Enforce resource schemas and validation
- Apply desired state changes
- Track resource versions for optimistic concurrency
- Generate metadata (resourceVersion, UID, timestamps)

### Access Control
- Authenticate users via kubeconfig credentials
- Enforce RBAC policies for all operations
- Return permission errors for unauthorized actions
- Audit API access (depending on cluster configuration)

### State Storage
- Persist resource definitions in etcd
- Maintain current state vs desired state
- Generate status fields for resources
- Store operator data in ConfigMaps (kube9-operator)

### Event Generation
- Emit events for resource state changes
- Provide event history for troubleshooting
- Log warnings and errors for invalid operations

## Interactions

### With VSCode Extension (via kubectl)
- **Method**: Kubernetes API called by kubectl subprocess
- **Operations**: 
  - GET: Fetch resource details
  - POST/PUT: Create or update resources
  - DELETE: Remove resources
  - WATCH: Stream resource changes (not currently used)
  - EXEC: Execute commands in containers
- **Authentication**: Credentials from kubeconfig
- **Authorization**: RBAC policies applied to all operations

### With kube9-operator (when installed)
- **Hosts Operator**: Runs kube9-operator as a Deployment in kube9-system namespace
- **Provides Storage**: ConfigMaps for operator status and dashboard data
- **Enables Queries**: kubectl exec to operator's CLI for rich data

### Data Provided to Extension

#### Native Resources (Direct kubectl)
- Pods, Deployments, StatefulSets, DaemonSets, CronJobs
- Services, Ingresses, NetworkPolicies
- ConfigMaps, Secrets
- PersistentVolumes, PersistentVolumeClaims, StorageClasses
- Nodes, Namespaces
- Custom Resources

#### Operator-Managed Data (via ConfigMaps)
- `kube9-operator-status` ConfigMap in `kube9-system` namespace
  - Operator mode: basic, operated, enabled, degraded
  - API key status: configured or not
  - Health, version, registration status
  - Last update timestamp

- `kube9-dashboard-data` ConfigMap in `kube9-system` namespace (Pro tier)
  - Aggregated cluster metrics
  - Resource counts and usage
  - Operator-collected statistics

- `kube9-ai-recommendations` ConfigMap in `kube9-system` namespace (Pro tier)
  - AI-generated insights
  - Security recommendations
  - Optimization suggestions

## Behavioral Patterns

### Resource Lifecycle
```
1. Extension sends kubectl apply
2. API Server validates resource schema
3. Checks RBAC permissions
4. Stores in etcd
5. Controllers reconcile desired state
6. Updates resource status
7. Extension queries updated resource
```

### Permission Handling
```
1. Extension requests operation via kubectl
2. API Server checks user credentials
3. Evaluates RBAC rules
4. Returns 200 OK or 403 Forbidden
5. Extension handles response appropriately
```

### ConfigMap Queries (Operator Status)
```
1. Extension: kubectl get cm kube9-operator-status -n kube9-system -o json
2. If ConfigMap exists → Operator is installed, return data
3. If ConfigMap not found → Operator not installed, extension uses free tier
```

## Data Model

### Resource Structure
```yaml
apiVersion: v1
kind: <ResourceKind>
metadata:
  name: <resource-name>
  namespace: <namespace>
  resourceVersion: <version>
  uid: <unique-id>
  labels: {}
  annotations: {}
spec:
  # Desired state defined by user
status:
  # Current state maintained by controllers
```

### Operator Status ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-operator-status
  namespace: kube9-system
data:
  status: |
    {
      "mode": "operated|enabled|degraded",
      "tier": "free|pro",
      "version": "1.0.0",
      "health": "healthy|degraded|unhealthy",
      "lastUpdate": "2024-01-15T10:30:00Z",
      "registered": true|false,
      "apiKeyConfigured": true|false
    }
```

## Performance Characteristics

### Response Times
- GET requests: Typically < 100ms for single resources
- LIST requests: Depends on resource count (100ms - 1s)
- APPLY requests: 100-500ms depending on validation
- EXEC requests: Variable (depends on container response)

### Rate Limiting
- API Server may rate limit excessive requests
- Extension uses caching to minimize API calls
- Operator status cached for 5 minutes
- Namespace context cached for 5 seconds

## Error Conditions

### Common Errors Returned
- **404 Not Found**: Resource doesn't exist
- **403 Forbidden**: RBAC permission denied
- **401 Unauthorized**: Invalid credentials
- **409 Conflict**: Resource version mismatch (concurrent modification)
- **400 Bad Request**: Invalid resource schema
- **500 Internal Server Error**: Cluster internal error
- **503 Service Unavailable**: API Server temporarily unavailable

### Connection Issues
- **Connection Refused**: Cluster unreachable (network issue)
- **Timeout**: API Server not responding
- **Certificate Errors**: Invalid or expired cluster certificates

## Security Considerations

### Authentication
- Requires valid credentials in kubeconfig
- Supports multiple auth methods (certificates, tokens, exec plugins)
- Extension never modifies or exposes credentials

### Authorization
- All operations subject to RBAC
- Extension respects permission denials
- No privilege escalation possible from extension

### Data Sensitivity
- May contain sensitive data in Secrets
- Extension warns before viewing Secret data
- Logs and errors sanitized to avoid exposing secrets

## Cluster States

### Free Tier (No Operator)
- Standard Kubernetes resources available
- No operator-specific ConfigMaps
- Extension operates in free tier mode
- All operations via direct kubectl to native resources

### Pro Tier (Operator Installed)
- Standard Kubernetes resources available
- Operator ConfigMaps present in kube9-system namespace
- Enhanced dashboard data available
- AI insights available (if API key configured)
- Extension operates in pro tier mode

## Related Actors

- **VSCode Extension**: Primary consumer of cluster data
- **kube9-operator**: (Optional) Runs within cluster to provide enhanced features
- **Developer**: Indirectly interacts with cluster through extension
- **kube9-server**: (Indirect) Operator syncs data with server, but extension doesn't communicate with server directly

