---
spec_id: namespace-describe-webview-spec
name: Namespace Describe Webview Specification
description: Technical specification for implementing namespace describe functionality in the shared describe webview
feature_id:
  - namespace-describe-webview
diagram_id:
  - namespace-describe-architecture
---

# Namespace Describe Webview Specification

## Overview

The Namespace Describe Webview provides comprehensive namespace information using the shared describe webview pattern. It displays namespace metadata, resource counts, resource quotas, limit ranges, and related events in a tabbed interface.

## Architecture

See [namespace-describe-architecture](../../diagrams/webview/namespace-describe-architecture.diagram.md) for visual architecture.

## Implementation Details

### NamespaceTreeItem Enhancement

**File**: `src/tree/items/NamespaceTreeItem.ts`

Add click command to Namespace tree items:

```typescript
interface NamespaceTreeItemConfig {
  name: string;
  status: V1NamespaceStatus;
  metadata: V1ObjectMeta;
  context: string;
}

class NamespaceTreeItem extends vscode.TreeItem {
  constructor(config: NamespaceTreeItemConfig) {
    super(config.name, vscode.TreeItemCollapsibleState.Collapsed);
    
    // Add click command
    this.command = {
      command: 'kube9.describeNamespace',
      title: 'Describe Namespace',
      arguments: [config]
    };
    
    // Existing tooltip, icon, etc.
  }
}
```

### NamespaceDescribeProvider

**File**: `src/providers/NamespaceDescribeProvider.ts` (new)

Data provider that fetches and formats Namespace information:

```typescript
interface NamespaceDescribeData {
  overview: NamespaceOverview;
  resources: ResourceSummary;
  quotas: ResourceQuotaInfo[];
  limitRanges: LimitRangeInfo[];
  events: NamespaceEvent[];
  metadata: NamespaceMetadata;
}

interface NamespaceOverview {
  name: string;
  status: NamespaceStatus;
  phase: 'Active' | 'Terminating';
  age: string;
  creationTimestamp: string;
  uid: string;
  resourceVersion: string;
}

interface NamespaceStatus {
  phase: 'Active' | 'Terminating';
  conditions?: NamespaceCondition[];
}

interface NamespaceCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

interface ResourceSummary {
  pods: PodSummary;
  deployments: number;
  statefulSets: number;
  daemonSets: number;
  services: ServiceSummary;
  configMaps: number;
  secrets: number;
  ingresses: number;
  jobs: JobSummary;
  cronJobs: number;
  persistentVolumeClaims: PVCSummary;
  replicaSets: number;
  endpoints: number;
  networkPolicies: number;
  serviceAccounts: number;
  roles: number;
  roleBindings: number;
}

interface PodSummary {
  total: number;
  running: number;
  pending: number;
  failed: number;
  succeeded: number;
  unknown: number;
}

interface ServiceSummary {
  total: number;
  clusterIP: number;
  nodePort: number;
  loadBalancer: number;
  externalName: number;
}

interface JobSummary {
  total: number;
  active: number;
  completed: number;
  failed: number;
}

interface PVCSummary {
  total: number;
  bound: number;
  pending: number;
  lost: number;
}

interface ResourceQuotaInfo {
  name: string;
  hard: Record<string, string>;
  used: Record<string, string>;
  percentUsed: Record<string, number>;
}

interface LimitRangeInfo {
  name: string;
  limits: LimitRangeLimit[];
}

interface LimitRangeLimit {
  type: 'Container' | 'Pod' | 'PersistentVolumeClaim';
  default?: Record<string, string>;
  defaultRequest?: Record<string, string>;
  min?: Record<string, string>;
  max?: Record<string, string>;
  maxLimitRequestRatio?: Record<string, string>;
}

interface NamespaceEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  source: string;
  age: string;
}

interface NamespaceMetadata {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  finalizers: string[];
  ownerReferences?: OwnerReference[];
}

interface OwnerReference {
  kind: string;
  name: string;
  uid: string;
  controller: boolean;
}

class NamespaceDescribeProvider {
  constructor(private k8sClient: KubernetesClient) {}

  async getNamespaceDetails(
    name: string,
    context: string
  ): Promise<NamespaceDescribeData> {
    // Fetch Namespace object
    const namespace = await this.k8sClient.readNamespace(name);
    
    // Fetch resource quotas
    const quotas = await this.k8sClient.listNamespacedResourceQuota(name);
    
    // Fetch limit ranges
    const limitRanges = await this.k8sClient.listNamespacedLimitRange(name);
    
    // Count resources in namespace
    const resources = await this.countNamespacedResources(name);
    
    // Fetch namespace events
    const events = await this.k8sClient.listNamespacedEvent(
      name,
      `involvedObject.kind=Namespace,involvedObject.name=${name}`
    );
    
    // Format data
    return {
      overview: this.formatOverview(namespace),
      resources: resources,
      quotas: this.formatResourceQuotas(quotas.items),
      limitRanges: this.formatLimitRanges(limitRanges.items),
      events: this.formatEvents(events.items),
      metadata: this.formatMetadata(namespace.metadata!)
    };
  }

  private formatOverview(namespace: V1Namespace): NamespaceOverview {
    const status = namespace.status!;
    const metadata = namespace.metadata!;
    
    return {
      name: metadata.name!,
      status: {
        phase: status.phase as 'Active' | 'Terminating',
        conditions: status.conditions?.map(c => ({
          type: c.type,
          status: c.status as 'True' | 'False' | 'Unknown',
          lastTransitionTime: c.lastTransitionTime || 'Unknown',
          reason: c.reason,
          message: c.message
        }))
      },
      phase: status.phase as 'Active' | 'Terminating',
      age: this.calculateAge(metadata.creationTimestamp),
      creationTimestamp: metadata.creationTimestamp || 'Unknown',
      uid: metadata.uid || 'Unknown',
      resourceVersion: metadata.resourceVersion || 'Unknown'
    };
  }

  private async countNamespacedResources(namespace: string): Promise<ResourceSummary> {
    // Perform parallel resource counting
    const [
      pods,
      deployments,
      statefulSets,
      daemonSets,
      services,
      configMaps,
      secrets,
      ingresses,
      jobs,
      cronJobs,
      pvcs,
      replicaSets,
      endpoints,
      networkPolicies,
      serviceAccounts,
      roles,
      roleBindings
    ] = await Promise.all([
      this.countPods(namespace),
      this.countResource('deployments', namespace),
      this.countResource('statefulsets', namespace),
      this.countResource('daemonsets', namespace),
      this.countServices(namespace),
      this.countResource('configmaps', namespace),
      this.countResource('secrets', namespace),
      this.countResource('ingresses', namespace),
      this.countJobs(namespace),
      this.countResource('cronjobs', namespace),
      this.countPVCs(namespace),
      this.countResource('replicasets', namespace),
      this.countResource('endpoints', namespace),
      this.countResource('networkpolicies', namespace),
      this.countResource('serviceaccounts', namespace),
      this.countResource('roles', namespace),
      this.countResource('rolebindings', namespace)
    ]);

    return {
      pods,
      deployments,
      statefulSets,
      daemonSets,
      services,
      configMaps,
      secrets,
      ingresses,
      jobs,
      cronJobs,
      persistentVolumeClaims: pvcs,
      replicaSets,
      endpoints,
      networkPolicies,
      serviceAccounts,
      roles,
      roleBindings
    };
  }

  private async countPods(namespace: string): Promise<PodSummary> {
    const pods = await this.k8sClient.listNamespacedPod(namespace);
    
    const summary: PodSummary = {
      total: pods.items.length,
      running: 0,
      pending: 0,
      failed: 0,
      succeeded: 0,
      unknown: 0
    };

    pods.items.forEach(pod => {
      const phase = pod.status?.phase?.toLowerCase();
      switch (phase) {
        case 'running':
          summary.running++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'succeeded':
          summary.succeeded++;
          break;
        default:
          summary.unknown++;
      }
    });

    return summary;
  }

  private async countServices(namespace: string): Promise<ServiceSummary> {
    const services = await this.k8sClient.listNamespacedService(namespace);
    
    const summary: ServiceSummary = {
      total: services.items.length,
      clusterIP: 0,
      nodePort: 0,
      loadBalancer: 0,
      externalName: 0
    };

    services.items.forEach(service => {
      const type = service.spec?.type?.toLowerCase();
      switch (type) {
        case 'clusterip':
          summary.clusterIP++;
          break;
        case 'nodeport':
          summary.nodePort++;
          break;
        case 'loadbalancer':
          summary.loadBalancer++;
          break;
        case 'externalname':
          summary.externalName++;
          break;
        default:
          summary.clusterIP++; // Default is ClusterIP
      }
    });

    return summary;
  }

  private async countJobs(namespace: string): Promise<JobSummary> {
    const jobs = await this.k8sClient.listNamespacedJob(namespace);
    
    const summary: JobSummary = {
      total: jobs.items.length,
      active: 0,
      completed: 0,
      failed: 0
    };

    jobs.items.forEach(job => {
      const status = job.status;
      if (status?.active && status.active > 0) {
        summary.active++;
      } else if (status?.succeeded && status.succeeded > 0) {
        summary.completed++;
      } else if (status?.failed && status.failed > 0) {
        summary.failed++;
      }
    });

    return summary;
  }

  private async countPVCs(namespace: string): Promise<PVCSummary> {
    const pvcs = await this.k8sClient.listNamespacedPersistentVolumeClaim(namespace);
    
    const summary: PVCSummary = {
      total: pvcs.items.length,
      bound: 0,
      pending: 0,
      lost: 0
    };

    pvcs.items.forEach(pvc => {
      const phase = pvc.status?.phase?.toLowerCase();
      switch (phase) {
        case 'bound':
          summary.bound++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'lost':
          summary.lost++;
          break;
      }
    });

    return summary;
  }

  private async countResource(resourceType: string, namespace: string): Promise<number> {
    try {
      const list = await this.k8sClient.listNamespacedResource(resourceType, namespace);
      return list.items.length;
    } catch (error) {
      // Resource type not available in cluster, return 0
      return 0;
    }
  }

  private formatResourceQuotas(quotas: V1ResourceQuota[]): ResourceQuotaInfo[] {
    return quotas.map(quota => {
      const hard = quota.spec?.hard || {};
      const used = quota.status?.used || {};
      const percentUsed: Record<string, number> = {};

      Object.keys(hard).forEach(resource => {
        const hardValue = this.parseResourceValue(hard[resource]);
        const usedValue = this.parseResourceValue(used[resource] || '0');
        
        if (hardValue > 0) {
          percentUsed[resource] = (usedValue / hardValue) * 100;
        } else {
          percentUsed[resource] = 0;
        }
      });

      return {
        name: quota.metadata?.name || 'Unknown',
        hard,
        used,
        percentUsed
      };
    });
  }

  private formatLimitRanges(limitRanges: V1LimitRange[]): LimitRangeInfo[] {
    return limitRanges.map(lr => ({
      name: lr.metadata?.name || 'Unknown',
      limits: lr.spec?.limits?.map(limit => ({
        type: limit.type as 'Container' | 'Pod' | 'PersistentVolumeClaim',
        default: limit.default,
        defaultRequest: limit.defaultRequest,
        min: limit.min,
        max: limit.max,
        maxLimitRequestRatio: limit.maxLimitRequestRatio
      })) || []
    }));
  }

  private formatEvents(events: V1Event[]): NamespaceEvent[] {
    // Group events by type and reason
    const grouped = new Map<string, V1Event[]>();
    
    events.forEach(event => {
      const key = `${event.type}-${event.reason}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(event);
    });
    
    // Format grouped events
    return Array.from(grouped.values()).map(group => {
      const first = group[0];
      const sorted = group.sort((a, b) => 
        new Date(b.lastTimestamp || '').getTime() - 
        new Date(a.lastTimestamp || '').getTime()
      );
      
      return {
        type: (first.type || 'Normal') as 'Normal' | 'Warning',
        reason: first.reason || 'Unknown',
        message: first.message || 'No message',
        count: first.count || group.length,
        firstTimestamp: first.firstTimestamp || 'Unknown',
        lastTimestamp: sorted[0].lastTimestamp || 'Unknown',
        source: first.source?.component || 'Unknown',
        age: this.calculateAge(sorted[0].lastTimestamp)
      };
    });
  }

  private formatMetadata(metadata: V1ObjectMeta): NamespaceMetadata {
    return {
      labels: metadata.labels || {},
      annotations: metadata.annotations || {},
      finalizers: metadata.finalizers || [],
      ownerReferences: metadata.ownerReferences?.map(ref => ({
        kind: ref.kind,
        name: ref.name,
        uid: ref.uid,
        controller: ref.controller || false
      }))
    };
  }

  private parseResourceValue(value: string): number {
    // Parse Kubernetes resource quantities (e.g., "100m", "1Gi", "10")
    if (!value) return 0;
    
    // Handle millicores
    if (value.endsWith('m')) {
      return parseFloat(value.slice(0, -1)) / 1000;
    }
    
    // Handle memory units
    const units: Record<string, number> = {
      'Ki': 1024,
      'Mi': 1024 * 1024,
      'Gi': 1024 * 1024 * 1024,
      'Ti': 1024 * 1024 * 1024 * 1024,
      'K': 1000,
      'M': 1000 * 1000,
      'G': 1000 * 1000 * 1000,
      'T': 1000 * 1000 * 1000 * 1000
    };
    
    for (const [unit, multiplier] of Object.entries(units)) {
      if (value.endsWith(unit)) {
        return parseFloat(value.slice(0, -unit.length)) * multiplier;
      }
    }
    
    // Plain number
    return parseFloat(value);
  }

  private calculateAge(timestamp?: string): string {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
```

### DescribeWebview Enhancement

**File**: `src/webview/DescribeWebview.ts`

Add namespace support to shared webview:

```typescript
class DescribeWebview {
  private namespaceProvider: NamespaceDescribeProvider;
  
  async showNamespaceDescribe(namespace: NamespaceTreeItemConfig): Promise<void> {
    // Show or create webview
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'kube9.describe',
        `Namespace / ${namespace.name}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      
      this.panel.webview.html = this.getWebviewContent();
      this.setupMessageHandling();
    } else {
      this.panel.title = `Namespace / ${namespace.name}`;
      this.panel.reveal();
    }
    
    // Fetch and send Namespace data
    try {
      const namespaceData = await this.namespaceProvider.getNamespaceDetails(
        namespace.name,
        namespace.context
      );
      
      this.panel.webview.postMessage({
        command: 'updateNamespaceData',
        data: namespaceData
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: 'showError',
        data: {
          message: `Failed to load Namespace details: ${error.message}`
        }
      });
    }
  }
  
  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await this.refreshCurrentResource();
          break;
        case 'viewYaml':
          await this.openYamlEditor();
          break;
        case 'setDefaultNamespace':
          await this.setDefaultNamespace(message.data.namespace);
          break;
        case 'navigateToResource':
          await this.navigateToResource(message.data.resourceType, message.data.namespace);
          break;
      }
    });
  }
  
  private async setDefaultNamespace(namespace: string): Promise<void> {
    try {
      await this.k8sClient.setContextNamespace(namespace);
      vscode.window.showInformationMessage(`Default namespace set to: ${namespace}`);
      // Refresh tree view
      vscode.commands.executeCommand('kube9.refreshTree');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to set default namespace: ${error.message}`);
    }
  }
  
  private async navigateToResource(resourceType: string, namespace: string): Promise<void> {
    // Navigate tree view to show resource type in namespace
    vscode.commands.executeCommand('kube9.focusResourceType', resourceType, namespace);
  }
}
```

### Webview UI Implementation

**File**: `media/describe/NamespaceDescribeApp.tsx` (new)

React-based webview interface:

```typescript
interface NamespaceDescribeAppProps {
  vscode: VSCodeAPI;
}

type TabType = 'overview' | 'resources' | 'quotas' | 'limitRanges' | 'events';

const NamespaceDescribeApp: React.FC<NamespaceDescribeAppProps> = ({ vscode }) => {
  const [namespaceData, setNamespaceData] = useState<NamespaceDescribeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.command) {
        case 'updateNamespaceData':
          setNamespaceData(message.data);
          setError(null);
          break;
        case 'showError':
          setError(message.data.message);
          break;
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!namespaceData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="namespace-describe-container">
      <header className="namespace-header">
        <h1>{namespaceData.overview.name}</h1>
        <StatusBadge phase={namespaceData.overview.phase} />
        <div className="header-actions">
          <button onClick={() => vscode.postMessage({ command: 'refresh' })}>
            Refresh
          </button>
          <button onClick={() => vscode.postMessage({ command: 'viewYaml' })}>
            View YAML
          </button>
          <button onClick={() => vscode.postMessage({ 
            command: 'setDefaultNamespace',
            data: { namespace: namespaceData.overview.name }
          })}>
            Set as Default
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <TabButton
          label="Overview"
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          label="Resources"
          count={calculateTotalResources(namespaceData.resources)}
          active={activeTab === 'resources'}
          onClick={() => setActiveTab('resources')}
        />
        <TabButton
          label="Quotas"
          count={namespaceData.quotas.length}
          active={activeTab === 'quotas'}
          onClick={() => setActiveTab('quotas')}
        />
        <TabButton
          label="Limit Ranges"
          count={namespaceData.limitRanges.length}
          active={activeTab === 'limitRanges'}
          onClick={() => setActiveTab('limitRanges')}
        />
        <TabButton
          label="Events"
          count={namespaceData.events.length}
          active={activeTab === 'events'}
          onClick={() => setActiveTab('events')}
        />
      </nav>

      <main className="tab-content">
        {activeTab === 'overview' && <OverviewTab data={namespaceData.overview} metadata={namespaceData.metadata} />}
        {activeTab === 'resources' && <ResourcesTab resources={namespaceData.resources} namespace={namespaceData.overview.name} vscode={vscode} />}
        {activeTab === 'quotas' && <QuotasTab quotas={namespaceData.quotas} />}
        {activeTab === 'limitRanges' && <LimitRangesTab limitRanges={namespaceData.limitRanges} />}
        {activeTab === 'events' && <EventsTab events={namespaceData.events} />}
      </main>
    </div>
  );
};

function calculateTotalResources(resources: ResourceSummary): number {
  return resources.pods.total +
    resources.deployments +
    resources.statefulSets +
    resources.daemonSets +
    resources.services.total +
    resources.configMaps +
    resources.secrets +
    resources.ingresses +
    resources.jobs.total +
    resources.cronJobs +
    resources.persistentVolumeClaims.total;
}
```

### Tab Components

**Overview Tab**:
```typescript
const OverviewTab: React.FC<{ data: NamespaceOverview; metadata: NamespaceMetadata }> = ({ data, metadata }) => (
  <div className="overview-tab">
    <section className="info-section">
      <h2>Status</h2>
      <InfoGrid>
        <InfoItem label="Name" value={data.name} />
        <InfoItem label="Phase" value={data.phase} />
        <InfoItem label="Age" value={data.age} />
        <InfoItem label="Created" value={formatTimestamp(data.creationTimestamp)} />
      </InfoGrid>
    </section>

    <section className="info-section">
      <h2>Metadata</h2>
      <InfoGrid>
        <InfoItem label="UID" value={data.uid} copyable />
        <InfoItem label="Resource Version" value={data.resourceVersion} />
      </InfoGrid>
    </section>

    {Object.keys(metadata.labels).length > 0 && (
      <section className="info-section">
        <h2>Labels</h2>
        <KeyValueList items={metadata.labels} copyable />
      </section>
    )}

    {Object.keys(metadata.annotations).length > 0 && (
      <section className="info-section">
        <h2>Annotations</h2>
        <KeyValueList items={metadata.annotations} copyable />
      </section>
    )}
  </div>
);
```

**Resources Tab**:
```typescript
const ResourcesTab: React.FC<{ resources: ResourceSummary; namespace: string; vscode: VSCodeAPI }> = ({ resources, namespace, vscode }) => (
  <div className="resources-tab">
    <section className="resource-section">
      <h2>Workloads</h2>
      <ResourceTable>
        <ResourceRow
          type="Pods"
          count={resources.pods.total}
          details={`${resources.pods.running} Running, ${resources.pods.pending} Pending, ${resources.pods.failed} Failed`}
          health={calculatePodHealth(resources.pods)}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'pods', namespace }})}
        />
        <ResourceRow
          type="Deployments"
          count={resources.deployments}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'deployments', namespace }})}
        />
        <ResourceRow
          type="StatefulSets"
          count={resources.statefulSets}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'statefulsets', namespace }})}
        />
        <ResourceRow
          type="DaemonSets"
          count={resources.daemonSets}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'daemonsets', namespace }})}
        />
      </ResourceTable>
    </section>

    <section className="resource-section">
      <h2>Services & Networking</h2>
      <ResourceTable>
        <ResourceRow
          type="Services"
          count={resources.services.total}
          details={`${resources.services.clusterIP} ClusterIP, ${resources.services.nodePort} NodePort, ${resources.services.loadBalancer} LoadBalancer`}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'services', namespace }})}
        />
        <ResourceRow
          type="Ingresses"
          count={resources.ingresses}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'ingresses', namespace }})}
        />
        <ResourceRow
          type="Network Policies"
          count={resources.networkPolicies}
          onClick={() => vscode.postMessage({ command: 'navigateToResource', data: { resourceType: 'networkpolicies', namespace }})}
        />
      </ResourceTable>
    </section>

    <section className="resource-section">
      <h2>Configuration</h2>
      <ResourceTable>
        <ResourceRow type="ConfigMaps" count={resources.configMaps} />
        <ResourceRow type="Secrets" count={resources.secrets} />
      </ResourceTable>
    </section>

    <section className="resource-section">
      <h2>Storage</h2>
      <ResourceTable>
        <ResourceRow
          type="Persistent Volume Claims"
          count={resources.persistentVolumeClaims.total}
          details={`${resources.persistentVolumeClaims.bound} Bound, ${resources.persistentVolumeClaims.pending} Pending`}
        />
      </ResourceTable>
    </section>

    <section className="resource-section">
      <h2>Batch</h2>
      <ResourceTable>
        <ResourceRow
          type="Jobs"
          count={resources.jobs.total}
          details={`${resources.jobs.active} Active, ${resources.jobs.completed} Completed, ${resources.jobs.failed} Failed`}
        />
        <ResourceRow type="CronJobs" count={resources.cronJobs} />
      </ResourceTable>
    </section>
  </div>
);
```

**Quotas Tab**:
```typescript
const QuotasTab: React.FC<{ quotas: ResourceQuotaInfo[] }> = ({ quotas }) => {
  if (quotas.length === 0) {
    return <EmptyState message="No resource quotas configured for this namespace" />;
  }

  return (
    <div className="quotas-tab">
      {quotas.map(quota => (
        <section key={quota.name} className="quota-section">
          <h2>{quota.name}</h2>
          {Object.keys(quota.hard).map(resource => {
            const percent = quota.percentUsed[resource];
            const color = percent >= 100 ? 'red' : percent >= 90 ? 'yellow' : 'blue';
            
            return (
              <QuotaRow
                key={resource}
                resource={resource}
                hard={quota.hard[resource]}
                used={quota.used[resource] || '0'}
                percent={percent}
                color={color}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
};
```

**Limit Ranges Tab**:
```typescript
const LimitRangesTab: React.FC<{ limitRanges: LimitRangeInfo[] }> = ({ limitRanges }) => {
  if (limitRanges.length === 0) {
    return <EmptyState message="No limit ranges configured for this namespace" />;
  }

  return (
    <div className="limit-ranges-tab">
      {limitRanges.map(lr => (
        <section key={lr.name} className="limit-range-section">
          <h2>{lr.name}</h2>
          {lr.limits.map((limit, idx) => (
            <LimitRangeCard key={idx} type={limit.type} limit={limit} />
          ))}
        </section>
      ))}
    </div>
  );
};
```

**Events Tab**:
```typescript
const EventsTab: React.FC<{ events: NamespaceEvent[] }> = ({ events }) => {
  if (events.length === 0) {
    return <EmptyState message="No events found for this namespace" />;
  }

  return (
    <div className="events-tab">
      <div className="events-timeline">
        {events.map((event, idx) => (
          <EventItem
            key={idx}
            type={event.type}
            reason={event.reason}
            message={event.message}
            count={event.count}
            age={event.age}
            source={event.source}
          />
        ))}
      </div>
    </div>
  );
};
```

## Message Protocol

### Extension to Webview

```typescript
interface ExtensionToWebviewMessage {
  command: 'updateNamespaceData' | 'showError';
  data: NamespaceDescribeData | { message: string };
}
```

### Webview to Extension

```typescript
interface WebviewToExtensionMessage {
  command: 'refresh' | 'viewYaml' | 'setDefaultNamespace' | 'navigateToResource';
  data?: {
    namespace?: string;
    resourceType?: string;
  };
}
```

## Command Registration

**Command**: `kube9.describeNamespace`

**Handler**:
```typescript
vscode.commands.registerCommand('kube9.describeNamespace', async (namespace: NamespaceTreeItemConfig) => {
  const webview = DescribeWebview.getInstance(namespace.context);
  await webview.showNamespaceDescribe(namespace);
});
```

## Error Handling

### Namespace Not Found
- Display error message in webview
- Offer "Refresh Tree" action button
- Offer "Close" button

### Permission Denied
- Show RBAC error message
- Link to documentation on Kubernetes permissions

### Network Error
- Display connection error
- Offer "Retry" button

### Invalid Data
- Show graceful fallback for missing fields
- Use "N/A" or "Unknown" for unavailable data
- Handle missing quotas/limits gracefully

## Performance Considerations

### Data Caching
- Cache Namespace data for 60 seconds
- Cache resource counts for 30 seconds
- Cache quota/limit data for 60 seconds
- Invalidate cache on explicit refresh

### Resource Counting Optimization
- Use parallel API calls for resource counting
- Use pagination for large resource lists
- Limit to first 1000 items per resource type
- Show estimated counts for very large namespaces

### Efficient Queries
- Use field selectors to limit event queries
- Request only necessary Namespace fields
- Batch multiple API calls when possible

## Testing Requirements

### Unit Tests
- NamespaceDescribeProvider data formatting
- Resource counting logic
- Quota percentage calculations
- Age calculation accuracy

### Integration Tests
- Namespace data fetching from API
- Resource counting accuracy
- Quota/limit range parsing
- Event filtering and grouping
- Webview message protocol

### E2E Tests
- Click Namespace in tree opens webview
- Webview displays correct Namespace information
- Tab navigation works correctly
- Refresh button updates data
- View YAML button opens editor
- Set as Default Namespace updates context
- Navigate to resource type works
- Error states display properly
- Webview reuses same panel for different resources

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Arrow keys for tab navigation
- Enter to activate buttons
- Escape to close webview

### Screen Readers
- Proper ARIA labels on all elements
- Status announcements for data updates
- Descriptive labels for status indicators
- Progress bar labels for quotas

### Color Contrast
- High contrast mode support
- Status indicators include text and icons
- No information conveyed by color alone
- Progress bars have text labels

