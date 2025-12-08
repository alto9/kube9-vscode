---
diagram_id: tree-view-architecture
feature_id: [tree-view-navigation]
actor_id: [developer, vscode-extension, kubernetes-cluster]
---

# Tree View Architecture Diagram

## Overview

This diagram visualizes the tree view architecture, showing how the ClusterTreeProvider builds the hierarchical structure and interacts with Kubernetes via kubectl. Element-level spec linkages connect components to their technical specifications.

## Architecture

```json
{
  "nodes": [
    {
      "id": "developer",
      "type": "actor",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "User interacting with tree view"
      }
    },
    {
      "id": "vscode-api",
      "type": "interface",
      "position": { "x": 50, "y": 150 },
      "data": {
        "label": "VS Code TreeView API",
        "description": "VS Code extension API for tree views"
      }
    },
    {
      "id": "cluster-tree-provider",
      "type": "component",
      "position": { "x": 50, "y": 250 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Main tree data provider",
        "spec_id": "tree-view-spec"
      }
    },
    {
      "id": "operator-status-client",
      "type": "component",
      "position": { "x": 300, "y": 250 },
      "data": {
        "label": "OperatorStatusClient",
        "description": "Queries operator status with caching",
        "spec_id": "operator-status-api-spec"
      }
    },
    {
      "id": "tree-item-factory",
      "type": "component",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "TreeItemFactory",
        "description": "Creates tree items for resources"
      }
    },
    {
      "id": "category-nodes",
      "type": "group",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "Category Nodes",
        "children": ["dashboard-category", "reports-category", "nodes-category", "namespaces-category", "workloads-category", "storage-category", "networking-category", "helm-category", "configuration-category", "custom-resources-category"]
      }
    },
    {
      "id": "dashboard-category",
      "type": "component",
      "position": { "x": 70, "y": 480 },
      "data": {
        "label": "Dashboard",
        "description": "Always visible, first item",
        "spec_id": "dashboard-webview-spec"
      }
    },
    {
      "id": "reports-category",
      "type": "component",
      "position": { "x": 70, "y": 520 },
      "data": {
        "label": "Reports",
        "description": "Conditional: shown when operator installed",
        "spec_id": "operator-status-api-spec"
      }
    },
    {
      "id": "nodes-category",
      "type": "component",
      "position": { "x": 70, "y": 560 },
      "data": {
        "label": "Nodes Category",
        "description": "Lists cluster nodes"
      }
    },
    {
      "id": "namespaces-category",
      "type": "component",
      "position": { "x": 70, "y": 600 },
      "data": {
        "label": "Namespaces Category",
        "description": "Lists namespaces with active indicator"
      }
    },
    {
      "id": "workloads-category",
      "type": "component",
      "position": { "x": 70, "y": 640 },
      "data": {
        "label": "Workloads Category",
        "description": "Deployments, StatefulSets, DaemonSets, CronJobs"
      }
    },
    {
      "id": "storage-category",
      "type": "component",
      "position": { "x": 70, "y": 680 },
      "data": {
        "label": "Storage Category",
        "description": "PV, PVC, StorageClasses"
      }
    },
    {
      "id": "networking-category",
      "type": "component",
      "position": { "x": 70, "y": 720 },
      "data": {
        "label": "Networking Category",
        "description": "Services",
        "spec_id": "services-spec"
      }
    },
    {
      "id": "helm-category",
      "type": "component",
      "position": { "x": 70, "y": 760 },
      "data": {
        "label": "Helm Category",
        "description": "Helm releases"
      }
    },
    {
      "id": "configuration-category",
      "type": "component",
      "position": { "x": 70, "y": 800 },
      "data": {
        "label": "Configuration Category",
        "description": "ConfigMaps, Secrets"
      }
    },
    {
      "id": "custom-resources-category",
      "type": "component",
      "position": { "x": 70, "y": 840 },
      "data": {
        "label": "Custom Resources",
        "description": "CRDs"
      }
    },
    {
      "id": "kubectl",
      "type": "external",
      "position": { "x": 350, "y": 450 },
      "data": {
        "label": "kubectl CLI",
        "description": "Kubernetes command-line tool"
      }
    },
    {
      "id": "kubernetes-api",
      "type": "external",
      "position": { "x": 350, "y": 550 },
      "data": {
        "label": "Kubernetes API",
        "description": "Cluster API server"
      }
    },
    {
      "id": "operator-configmap",
      "type": "data",
      "position": { "x": 550, "y": 250 },
      "data": {
        "label": "kube9-operator-status ConfigMap",
        "description": "Operator status and mode",
        "spec_id": "operator-status-api-spec"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "developer",
      "target": "vscode-api",
      "label": "interacts with"
    },
    {
      "id": "e2",
      "source": "vscode-api",
      "target": "cluster-tree-provider",
      "label": "requests children"
    },
    {
      "id": "e3",
      "source": "cluster-tree-provider",
      "target": "operator-status-client",
      "label": "queries status"
    },
    {
      "id": "e4",
      "source": "operator-status-client",
      "target": "kubectl",
      "label": "get ConfigMap"
    },
    {
      "id": "e5",
      "source": "kubectl",
      "target": "kubernetes-api",
      "label": "HTTP request"
    },
    {
      "id": "e6",
      "source": "kubernetes-api",
      "target": "operator-configmap",
      "label": "retrieves"
    },
    {
      "id": "e7",
      "source": "cluster-tree-provider",
      "target": "tree-item-factory",
      "label": "creates items"
    },
    {
      "id": "e8",
      "source": "tree-item-factory",
      "target": "category-nodes",
      "label": "builds hierarchy"
    },
    {
      "id": "e9",
      "source": "cluster-tree-provider",
      "target": "kubectl",
      "label": "list resources"
    }
  ]
}
```

## Key Architectural Decisions

### Conditional Reports Display
- **Decision**: Reports category appears only when `operatorStatus !== OperatorStatusMode.Basic`
- **Implementation**: `ClusterTreeProvider.getCategories()` checks operator status before building category list
- **Rationale**: Reports require operator data; showing without operator would confuse users
- **Spec**: Linked to `operator-status-api-spec` on reports-category node

### Dashboard Always First
- **Decision**: Dashboard appears as first category item for all clusters
- **Implementation**: Dashboard prepended to category array before any conditional categories
- **Rationale**: Provides consistent entry point for cluster overview regardless of tier
- **Spec**: Linked to `dashboard-webview-spec` on dashboard-category node

### Operator Status Caching
- **Decision**: Cache operator status for 5 minutes (300,000ms)
- **Implementation**: `OperatorStatusClient` maintains in-memory cache with timestamp
- **Rationale**: Minimizes kubectl calls while keeping status reasonably fresh
- **Spec**: Linked to `operator-status-api-spec` on operator-status-client node

### Lazy Loading
- **Decision**: Load tree children only when parent expanded
- **Implementation**: `getChildren()` called by VS Code on expand
- **Rationale**: Reduces initial load time and unnecessary API calls

## Component Interactions

### Startup Flow
```
1. Extension activates
2. ClusterTreeProvider registered with VS Code
3. ClusterTreeProvider.getClusters() called
4. For each cluster:
   a. Query operator status (OperatorStatusClient)
   b. Cache result for 5 minutes
   c. Build cluster tree item with operatorStatus
5. Tree rendered with clusters
```

### Expansion Flow
```
1. User clicks to expand cluster
2. VS Code calls getChildren(clusterItem)
3. ClusterTreeProvider.getCategories(clusterItem)
4. Checks clusterItem.operatorStatus
5. If Basic: Build categories without Reports
6. If Not Basic: Prepend Reports to categories
7. Prepend Dashboard to all categories
8. Return category array to VS Code
9. Tree updates with categories
```

### Reports Visibility Logic
```typescript
// In ClusterTreeProvider.getCategories()
const categories = [
  createNodesCategory(),
  createNamespacesCategory(),
  // ... other categories
];

if (clusterElement.operatorStatus !== OperatorStatusMode.Basic) {
  return [
    createDashboardCategory(),
    createReportsCategory(),  // Only added when operator present
    ...categories
  ];
}

return [
  createDashboardCategory(),
  ...categories
];
```

## Spec Linkages

This diagram uses element-level spec linkages via `node.data.spec_id`:

- **cluster-tree-provider** → `tree-view-spec` (main specification)
- **operator-status-client** → `operator-status-api-spec` (operator status query spec)
- **dashboard-category** → `dashboard-webview-spec` (dashboard rendering spec)
- **reports-category** → `operator-status-api-spec` (conditional display logic)
- **networking-category** → `services-spec` (services implementation)
- **operator-configmap** → `operator-status-api-spec` (data structure spec)

These linkages ensure each component can be traced to its technical implementation specification.

