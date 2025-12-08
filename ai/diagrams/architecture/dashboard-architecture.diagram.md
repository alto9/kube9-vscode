---
diagram_id: dashboard-architecture
feature_id: [free-dashboard, operated-dashboard]
spec_id: [dashboard-webview-spec, free-nonoperated-dashboard-spec, free-operated-dashboard-spec]
---

# Dashboard Architecture Diagram

## Overview

This diagram visualizes the dashboard architecture, showing how the extension determines which dashboard type to display based on operator status, and the data flow for each dashboard implementation.

## Architecture

```nomnoml
#direction: down
#spacing: 40
#padding: 16

[<actor>User] clicks-> [<usecase>Dashboard Menu Item]

[Dashboard Menu Item] triggers-> [<database>ClusterTreeProvider]

[ClusterTreeProvider] calls-> [<abstract>openDashboard()]

[openDashboard()] queries-> [<state>Operator Status]

[Operator Status |
  mode: basic | operated | enabled | degraded
  hasApiKey: boolean
  health: string
]

[Operator Status] - [<choice>Dashboard Type?]

[Dashboard Type?] basic-> [Free Non-Operated Dashboard]
[Dashboard Type?] operated/enabled/degraded-> [Free Operated Dashboard]

[<frame>Free Non-Operated Dashboard |
  [<component>Stats Cards]
  [<component>Charts]
  [<component>Workload Details]
  
  [Stats Cards] <:- [kubectl Queries]
  [Charts] <:- [kubectl Queries]
  [Workload Details] <:- [kubectl Queries]
  
  [kubectl Queries] queries-> [<database>Kubernetes API]
]

[<frame>Free Operated Dashboard |
  [<component>Stats Cards]
  [<component>Conditional Content]
  [<component>Charts]
  [<component>Operator Metrics]
  [<component>Workload Details]
  
  [Stats Cards] <:- [Operator Data Queries]
  [Charts] <:- [Operator Data Queries]
  [Operator Metrics] <:- [Operator Data Queries]
  [Workload Details] <:- [Operator Data Queries]
  
  [Operator Data Queries] queries-> [<database>Operator ConfigMaps]
  [Operator ConfigMaps] stored in-> [Kubernetes API]
  
  [Conditional Content] - [<choice>Has API Key?]
  
  [Has API Key?] yes-> [<component>AI Recommendations Panel]
  [Has API Key?] no-> [<component>Upsell CTA Panel]
  
  [AI Recommendations Panel] fetches-> [AI Recommendations ConfigMap]
  [AI Recommendations ConfigMap] synced from-> [<database>kube9-server]
]

[Free Non-Operated Dashboard] renders in-> [<frame>Webview Panel]
[Free Operated Dashboard] renders in-> [Webview Panel]

[Webview Panel] displays to-> [User]

[Webview Panel] - [<state>Auto Refresh Timer]
[Auto Refresh Timer] triggers every 30s-> [openDashboard()]
```

## Decision Flow

```nomnoml
#direction: down
#spacing: 30
#padding: 16

[<start>User Clicks Dashboard] -> [Check Operator Status]

[Check Operator Status] -> [Query ConfigMap:\nkube9-operator-status\nin kube9-system namespace]

[Query ConfigMap:\nkube9-operator-status\nin kube9-system namespace] ConfigMap not found-> [<state>Status = basic]

[Query ConfigMap:\nkube9-operator-status\nin kube9-system namespace] ConfigMap found-> [Parse Status Data]

[Parse Status Data] -> [Operator Installed?\nCheck mode field]

[Operator Installed?\nCheck mode field] mode: operated-> [<state>Status = operated]
[Operator Installed?\nCheck mode field] mode: enabled-> [<state>Status = enabled]
[Operator Installed?\nCheck mode field] mode: degraded-> [<state>Status = degraded]

[Status = basic] -> [<choice>Render Free Non-Operated Dashboard]

[Status = operated] -> [<choice>Render Free Operated Dashboard]
[Status = enabled] -> [Render Free Operated Dashboard]
[Status = degraded] -> [Render Free Operated Dashboard]

[Render Free Non-Operated Dashboard] -> [Query kubectl directly]
[Query kubectl directly] -> [Display basic statistics]
[Display basic statistics] -> [<end>Show Dashboard]

[Render Free Operated Dashboard] -> [Query Operator ConfigMaps]
[Query Operator ConfigMaps] -> [Check API Key Status]

[Check API Key Status] hasApiKey: true-> [<state>Fetch AI Recommendations]
[Check API Key Status] hasApiKey: false-> [<state>Show Upsell CTA]

[Fetch AI Recommendations] -> [Query kube9-ai-recommendations ConfigMap]
[Query kube9-ai-recommendations ConfigMap] -> [Render AI Panel]

[Show Upsell CTA] -> [Render Upsell Panel]

[Render AI Panel] -> [Display operator statistics + AI]
[Render Upsell Panel] -> [Display operator statistics + CTA]

[Display operator statistics + AI] -> [Show Dashboard]
[Display operator statistics + CTA] -> [Show Dashboard]
```

## Data Flow

```nomnoml
#direction: right
#spacing: 40
#padding: 16

[<frame>Extension Host |
  [<component>ClusterTreeProvider]
  [<component>DashboardManager]
  [<component>KubectlExecutor]
]

[<frame>Webview Process |
  [<component>Dashboard UI]
  [<component>Chart Renderer]
  [<component>Message Handler]
]

[<database>Kubernetes Cluster |
  [kube9-system namespace]
  [All Namespaces]
  [Nodes]
]

[kube9-system namespace] contains-> [<database>kube9-operator-status ConfigMap]
[kube9-system namespace] contains-> [<database>kube9-dashboard-data ConfigMap]
[kube9-system namespace] contains-> [<database>kube9-ai-recommendations ConfigMap]

[DashboardManager] uses-> [KubectlExecutor]
[KubectlExecutor] queries-> [kube9-operator-status ConfigMap]
[KubectlExecutor] queries-> [kube9-dashboard-data ConfigMap]
[KubectlExecutor] queries-> [kube9-ai-recommendations ConfigMap]
[KubectlExecutor] queries-> [All Namespaces]
[KubectlExecutor] queries-> [Nodes]

[DashboardManager] sends data-> [Message Handler]
[Message Handler] updates-> [Dashboard UI]
[Dashboard UI] uses-> [Chart Renderer]

[Dashboard UI] sends messages-> [Message Handler]
[Message Handler] triggers-> [DashboardManager]
```

## Component Relationships

```nomnoml
#direction: down
#spacing: 40
#padding: 16

[<abstract>BaseDashboard |
  + clusterContext: string
  + refreshInterval: Timer
  + loadData()
  + render()
  + handleRefresh()
  + dispose()
]

[<package>FreeNonOperatedDashboard |
  + getNamespaceCount()
  + getWorkloadCounts()
  + getNodeInfo()
  + renderStatsCards()
  + renderCharts()
] extends [BaseDashboard]

[<package>FreeOperatedDashboard |
  + getOperatorStatus()
  + getOperatorDashboardData()
  + fetchAIRecommendations()
  + renderConditionalContent()
  + renderOperatorMetrics()
] extends [BaseDashboard]

[FreeOperatedDashboard] contains [<choice>ConditionalContentRenderer]

[ConditionalContentRenderer] - [AIRecommendationsPanel]
[ConditionalContentRenderer] - [UpsellCTAPanel]
[ConditionalContentRenderer] - [DegradedWarningPanel]

[<abstract>DashboardFactory |
  + createDashboard(operatorStatus)
]

[DashboardFactory] creates [FreeNonOperatedDashboard]
[DashboardFactory] creates [FreeOperatedDashboard]
```

