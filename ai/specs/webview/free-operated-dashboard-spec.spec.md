---
spec_id: free-operated-dashboard-spec
feature_id: [operated-dashboard]
diagram_id: [dashboard-architecture]
context_id: [kubernetes-cluster-management, ai-integration]
---

# Free Operated Dashboard Specification

## Overview

The Free Operated Dashboard displays cluster statistics from operator-managed resources. This dashboard is shown when the kube9-operator is installed (operator status: "operated", "enabled", or "degraded"). It queries kubectl for operator-provided data and includes a conditional content section that shows AI recommendations (if API key is configured in the operator) or a degraded warning (if operator health is degraded).

## Data Collection

### Operator Status Detection

```typescript
interface OperatorStatus {
  mode: OperatorStatusMode; // operated, enabled, degraded
  tier: 'free' | 'pro';
  version: string;
  hasApiKey: boolean; // Read from operator ConfigMap
  health: 'healthy' | 'degraded';
  lastUpdate: Date;
}

async function getOperatorStatus(clusterContext: string): Promise<OperatorStatus> {
  const result = await execKubectl(
    `kubectl --context=${clusterContext} get configmap kube9-operator-status -n kube9-system -o json`,
    { timeout: 5000 }
  );
  
  const configMap = JSON.parse(result.stdout);
  const statusData = JSON.parse(configMap.data.status);
  
  return {
    mode: statusData.mode,
    tier: statusData.tier,
    version: statusData.version,
    hasApiKey: statusData.apiKeyConfigured,
    health: statusData.health,
    lastUpdate: new Date(statusData.lastUpdate)
  };
}
```

### Operator-Provided Dashboard Data

The operator maintains a dedicated ConfigMap for dashboard statistics:

```typescript
interface OperatorDashboardData {
  namespaceCount: number;
  workloads: WorkloadCounts;
  nodes: NodeInfo;
  operatorMetrics: OperatorMetrics;
  lastUpdated: Date;
}

interface OperatorMetrics {
  collectorsRunning: number;
  dataPointsCollected: number;
  lastCollectionTime: Date;
}

async function getOperatorDashboardData(clusterContext: string): Promise<OperatorDashboardData> {
  const result = await execKubectl(
    `kubectl --context=${clusterContext} get configmap kube9-dashboard-data -n kube9-system -o json`,
    { timeout: 5000 }
  );
  
  const configMap = JSON.parse(result.stdout);
  const dashboardData = JSON.parse(configMap.data.dashboard);
  
  return {
    namespaceCount: dashboardData.namespaces,
    workloads: {
      deployments: dashboardData.workloads.deployments,
      statefulsets: dashboardData.workloads.statefulsets,
      daemonsets: dashboardData.workloads.daemonsets,
      replicasets: dashboardData.workloads.replicasets,
      jobs: dashboardData.workloads.jobs,
      cronjobs: dashboardData.workloads.cronjobs,
      pods: dashboardData.workloads.pods
    },
    nodes: {
      totalNodes: dashboardData.nodes.total,
      readyNodes: dashboardData.nodes.ready,
      cpuCapacity: dashboardData.nodes.cpuCapacity,
      memoryCapacity: dashboardData.nodes.memoryCapacity
    },
    operatorMetrics: {
      collectorsRunning: dashboardData.operator.collectorsRunning,
      dataPointsCollected: dashboardData.operator.dataPointsCollected,
      lastCollectionTime: new Date(dashboardData.operator.lastCollectionTime)
    },
    lastUpdated: new Date(dashboardData.lastUpdated)
  };
}
```

## Conditional Content Section

### API Key Detection

```typescript
function hasApiKey(operatorStatus: OperatorStatus): boolean {
  return operatorStatus.hasApiKey && operatorStatus.mode === OperatorStatusMode.Enabled;
}
```

### Content Section Structure

```typescript
interface ConditionalContentSection {
  type: 'ai-recommendations' | 'degraded-warning' | null;
  content: AIRecommendationsContent | DegradedWarningContent | null;
}

function getConditionalContent(operatorStatus: OperatorStatus): ConditionalContentSection {
  if (operatorStatus.health === 'degraded') {
    return {
      type: 'degraded-warning',
      content: buildDegradedWarning(operatorStatus)
    };
  }
  
  if (hasApiKey(operatorStatus)) {
    return {
      type: 'ai-recommendations',
      content: buildAIRecommendations()
    };
  }
  
  return {
    type: null,
    content: null
  };
}
```

## AI Recommendations Panel

### Data Structure

```typescript
interface AIRecommendationsContent {
  recommendations: Recommendation[];
  insights: Insight[];
  loadingState: 'loading' | 'loaded' | 'error';
}

interface Recommendation {
  id: string;
  type: 'optimization' | 'cost' | 'security' | 'reliability';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  actionUrl?: string;
}

interface Insight {
  id: string;
  category: string;
  summary: string;
  details: string;
}
```

### Fetching AI Recommendations

```typescript
async function fetchAIRecommendations(clusterContext: string): Promise<AIRecommendationsContent> {
  try {
    // Query operator-managed resource containing AI recommendations
    const result = await execKubectl(
      `kubectl --context=${clusterContext} get configmap kube9-ai-recommendations -n kube9-system -o json`,
      { timeout: 5000 }
    );
    
    const configMap = JSON.parse(result.stdout);
    const recommendations = JSON.parse(configMap.data.recommendations);
    
    return {
      recommendations: recommendations.items || [],
      insights: recommendations.insights || [],
      loadingState: 'loaded'
    };
  } catch (error) {
    return {
      recommendations: [],
      insights: [],
      loadingState: 'error'
    };
  }
}
```

### AI Panel HTML

```html
<div class="conditional-content ai-recommendations">
  <div class="section-header">
    <span class="codicon codicon-lightbulb"></span>
    <h2>AI Recommendations</h2>
  </div>
  
  <div class="recommendations-list">
    ${recommendations.map(rec => `
      <div class="recommendation-card ${rec.severity}">
        <div class="rec-header">
          <span class="rec-type-icon codicon codicon-${getRecommendationIcon(rec.type)}"></span>
          <span class="rec-severity ${rec.severity}">${rec.severity.toUpperCase()}</span>
        </div>
        <h3 class="rec-title">${rec.title}</h3>
        <p class="rec-description">${rec.description}</p>
        ${rec.actionable ? `
          <button class="rec-action" onclick="handleRecommendation('${rec.id}')">
            Take Action
          </button>
        ` : ''}
      </div>
    `).join('')}
  </div>
  
  ${insights.length > 0 ? `
    <div class="insights-section">
      <h3>Cluster Insights</h3>
      <div class="insights-list">
        ${insights.map(insight => `
          <div class="insight-item">
            <strong>${insight.category}:</strong> ${insight.summary}
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}
</div>
```

## Degraded Warning Panel

### Warning Content Structure

```typescript
interface DegradedWarningContent {
  message: string;
  issues: string[];
  troubleshootingSteps: string[];
}

function buildDegradedWarning(operatorStatus: OperatorStatus): DegradedWarningContent {
  return {
    message: 'The kube9 operator is experiencing issues',
    issues: [
      'Operator health status: degraded',
      `Last successful update: ${formatTimestamp(operatorStatus.lastUpdate)}`,
      'Some features may be unavailable'
    ],
    troubleshootingSteps: [
      'Check operator pod logs in kube9-system namespace',
      'Verify API key configuration in operator',
      'Check network connectivity to kube9-server',
      'Review operator status ConfigMap for details'
    ]
  };
}
```

### Degraded Panel HTML

```html
<div class="conditional-content degraded-warning">
  <div class="section-header warning">
    <span class="codicon codicon-warning"></span>
    <h2>Operator Status Warning</h2>
  </div>
  
  <div class="warning-content">
    <p class="warning-message">${message}</p>
    
    <div class="issues-section">
      <h4>Current Issues:</h4>
      <ul>
        ${issues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    </div>
    
    <div class="troubleshooting-section">
      <h4>Troubleshooting Steps:</h4>
      <ol>
        ${troubleshootingSteps.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    
    <button class="action-button" onclick="handleViewOperatorLogs()">
      View Operator Logs
    </button>
  </div>
</div>
```

## Dashboard Layout

### Complete Dashboard Structure

```html
<div class="dashboard-header">
  <h1>Cluster Dashboard</h1>
  <div class="dashboard-subtitle">
    <span class="cluster-name">${clusterName}</span>
    <span class="operator-badge ${operatorStatus.mode}">
      <span class="codicon codicon-${getOperatorIcon(operatorStatus.mode)}"></span>
      Operator: ${operatorStatus.mode}
    </span>
    <span class="last-updated">Last updated: ${formatTimestamp(lastUpdated)}</span>
  </div>
  <button class="refresh-button" onclick="refresh()">
    <span class="codicon codicon-refresh"></span> Refresh
  </button>
</div>

<!-- Stats Cards (similar to Free Non-Operated) -->
<div class="stats-cards-container">
  <!-- Stats cards here -->
</div>

<!-- Conditional Content Section (AI Recommendations OR Degraded Warning) -->
${renderConditionalContent(operatorStatus)}

<!-- Charts (similar to Free Non-Operated) -->
<div class="charts-container">
  <!-- Charts here -->
</div>

<!-- Operator Metrics Section (unique to Free Operated) -->
<div class="operator-metrics">
  <h2>Operator Metrics</h2>
  <div class="metrics-grid">
    <div class="metric-item">
      <span class="metric-label">Collectors Running</span>
      <span class="metric-value">${operatorMetrics.collectorsRunning}</span>
    </div>
    <div class="metric-item">
      <span class="metric-label">Data Points Collected</span>
      <span class="metric-value">${formatNumber(operatorMetrics.dataPointsCollected)}</span>
    </div>
    <div class="metric-item">
      <span class="metric-label">Last Collection</span>
      <span class="metric-value">${formatTimestamp(operatorMetrics.lastCollectionTime)}</span>
    </div>
  </div>
</div>

<!-- Workload Details (similar to Free Non-Operated) -->
<div class="workload-details">
  <!-- Workload table here -->
</div>
```

## Styling

### Conditional Content Styling

```css
.conditional-content {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 24px;
  margin: 24px 0;
}

.conditional-content.ai-recommendations {
  border-left: 4px solid var(--vscode-charts-blue);
}

.conditional-content.degraded-warning {
  border-left: 4px solid var(--vscode-charts-red);
  background-color: var(--vscode-inputValidation-warningBackground);
}

.recommendation-card {
  background-color: var(--vscode-list-hoverBackground);
  border-radius: 6px;
  padding: 16px;
  margin: 12px 0;
}

.recommendation-card.high {
  border-left: 3px solid var(--vscode-charts-red);
}

.recommendation-card.medium {
  border-left: 3px solid var(--vscode-charts-yellow);
}

.recommendation-card.low {
  border-left: 3px solid var(--vscode-charts-blue);
}

.operator-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.operator-badge.operated {
  background-color: var(--vscode-charts-yellow);
  color: var(--vscode-editor-background);
}

.operator-badge.enabled {
  background-color: var(--vscode-charts-green);
  color: var(--vscode-editor-background);
}

.operator-badge.degraded {
  background-color: var(--vscode-charts-red);
  color: var(--vscode-editor-background);
}
```

## User Actions

### Handle Recommendation Action

```typescript
async function handleRecommendation(recommendationId: string) {
  vscode.postMessage({ 
    type: 'executeRecommendation', 
    recommendationId 
  });
}
```

## Error Handling

### Operator Data Unavailable

```typescript
async function loadFreeOperatedDashboard(
  clusterContext: string
): Promise<OperatorDashboardData> {
  try {
    return await getOperatorDashboardData(clusterContext);
  } catch (error) {
    // Fallback to kubectl queries if operator data unavailable
    vscode.window.showWarningMessage(
      'Operator dashboard data unavailable, falling back to kubectl queries'
    );
    return await loadFallbackDashboardData(clusterContext);
  }
}
```

## Non-Goals

- Real-time AI recommendation updates (future feature)
- Custom AI model selection (future feature)
- Historical recommendation tracking (future feature)
- Interactive recommendation wizards (future feature)
- Multi-cluster AI insights aggregation (future feature)

