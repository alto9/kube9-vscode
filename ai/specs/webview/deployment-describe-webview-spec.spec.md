---
spec_id: deployment-describe-webview-spec
name: Deployment Describe Webview Specification
description: Technical specification for implementing comprehensive deployment describe webview with detailed deployment information, replica status, strategy, pod template, and rollout history
feature_id:
  - deployment-describe-webview
diagram_id:
  - deployment-describe-flow
---

# Deployment Describe Webview Specification

## Overview

The Deployment Describe Webview provides a comprehensive view of Kubernetes deployment information including status, replica counts, deployment strategy, pod template specification, rollout history, conditions, events, labels, selectors, and annotations. This webview uses the shared describe webview panel that updates its content based on the selected deployment.

## Architecture

See [deployment-describe-flow](../../diagrams/webview/deployment-describe-flow.diagram.md) for the complete data flow architecture.

## Data Structures

### DeploymentDescribeData

Complete deployment information structure for webview display:

```typescript
interface DeploymentDescribeData {
  name: string;
  namespace: string;
  overview: DeploymentOverview;
  replicaStatus: ReplicaStatus;
  strategy: DeploymentStrategy;
  podTemplate: PodTemplateInfo;
  conditions: DeploymentCondition[];
  replicaSets: ReplicaSetInfo[];
  labels: Record<string, string>;
  selectors: Record<string, string>;
  annotations: Record<string, string>;
  events: DeploymentEvent[];
}
```

### DeploymentOverview

Basic deployment metadata and status:

```typescript
interface DeploymentOverview {
  name: string;
  namespace: string;
  status: 'Available' | 'Progressing' | 'Failed' | 'Unknown';
  statusMessage: string;              // Human-readable status explanation
  creationTimestamp: string;          // ISO 8601 timestamp
  age: string;                        // e.g., "5d", "2h", "30m"
  generation: number;                 // metadata.generation
  observedGeneration: number;         // status.observedGeneration
  paused: boolean;                    // spec.paused
}
```

### ReplicaStatus

Deployment replica counts and status:

```typescript
interface ReplicaStatus {
  desired: number;                    // spec.replicas (target)
  current: number;                    // status.replicas (total pods)
  ready: number;                      // status.readyReplicas
  available: number;                  // status.availableReplicas
  unavailable: number;                // desired - available
  upToDate: number;                   // status.updatedReplicas
  readyPercentage: number;            // (ready / desired) * 100
  availablePercentage: number;        // (available / desired) * 100
  isHealthy: boolean;                 // ready === desired && available === desired
}
```

### DeploymentStrategy

Deployment rollout strategy configuration:

```typescript
interface DeploymentStrategy {
  type: 'RollingUpdate' | 'Recreate';
  maxSurge: string;                   // e.g., "1", "25%"
  maxSurgeValue: number;              // Calculated numeric value
  maxUnavailable: string;             // e.g., "0", "25%"
  maxUnavailableValue: number;        // Calculated numeric value
  revisionHistoryLimit: number;       // Number of old ReplicaSets to retain
  progressDeadlineSeconds: number;    // Time before rollout considered failed
  minReadySeconds: number;            // Minimum time pod is considered ready
}
```

### PodTemplateInfo

Pod template specification details:

```typescript
interface PodTemplateInfo {
  containers: ContainerInfo[];
  initContainers: ContainerInfo[];    // If present
  volumes: VolumeInfo[];
  restartPolicy: string;              // e.g., "Always"
  serviceAccount: string;
  securityContext: PodSecurityContextInfo;
}

interface ContainerInfo {
  name: string;
  image: string;
  imageTag: string;                   // Extracted tag or "latest"
  ports: ContainerPort[];
  env: EnvVarSummary;
  volumeMounts: VolumeMountSummary;
  resources: ContainerResources;
  livenessProbe: ProbeInfo | null;
  readinessProbe: ProbeInfo | null;
  startupProbe: ProbeInfo | null;
  imagePullPolicy: string;            // e.g., "IfNotPresent", "Always"
}

interface ContainerPort {
  name: string;
  containerPort: number;
  protocol: string;                   // e.g., "TCP", "UDP"
}

interface EnvVarSummary {
  count: number;                      // Total number of env vars
  hasSecrets: boolean;                // If any env vars reference secrets
  hasConfigMaps: boolean;             // If any env vars reference configmaps
}

interface VolumeMountSummary {
  count: number;                      // Total number of mounts
  paths: string[];                    // List of mount paths
}

interface ContainerResources {
  requests: ResourceValues;
  limits: ResourceValues;
  hasRequests: boolean;
  hasLimits: boolean;
}

interface ResourceValues {
  cpu: string;                        // e.g., "100m", "1"
  cpuMillicores: number;              // Numeric value in millicores
  memory: string;                     // e.g., "128Mi", "1Gi"
  memoryBytes: number;                // Numeric value in bytes
}

interface ProbeInfo {
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  successThreshold: number;
  failureThreshold: number;
  details: string;                    // Human-readable probe configuration
}

interface VolumeInfo {
  name: string;
  type: string;                       // e.g., "ConfigMap", "Secret", "EmptyDir"
  source: string;                     // Source name or description
}

interface PodSecurityContextInfo {
  runAsUser: number | null;
  runAsGroup: number | null;
  fsGroup: number | null;
  runAsNonRoot: boolean | null;
}
```

### DeploymentCondition

Deployment status conditions:

```typescript
interface DeploymentCondition {
  type: 'Available' | 'Progressing' | 'ReplicaFailure';
  status: 'True' | 'False' | 'Unknown';
  reason: string;                     // e.g., "MinimumReplicasAvailable", "ProgressDeadlineExceeded"
  message: string;                    // Human-readable message
  lastUpdateTime: string;             // ISO 8601 timestamp
  lastTransitionTime: string;         // ISO 8601 timestamp
  relativeTime: string;               // e.g., "2h ago", "5m ago"
  severity: 'success' | 'warning' | 'error' | 'info';  // UI severity
}
```

### ReplicaSetInfo

Information about related ReplicaSets:

```typescript
interface ReplicaSetInfo {
  name: string;
  namespace: string;
  revision: number;                   // From deployment.kubernetes.io/revision annotation
  desired: number;                    // spec.replicas
  current: number;                    // status.replicas
  ready: number;                      // status.readyReplicas
  available: number;                  // status.availableReplicas
  creationTimestamp: string;          // ISO 8601 timestamp
  age: string;                        // e.g., "2h", "5d"
  isCurrent: boolean;                 // If this is the active ReplicaSet
  images: string[];                   // Container images from pod template
}
```

### DeploymentEvent

Recent Kubernetes events for the deployment:

```typescript
interface DeploymentEvent {
  type: 'Normal' | 'Warning';
  reason: string;                     // e.g., "ScalingReplicaSet", "FailedCreate"
  message: string;                    // Event message
  count: number;                      // Number of occurrences
  firstTimestamp: string;             // ISO 8601 timestamp
  lastTimestamp: string;              // ISO 8601 timestamp
  source: string;                     // Event source component
  relativeTime: string;               // e.g., "2m ago"
}
```

## kubectl Integration

### Get Deployment Details

Command to fetch comprehensive deployment information:

```bash
kubectl get deployment <deployment-name> -n <namespace> -o json
```

Response structure (V1Deployment from @kubernetes/client-node):

```typescript
import * as k8s from '@kubernetes/client-node';

// Use k8s.V1Deployment as the source
interface V1Deployment {
  metadata: k8s.V1ObjectMeta;
  spec: k8s.V1DeploymentSpec;
  status: k8s.V1DeploymentStatus;
}
```

### Get Related ReplicaSets

Command to fetch ReplicaSets owned by the deployment:

```bash
kubectl get replicasets -n <namespace> \
  -l <label-selectors> \
  -o json
```

Or use owner references to find ReplicaSets:

```typescript
// Filter ReplicaSets where ownerReferences contains the Deployment UID
const relatedReplicaSets = allReplicaSets.filter(rs => 
  rs.metadata.ownerReferences?.some(ref => 
    ref.kind === 'Deployment' && 
    ref.name === deploymentName &&
    ref.uid === deploymentUid
  )
);
```

### Get Deployment Events

Command to fetch events related to the deployment:

```bash
kubectl get events -n <namespace> \
  --field-selector involvedObject.name=<deployment-name>,involvedObject.kind=Deployment \
  -o json
```

Response structure (V1EventList):

```typescript
interface V1EventList {
  items: k8s.CoreV1Event[];
}
```

## Data Transformation

### Transform Deployment to DeploymentDescribeData

Main transformation function:

```typescript
function transformDeploymentData(
  deployment: k8s.V1Deployment,
  replicaSets: k8s.V1ReplicaSet[],
  events: k8s.CoreV1Event[]
): DeploymentDescribeData {
  return {
    name: deployment.metadata.name,
    namespace: deployment.metadata.namespace,
    overview: extractOverview(deployment),
    replicaStatus: extractReplicaStatus(deployment),
    strategy: extractStrategy(deployment),
    podTemplate: extractPodTemplate(deployment),
    conditions: extractConditions(deployment),
    replicaSets: transformReplicaSets(replicaSets, deployment),
    labels: deployment.metadata.labels || {},
    selectors: deployment.spec.selector.matchLabels || {},
    annotations: deployment.metadata.annotations || {},
    events: transformEvents(events)
  };
}
```

### Extract Overview

```typescript
function extractOverview(deployment: k8s.V1Deployment): DeploymentOverview {
  const conditions = deployment.status?.conditions || [];
  const availableCondition = conditions.find(c => c.type === 'Available');
  const progressingCondition = conditions.find(c => c.type === 'Progressing');
  const failureCondition = conditions.find(c => c.type === 'ReplicaFailure');
  
  let status: 'Available' | 'Progressing' | 'Failed' | 'Unknown' = 'Unknown';
  let statusMessage = '';
  
  if (failureCondition?.status === 'True') {
    status = 'Failed';
    statusMessage = failureCondition.message;
  } else if (availableCondition?.status === 'True') {
    status = 'Available';
    statusMessage = 'Deployment is available';
  } else if (progressingCondition?.status === 'True') {
    status = 'Progressing';
    statusMessage = progressingCondition.message;
  }
  
  return {
    name: deployment.metadata.name,
    namespace: deployment.metadata.namespace,
    status,
    statusMessage,
    creationTimestamp: deployment.metadata.creationTimestamp,
    age: calculateAge(deployment.metadata.creationTimestamp),
    generation: deployment.metadata.generation || 0,
    observedGeneration: deployment.status?.observedGeneration || 0,
    paused: deployment.spec.paused || false
  };
}
```

### Extract Replica Status

```typescript
function extractReplicaStatus(deployment: k8s.V1Deployment): ReplicaStatus {
  const desired = deployment.spec.replicas || 0;
  const current = deployment.status?.replicas || 0;
  const ready = deployment.status?.readyReplicas || 0;
  const available = deployment.status?.availableReplicas || 0;
  const upToDate = deployment.status?.updatedReplicas || 0;
  const unavailable = Math.max(0, desired - available);
  
  return {
    desired,
    current,
    ready,
    available,
    unavailable,
    upToDate,
    readyPercentage: desired > 0 ? (ready / desired) * 100 : 0,
    availablePercentage: desired > 0 ? (available / desired) * 100 : 0,
    isHealthy: ready === desired && available === desired && desired > 0
  };
}
```

### Extract Strategy

```typescript
function extractStrategy(deployment: k8s.V1Deployment): DeploymentStrategy {
  const strategy = deployment.spec.strategy || { type: 'RollingUpdate' };
  
  if (strategy.type === 'Recreate') {
    return {
      type: 'Recreate',
      maxSurge: 'N/A',
      maxSurgeValue: 0,
      maxUnavailable: 'N/A',
      maxUnavailableValue: 0,
      revisionHistoryLimit: deployment.spec.revisionHistoryLimit || 10,
      progressDeadlineSeconds: deployment.spec.progressDeadlineSeconds || 600,
      minReadySeconds: deployment.spec.minReadySeconds || 0
    };
  }
  
  const rollingUpdate = strategy.rollingUpdate || {};
  const replicas = deployment.spec.replicas || 1;
  
  return {
    type: 'RollingUpdate',
    maxSurge: rollingUpdate.maxSurge?.toString() || '25%',
    maxSurgeValue: calculateIntOrPercent(rollingUpdate.maxSurge, replicas),
    maxUnavailable: rollingUpdate.maxUnavailable?.toString() || '25%',
    maxUnavailableValue: calculateIntOrPercent(rollingUpdate.maxUnavailable, replicas),
    revisionHistoryLimit: deployment.spec.revisionHistoryLimit || 10,
    progressDeadlineSeconds: deployment.spec.progressDeadlineSeconds || 600,
    minReadySeconds: deployment.spec.minReadySeconds || 0
  };
}

function calculateIntOrPercent(value: any, total: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('%')) {
    const percent = parseInt(value.slice(0, -1));
    return Math.ceil((percent / 100) * total);
  }
  return 0;
}
```

### Extract Pod Template

```typescript
function extractPodTemplate(deployment: k8s.V1Deployment): PodTemplateInfo {
  const podSpec = deployment.spec.template.spec;
  
  return {
    containers: podSpec.containers.map(extractContainerInfo),
    initContainers: (podSpec.initContainers || []).map(extractContainerInfo),
    volumes: (podSpec.volumes || []).map(extractVolumeInfo),
    restartPolicy: podSpec.restartPolicy || 'Always',
    serviceAccount: podSpec.serviceAccountName || 'default',
    securityContext: extractPodSecurityContext(podSpec.securityContext)
  };
}

function extractContainerInfo(container: k8s.V1Container): ContainerInfo {
  const [image, tag] = container.image.split(':');
  
  return {
    name: container.name,
    image: container.image,
    imageTag: tag || 'latest',
    ports: (container.ports || []).map(p => ({
      name: p.name || '',
      containerPort: p.containerPort,
      protocol: p.protocol || 'TCP'
    })),
    env: {
      count: (container.env || []).length,
      hasSecrets: (container.env || []).some(e => e.valueFrom?.secretKeyRef),
      hasConfigMaps: (container.env || []).some(e => e.valueFrom?.configMapKeyRef)
    },
    volumeMounts: {
      count: (container.volumeMounts || []).length,
      paths: (container.volumeMounts || []).map(vm => vm.mountPath)
    },
    resources: extractContainerResources(container.resources),
    livenessProbe: extractProbeInfo(container.livenessProbe),
    readinessProbe: extractProbeInfo(container.readinessProbe),
    startupProbe: extractProbeInfo(container.startupProbe),
    imagePullPolicy: container.imagePullPolicy || 'IfNotPresent'
  };
}
```

### Transform ReplicaSets

```typescript
function transformReplicaSets(
  replicaSets: k8s.V1ReplicaSet[],
  deployment: k8s.V1Deployment
): ReplicaSetInfo[] {
  // Sort by revision (newest first)
  const sorted = replicaSets
    .map(rs => {
      const revision = parseInt(
        rs.metadata.annotations?.['deployment.kubernetes.io/revision'] || '0'
      );
      
      return {
        name: rs.metadata.name,
        namespace: rs.metadata.namespace,
        revision,
        desired: rs.spec.replicas || 0,
        current: rs.status?.replicas || 0,
        ready: rs.status?.readyReplicas || 0,
        available: rs.status?.availableReplicas || 0,
        creationTimestamp: rs.metadata.creationTimestamp,
        age: calculateAge(rs.metadata.creationTimestamp),
        isCurrent: rs.spec.replicas > 0,
        images: rs.spec.template.spec.containers.map(c => c.image)
      };
    })
    .sort((a, b) => b.revision - a.revision);
  
  return sorted;
}
```

## Extension Integration

### DeploymentDescribeWebview.ts

Main webview controller (following NodeDescribeWebview pattern):

```typescript
export class DeploymentDescribeWebview {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static extensionContext: vscode.ExtensionContext;
  private static currentDeploymentName: string | undefined;
  private static currentNamespace: string | undefined;
  private static kubeconfigPath: string | undefined;
  private static contextName: string | undefined;
  
  /**
   * Show the Deployment Describe webview.
   * Creates a new panel if none exists, or reuses and updates the existing panel.
   */
  public static async show(
    context: vscode.ExtensionContext,
    deploymentName: string,
    namespace: string,
    kubeconfigPath: string,
    contextName: string
  ): Promise<void> {
    // Store context
    DeploymentDescribeWebview.extensionContext = context;
    DeploymentDescribeWebview.currentDeploymentName = deploymentName;
    DeploymentDescribeWebview.currentNamespace = namespace;
    DeploymentDescribeWebview.kubeconfigPath = kubeconfigPath;
    DeploymentDescribeWebview.contextName = contextName;
    
    // Reuse existing panel or create new one
    if (DeploymentDescribeWebview.currentPanel) {
      DeploymentDescribeWebview.currentPanel.title = `Deployment / ${deploymentName}`;
      DeploymentDescribeWebview.currentPanel.webview.html = 
        DeploymentDescribeWebview.getWebviewContent(DeploymentDescribeWebview.currentPanel.webview);
      await DeploymentDescribeWebview.refreshDeploymentData();
      DeploymentDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }
    
    // Create new webview panel
    const panel = vscode.window.createWebviewPanel(
      'kube9DeploymentDescribe',
      `Deployment / ${deploymentName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    DeploymentDescribeWebview.currentPanel = panel;
    
    // Set HTML content
    panel.webview.html = DeploymentDescribeWebview.getWebviewContent(panel.webview);
    
    // Set up message handlers
    DeploymentDescribeWebview.setupMessageHandlers(panel);
    
    // Fetch and display data
    await DeploymentDescribeWebview.refreshDeploymentData();
    
    // Handle panel disposal
    panel.onDidDispose(() => {
      DeploymentDescribeWebview.currentPanel = undefined;
      DeploymentDescribeWebview.currentDeploymentName = undefined;
      DeploymentDescribeWebview.currentNamespace = undefined;
    });
  }
  
  /**
   * Fetch deployment data and update webview.
   */
  private static async refreshDeploymentData(): Promise<void> {
    if (!DeploymentDescribeWebview.currentPanel) return;
    
    try {
      // Fetch data in parallel
      const [deployment, replicaSets, events] = await Promise.all([
        DeploymentCommands.getDeploymentDetails(
          DeploymentDescribeWebview.currentDeploymentName!,
          DeploymentDescribeWebview.currentNamespace!,
          DeploymentDescribeWebview.kubeconfigPath!,
          DeploymentDescribeWebview.contextName!
        ),
        DeploymentCommands.getRelatedReplicaSets(
          DeploymentDescribeWebview.currentDeploymentName!,
          DeploymentDescribeWebview.currentNamespace!,
          DeploymentDescribeWebview.kubeconfigPath!,
          DeploymentDescribeWebview.contextName!
        ),
        DeploymentCommands.getDeploymentEvents(
          DeploymentDescribeWebview.currentDeploymentName!,
          DeploymentDescribeWebview.currentNamespace!,
          DeploymentDescribeWebview.kubeconfigPath!,
          DeploymentDescribeWebview.contextName!
        )
      ]);
      
      // Transform data
      const deploymentData = transformDeploymentData(deployment, replicaSets, events);
      
      // Send to webview
      DeploymentDescribeWebview.currentPanel.webview.postMessage({
        command: 'updateDeploymentData',
        data: deploymentData
      });
      
    } catch (error) {
      DeploymentDescribeWebview.currentPanel.webview.postMessage({
        command: 'error',
        message: `Failed to fetch deployment data: ${error.message}`
      });
    }
  }
  
  /**
   * Set up message handlers for webview communication.
   */
  private static setupMessageHandlers(panel: vscode.WebviewPanel): void {
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await DeploymentDescribeWebview.refreshDeploymentData();
          break;
          
        case 'navigateToReplicaSet':
          // Navigate to ReplicaSet in tree view
          await vscode.commands.executeCommand(
            'kube9.revealResource',
            'ReplicaSet',
            message.replicaSetName,
            DeploymentDescribeWebview.currentNamespace
          );
          break;
          
        case 'copyValue':
          await vscode.env.clipboard.writeText(message.value);
          vscode.window.showInformationMessage('Copied to clipboard');
          break;
      }
    });
  }
}
```

## Webview HTML Structure

The webview should render deployment data in organized sections:

1. **Header**: Deployment name, namespace, refresh button
2. **Overview Card**: Status, replicas, strategy, age
3. **Replica Status Card**: Visual indicators for desired/current/ready/available
4. **Rollout Strategy Card**: Strategy type, max surge, max unavailable
5. **Pod Template Card**: Container images, ports, resources, probes
6. **Conditions Card**: Deployment conditions with status indicators
7. **ReplicaSets Card**: Related ReplicaSets table (current highlighted)
8. **Selectors & Labels Card**: Selectors and labels with copy functionality
9. **Events Card**: Recent events (warnings highlighted)
10. **Annotations Card**: Annotations with expand/collapse for long values

## Commands to Register

### Tree View Click Handler

Update Deployment tree item to handle left-click:

```typescript
// In extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.deployment.describe', async (deployment) => {
    await DeploymentDescribeWebview.show(
      context,
      deployment.name,
      deployment.namespace,
      deployment.kubeconfigPath,
      deployment.contextName
    );
  })
);
```

### Right-Click Describe Command

Already exists for graphical view.

### Right-Click Describe (Raw) Command

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.deployment.describeRaw', async (deployment) => {
    const output = await DeploymentCommands.getDeploymentDescribeRaw(
      deployment.name,
      deployment.namespace,
      deployment.kubeconfigPath,
      deployment.contextName
    );
    
    const doc = await vscode.workspace.openTextDocument({
      content: output,
      language: 'yaml'
    });
    
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.One
    });
  })
);
```

## Best Practices

1. **Reuse Shared Panel**: Use the same webview panel for all describe operations (Nodes, Deployments, etc.)
2. **Parallel Data Fetching**: Fetch deployment, ReplicaSets, and events in parallel using Promise.all()
3. **Human-Readable Formatting**: Display CPU (millicores), memory (Mi/Gi), and times in readable format
4. **Visual Indicators**: Use color-coded badges for status, progress bars for resources
5. **Error Handling**: Show user-friendly error messages if data fetch fails
6. **Lazy Loading**: Load sections progressively if data is large
7. **Copy Functionality**: Provide copy-to-clipboard for labels, annotations, selectors, images
8. **Navigation**: Allow clicking ReplicaSet names to navigate to them in tree view
9. **Refresh**: Implement refresh button to update data without closing webview
10. **Responsive Layout**: Ensure webview adapts to different VSCode window sizes

## Technical Requirements

- Node.js >=22.14.0
- @kubernetes/client-node library for type definitions
- VSCode Webview API for UI rendering
- kubectl CLI for data fetching (or use Kubernetes client library)
- CSS framework for styling (match existing webview style)

