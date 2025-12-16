---
spec_id: argocd-status-spec
feature_id: [argocd-detection, argocd-tree-view, argocd-application-webview]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Status Data Structures Specification

## Overview

This specification defines all TypeScript interfaces and data structures used for ArgoCD integration in kube9-vscode. These types represent ArgoCD installation status, application data parsed from CRDs, sync/health status, and resource-level drift information.

## Installation Status Types

### ArgoCDInstallationStatus

Represents whether ArgoCD is installed in a cluster and how it was detected:

```typescript
interface ArgoCDInstallationStatus {
  installed: boolean;
  namespace?: string;
  version?: string;
  detectionMethod: 'operator' | 'crd';
  lastChecked?: string; // ISO timestamp
}
```

**Fields**:
- `installed` - Whether ArgoCD is detected in the cluster
- `namespace` - ArgoCD installation namespace (default: "argocd")
- `version` - ArgoCD version string (e.g., "v2.8.4")
- `detectionMethod` - How ArgoCD was detected
  - `'operator'` - From kube9-operator status ConfigMap
  - `'crd'` - Direct CRD detection in basic mode
- `lastChecked` - Timestamp of last detection check

**Example**:
```typescript
{
  installed: true,
  namespace: "argocd",
  version: "v2.8.4",
  detectionMethod: "operator",
  lastChecked: "2025-12-08T10:30:00Z"
}
```

### ArgoCDStatus (from Operator)

Status information provided by kube9-operator in operatorStatus ConfigMap:

```typescript
interface ArgoCDStatus {
  detected: boolean;
  namespace: string;
  version: string;
  lastChecked: string; // ISO timestamp
}
```

**Fields**:
- `detected` - Whether ArgoCD installation was found
- `namespace` - Namespace where ArgoCD is installed
- `version` - ArgoCD version string
- `lastChecked` - When operator last checked for ArgoCD

**Source**: `operatorStatus.argocd` field in kube9-operator-status ConfigMap

**Example**:
```typescript
{
  detected: true,
  namespace: "argocd",
  version: "v2.8.4",
  lastChecked: "2025-12-08T10:00:00Z"
}
```

## Application Types

### ArgoCDApplication

Complete application data parsed from Application CRD:

```typescript
interface ArgoCDApplication {
  // Metadata
  name: string;
  namespace: string;
  project: string;
  createdAt: string; // ISO timestamp
  
  // Sync information
  syncStatus: SyncStatus;
  
  // Health information
  healthStatus: HealthStatus;
  
  // Source/destination
  source: ApplicationSource;
  destination: ApplicationDestination;
  
  // Resources
  resources: ArgoCDResource[];
  
  // Last operation
  lastOperation?: OperationState;
  
  // Timestamps
  syncedAt?: string; // ISO timestamp of last successful sync
}
```

**Mapping from CRD**:
- `name` ← `metadata.name`
- `namespace` ← `metadata.namespace`
- `project` ← `spec.project`
- `createdAt` ← `metadata.creationTimestamp`
- `syncStatus` ← `status.sync`
- `healthStatus` ← `status.health`
- `source` ← `spec.source`
- `destination` ← `spec.destination`
- `resources` ← `status.resources`
- `lastOperation` ← `status.operationState`

### SyncStatus

Application sync status information:

```typescript
interface SyncStatus {
  status: SyncStatusCode;
  revision: string; // Git commit SHA
  comparedTo: {
    source: ApplicationSource;
  };
}

type SyncStatusCode = 
  | 'Synced'
  | 'OutOfSync'
  | 'Unknown';
```

**Fields**:
- `status` - Current sync state
  - `'Synced'` - Git state matches cluster state
  - `'OutOfSync'` - Drift detected between Git and cluster
  - `'Unknown'` - Sync status cannot be determined
- `revision` - Current Git commit SHA deployed
- `comparedTo` - Git source being compared against

**Example**:
```typescript
{
  status: "Synced",
  revision: "abc123def456789abcdef123456789abcdef0123",
  comparedTo: {
    source: {
      repoURL: "https://github.com/argoproj/argocd-example-apps",
      path: "guestbook",
      targetRevision: "main"
    }
  }
}
```

### HealthStatus

Application health status information:

```typescript
interface HealthStatus {
  status: HealthStatusCode;
  message?: string;
}

type HealthStatusCode =
  | 'Healthy'
  | 'Degraded'
  | 'Progressing'
  | 'Suspended'
  | 'Missing'
  | 'Unknown';
```

**Fields**:
- `status` - Current health state
  - `'Healthy'` - All resources are healthy
  - `'Degraded'` - One or more resources are unhealthy
  - `'Progressing'` - Application is being updated/deployed
  - `'Suspended'` - Application is intentionally paused
  - `'Missing'` - Required resources are missing
  - `'Unknown'` - Health cannot be determined
- `message` - Optional human-readable health message

**Example**:
```typescript
{
  status: "Degraded",
  message: "Deployment has insufficient replicas available"
}
```

### ApplicationSource

Git source configuration for application:

```typescript
interface ApplicationSource {
  repoURL: string;
  path: string;
  targetRevision: string;
  chart?: string; // For Helm charts
  helm?: HelmParameters;
}

interface HelmParameters {
  values?: string;
  parameters?: Array<{ name: string; value: string }>;
}
```

**Fields**:
- `repoURL` - Git repository URL
- `path` - Path within repository to application manifests
- `targetRevision` - Branch, tag, or commit SHA to track
- `chart` - Helm chart name (if using Helm)
- `helm` - Helm-specific parameters (if using Helm)

**Example**:
```typescript
{
  repoURL: "https://github.com/argoproj/argocd-example-apps",
  path: "guestbook",
  targetRevision: "main"
}
```

### ApplicationDestination

Kubernetes cluster and namespace where application is deployed:

```typescript
interface ApplicationDestination {
  server: string;
  namespace: string;
  name?: string;
}
```

**Fields**:
- `server` - Kubernetes API server URL
- `namespace` - Target namespace for deployment
- `name` - Optional cluster name

**Example**:
```typescript
{
  server: "https://kubernetes.default.svc",
  namespace: "default"
}
```

## Resource-Level Types

### ArgoCDResource

Resource-level status for drift detection:

```typescript
interface ArgoCDResource {
  kind: string;
  name: string;
  namespace: string;
  syncStatus: string; // "Synced" | "OutOfSync"
  healthStatus?: HealthStatusCode;
  message?: string;
  requiresPruning?: boolean;
}
```

**Fields**:
- `kind` - Kubernetes resource kind (e.g., "Deployment", "Service")
- `name` - Resource name
- `namespace` - Resource namespace
- `syncStatus` - Whether this specific resource is synced
- `healthStatus` - Health of this specific resource
- `message` - Optional message about sync status
- `requiresPruning` - Whether resource should be deleted

**Example**:
```typescript
{
  kind: "Deployment",
  name: "guestbook-ui",
  namespace: "default",
  syncStatus: "Synced",
  healthStatus: "Healthy"
}
```

**Out-of-Sync Resource Example**:
```typescript
{
  kind: "Deployment",
  name: "api-server",
  namespace: "production",
  syncStatus: "OutOfSync",
  healthStatus: "Degraded",
  message: "Replicas mismatch: live 2, target 3"
}
```

## Operation Types

### OperationState

State of last sync/refresh operation:

```typescript
interface OperationState {
  phase: OperationPhase;
  message?: string;
  startedAt: string; // ISO timestamp
  finishedAt?: string; // ISO timestamp
  syncResult?: SyncOperationResult;
}

type OperationPhase =
  | 'Running'
  | 'Terminating'
  | 'Succeeded'
  | 'Failed'
  | 'Error';
```

**Fields**:
- `phase` - Current operation phase
  - `'Running'` - Operation in progress
  - `'Terminating'` - Finalizing operation
  - `'Succeeded'` - Completed successfully
  - `'Failed'` - Completed with failure
  - `'Error'` - Encountered error
- `message` - Optional status or error message
- `startedAt` - When operation began
- `finishedAt` - When operation completed (if finished)
- `syncResult` - Detailed sync results

**Example - Successful**:
```typescript
{
  phase: "Succeeded",
  message: "Sync operation completed",
  startedAt: "2025-12-08T10:30:00Z",
  finishedAt: "2025-12-08T10:31:23Z"
}
```

**Example - Failed**:
```typescript
{
  phase: "Failed",
  message: "Failed to apply manifest: admission webhook denied request",
  startedAt: "2025-12-08T10:30:00Z",
  finishedAt: "2025-12-08T10:30:15Z"
}
```

### SyncOperationResult

Detailed results of sync operation:

```typescript
interface SyncOperationResult {
  resources: ResourceResult[];
  revision: string;
}

interface ResourceResult {
  kind: string;
  name: string;
  namespace: string;
  status: string; // "Synced" | "SyncFailed"
  message?: string;
  hookPhase?: string;
}
```

**Fields**:
- `resources` - Results for each resource in the sync
- `revision` - Git revision that was synced

**Example**:
```typescript
{
  resources: [
    {
      kind: "Deployment",
      name: "guestbook-ui",
      namespace: "default",
      status: "Synced"
    },
    {
      kind: "Service",
      name: "guestbook-ui",
      namespace: "default",
      status: "Synced"
    }
  ],
  revision: "abc123def456"
}
```

## Tree View Display Types

### ArgoCDTreeItem

Tree view item data for displaying applications:

```typescript
interface ArgoCDTreeItem {
  application: ArgoCDApplication;
  label: string; // Display name
  description: string; // Status summary
  icon: string; // Icon identifier based on status
  tooltip: string; // Hover tooltip
  contextValue: string; // For context menu
}
```

**Example**:
```typescript
{
  application: { /* ArgoCDApplication */ },
  label: "guestbook",
  description: "Synced, Healthy",
  icon: "check-circle-green",
  tooltip: "Name: guestbook\nSync: Synced\nHealth: Healthy\nRevision: abc123d",
  contextValue: "argocd-application"
}
```

## Webview Display Types

### ApplicationDetailsData

Data structure for webview display:

```typescript
interface ApplicationDetailsData {
  application: ArgoCDApplication;
  
  // Computed display fields
  syncStatusIcon: string;
  healthStatusIcon: string;
  shortRevision: string; // First 7 chars of revision
  lastSyncRelative: string; // "2 hours ago"
  outOfSyncResources: ArgoCDResource[];
  syncedResources: ArgoCDResource[];
}
```

**Fields**:
- `application` - Full application data
- `syncStatusIcon` - Icon name/path for sync status
- `healthStatusIcon` - Icon name/path for health status
- `shortRevision` - Truncated Git SHA for display
- `lastSyncRelative` - Human-readable time since last sync
- `outOfSyncResources` - Filtered list of out-of-sync resources
- `syncedResources` - Filtered list of synced resources

## Validation Rules

### Application Name Validation

```typescript
function isValidApplicationName(name: string): boolean {
  // RFC 1123 subdomain name
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name);
}
```

### Namespace Validation

```typescript
function isValidNamespace(namespace: string): boolean {
  // RFC 1123 label name
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace);
}
```

### Revision Validation

```typescript
function isValidRevision(revision: string): boolean {
  // Git SHA (40 chars hex) or branch/tag name
  return /^[a-f0-9]{40}$/.test(revision) || /^[\w\-\/\.]+$/.test(revision);
}
```

## Status Icon Mapping

Mapping from status combinations to display icons:

| Sync Status | Health Status | Icon | Color Theme |
|------------|---------------|------|-------------|
| Synced | Healthy | `check-circle` | Green |
| Synced | Progressing | `sync` | Blue |
| Synced | Suspended | `debug-pause` | Gray |
| OutOfSync | Healthy | `warning` | Yellow |
| OutOfSync | Degraded | `warning` | Orange |
| OutOfSync | Progressing | `sync` | Yellow |
| * | Missing | `error` | Red |
| * | Degraded | `error` | Red |
| Unknown | Unknown | `question` | Gray |

**Icon Names**: Use VS Code ThemeIcon identifiers for consistency

## Type Guards

### isArgoCDInstalled

```typescript
function isArgoCDInstalled(
  status: ArgoCDInstallationStatus | null
): status is ArgoCDInstallationStatus {
  return status !== null && status.installed === true;
}
```

### isSynced

```typescript
function isSynced(app: ArgoCDApplication): boolean {
  return app.syncStatus.status === 'Synced';
}
```

### isHealthy

```typescript
function isHealthy(app: ArgoCDApplication): boolean {
  return app.healthStatus.status === 'Healthy';
}
```

### hasOutOfSyncResources

```typescript
function hasOutOfSyncResources(app: ArgoCDApplication): boolean {
  return app.resources.some(r => r.syncStatus !== 'Synced');
}
```

## Error Types

### ArgoCDError

Base error type for ArgoCD operations:

```typescript
class ArgoCDError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ArgoCDError';
  }
}
```

### ArgoCDPermissionError

```typescript
class ArgoCDPermissionError extends ArgoCDError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED');
    this.name = 'ArgoCDPermissionError';
  }
}
```

### ArgoCDNotFoundError

```typescript
class ArgoCDNotFoundError extends ArgoCDError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'ArgoCDNotFoundError';
  }
}
```

## Constants

### Default Values

```typescript
const DEFAULT_ARGOCD_NAMESPACE = 'argocd';
const MIN_SUPPORTED_VERSION = 'v2.5.0';
const DETECTION_CACHE_TTL = 300; // 5 minutes in seconds
const APPLICATION_CACHE_TTL = 30; // 30 seconds
const OPERATION_POLL_INTERVAL = 2000; // 2 seconds in ms
const OPERATION_TIMEOUT = 300; // 5 minutes in seconds
```

### CRD Names

```typescript
const ARGOCD_APPLICATION_CRD = 'applications.argoproj.io';
const ARGOCD_APPPROJECT_CRD = 'appprojects.argoproj.io';
```

## Integration Points

- **ArgoCDService**: Uses all types for data transformation
- **Tree View**: Uses `ArgoCDTreeItem` for display
- **Webview**: Uses `ApplicationDetailsData` for rendering
- **Commands**: Uses operation types for action handling
- **Cache**: Stores `ArgoCDInstallationStatus` and `ArgoCDApplication[]`

## Type Export

All types should be exported from a central location:

**File**: `src/types/argocd.ts`

```typescript
export {
  // Installation
  ArgoCDInstallationStatus,
  ArgoCDStatus,
  
  // Application
  ArgoCDApplication,
  SyncStatus,
  SyncStatusCode,
  HealthStatus,
  HealthStatusCode,
  ApplicationSource,
  ApplicationDestination,
  
  // Resources
  ArgoCDResource,
  
  // Operations
  OperationState,
  OperationPhase,
  SyncOperationResult,
  ResourceResult,
  
  // Display
  ArgoCDTreeItem,
  ApplicationDetailsData,
  
  // Errors
  ArgoCDError,
  ArgoCDPermissionError,
  ArgoCDNotFoundError
};
```

