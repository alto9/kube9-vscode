---
diagram_id: argocd-architecture
feature_id: [argocd-detection, argocd-tree-view, argocd-application-webview, argocd-actions]
actor_id: [gitops-developer]
type: component
---

# ArgoCD Integration Architecture Diagram

## Overview

This diagram visualizes the component architecture for ArgoCD integration in kube9-vscode. It shows the relationships between the ArgoCDService, tree view components, webview panel, command handlers, and their interactions with kubectl and the kube9-operator.

## Diagram

```json
{
  "nodes": [
    {
      "id": "argocd-service",
      "type": "default",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "ArgoCDService",
        "spec_id": "argocd-service-spec",
        "description": "Core service for ArgoCD operations"
      },
      "style": {
        "width": 200,
        "height": 80,
        "backgroundColor": "#4A90E2",
        "color": "#FFFFFF",
        "border": "2px solid #2E5C8A",
        "borderRadius": "8px",
        "fontSize": "14px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "tree-provider",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "ClusterTreeProvider",
        "spec_id": "tree-view-spec",
        "description": "Tree view integration"
      },
      "style": {
        "width": 180,
        "height": 80,
        "backgroundColor": "#7B68EE",
        "color": "#FFFFFF",
        "border": "2px solid #5A4DB3",
        "borderRadius": "8px",
        "fontSize": "14px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "argocd-category",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": {
        "label": "ArgoCDCategory",
        "description": "ArgoCD Applications tree category"
      },
      "style": {
        "width": 180,
        "height": 60,
        "backgroundColor": "#9B8FCC",
        "color": "#FFFFFF",
        "border": "2px solid #7B68EE",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "webview-provider",
      "type": "default",
      "position": { "x": 700, "y": 100 },
      "data": {
        "label": "ArgoCDApplicationWebviewProvider",
        "spec_id": "argocd-webview-spec",
        "description": "Application details webview"
      },
      "style": {
        "width": 220,
        "height": 80,
        "backgroundColor": "#50C878",
        "color": "#FFFFFF",
        "border": "2px solid #3A9B5C",
        "borderRadius": "8px",
        "fontSize": "14px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "webview-panel",
      "type": "default",
      "position": { "x": 700, "y": 250 },
      "data": {
        "label": "Webview Panel",
        "description": "VS Code webview UI"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#7FD9A8",
        "color": "#FFFFFF",
        "border": "2px solid #50C878",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "command-handler",
      "type": "default",
      "position": { "x": 400, "y": 400 },
      "data": {
        "label": "Command Handlers",
        "description": "kube9.argocd.* commands"
      },
      "style": {
        "width": 200,
        "height": 80,
        "backgroundColor": "#FF6B6B",
        "color": "#FFFFFF",
        "border": "2px solid #CC5555",
        "borderRadius": "8px",
        "fontSize": "14px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "operator-status",
      "type": "default",
      "position": { "x": 400, "y": 550 },
      "data": {
        "label": "OperatorStatusClient",
        "spec_id": "operator-status-api-spec",
        "description": "Read operator status"
      },
      "style": {
        "width": 200,
        "height": 70,
        "backgroundColor": "#FFA07A",
        "color": "#FFFFFF",
        "border": "2px solid #E8845C",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "kubectl",
      "type": "default",
      "position": { "x": 100, "y": 550 },
      "data": {
        "label": "KubectlCommands",
        "description": "Execute kubectl operations"
      },
      "style": {
        "width": 180,
        "height": 70,
        "backgroundColor": "#95C8D8",
        "color": "#FFFFFF",
        "border": "2px solid #6FA8B8",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "cache-service",
      "type": "default",
      "position": { "x": 700, "y": 550 },
      "data": {
        "label": "CacheService",
        "description": "Cache detection & app data"
      },
      "style": {
        "width": 180,
        "height": 70,
        "backgroundColor": "#DDA0DD",
        "color": "#FFFFFF",
        "border": "2px solid #B880B8",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "kubernetes-api",
      "type": "default",
      "position": { "x": 100, "y": 700 },
      "data": {
        "label": "Kubernetes API",
        "description": "Cluster API server"
      },
      "style": {
        "width": 180,
        "height": 60,
        "backgroundColor": "#326CE5",
        "color": "#FFFFFF",
        "border": "2px solid #2451B7",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "argocd-crds",
      "type": "default",
      "position": { "x": 400, "y": 700 },
      "data": {
        "label": "ArgoCD CRDs",
        "description": "applications.argoproj.io"
      },
      "style": {
        "width": 200,
        "height": 60,
        "backgroundColor": "#FF8C42",
        "color": "#FFFFFF",
        "border": "2px solid #E07130",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    }
  ],
  "edges": [
    {
      "id": "tree-to-service",
      "source": "tree-provider",
      "target": "argocd-service",
      "label": "queries",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#4A90E2", "strokeWidth": 2 }
    },
    {
      "id": "tree-to-category",
      "source": "tree-provider",
      "target": "argocd-category",
      "label": "displays",
      "type": "smoothstep",
      "style": { "stroke": "#7B68EE", "strokeWidth": 2 }
    },
    {
      "id": "category-to-webview",
      "source": "argocd-category",
      "target": "webview-provider",
      "label": "opens on click",
      "type": "smoothstep",
      "style": { "stroke": "#50C878", "strokeWidth": 2 }
    },
    {
      "id": "webview-to-panel",
      "source": "webview-provider",
      "target": "webview-panel",
      "label": "manages",
      "type": "smoothstep",
      "style": { "stroke": "#50C878", "strokeWidth": 2 }
    },
    {
      "id": "webview-to-service",
      "source": "webview-provider",
      "target": "argocd-service",
      "label": "loads data",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#4A90E2", "strokeWidth": 2 }
    },
    {
      "id": "webview-to-commands",
      "source": "webview-panel",
      "target": "command-handler",
      "label": "triggers actions",
      "type": "smoothstep",
      "style": { "stroke": "#FF6B6B", "strokeWidth": 2 }
    },
    {
      "id": "category-to-commands",
      "source": "argocd-category",
      "target": "command-handler",
      "label": "context menu",
      "type": "smoothstep",
      "style": { "stroke": "#FF6B6B", "strokeWidth": 2 }
    },
    {
      "id": "commands-to-service",
      "source": "command-handler",
      "target": "argocd-service",
      "label": "executes",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#4A90E2", "strokeWidth": 2 }
    },
    {
      "id": "service-to-operator",
      "source": "argocd-service",
      "target": "operator-status",
      "label": "detection (operated mode)",
      "type": "smoothstep",
      "style": { "stroke": "#FFA07A", "strokeWidth": 2 }
    },
    {
      "id": "service-to-kubectl",
      "source": "argocd-service",
      "target": "kubectl",
      "label": "queries & patches",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#95C8D8", "strokeWidth": 3 }
    },
    {
      "id": "service-to-cache",
      "source": "argocd-service",
      "target": "cache-service",
      "label": "stores/retrieves",
      "type": "smoothstep",
      "style": { "stroke": "#DDA0DD", "strokeWidth": 2 }
    },
    {
      "id": "kubectl-to-k8s",
      "source": "kubectl",
      "target": "kubernetes-api",
      "label": "kubectl commands",
      "type": "smoothstep",
      "style": { "stroke": "#326CE5", "strokeWidth": 3 }
    },
    {
      "id": "k8s-to-crds",
      "source": "kubernetes-api",
      "target": "argocd-crds",
      "label": "manages",
      "type": "smoothstep",
      "style": { "stroke": "#FF8C42", "strokeWidth": 2 }
    }
  ]
}
```

## Component Descriptions

### ArgoCDService
**Responsibility**: Central service managing all ArgoCD operations including detection, querying applications, parsing CRD data, and executing actions (sync, refresh, hard refresh).

**Key Methods**:
- `isInstalled()` - Detect ArgoCD presence
- `getApplications()` - Query all applications
- `getApplication()` - Get single application
- `syncApplication()` - Trigger sync
- `refreshApplication()` - Refresh state
- `hardRefreshApplication()` - Hard refresh

### ClusterTreeProvider
**Responsibility**: Main tree view data provider showing clusters and resource categories, including ArgoCD Applications category when ArgoCD is detected.

**Integration**: Queries ArgoCDService to determine if ArgoCD category should be shown and to load application list.

### ArgoCDCategory
**Responsibility**: Tree category displaying ArgoCD Applications with application count badge. Shows applications with sync/health status icons.

**Behavior**: 
- Appears when ArgoCD detected
- Shows application count badge
- Context menu for actions
- Opens webview on click

### ArgoCDApplicationWebviewProvider
**Responsibility**: Creates and manages webview panels for displaying application details.

**Features**:
- Overview tab (metadata, status, source)
- Drift Details tab (resource-level sync status)
- Action buttons (sync, refresh, hard refresh)
- Navigation to tree view

### Command Handlers
**Commands**:
- `kube9.argocd.sync` - Sync application
- `kube9.argocd.refresh` - Refresh application
- `kube9.argocd.hardRefresh` - Hard refresh
- `kube9.argocd.viewDetails` - Open webview

### OperatorStatusClient
**Responsibility**: Reads operator status ConfigMap to get ArgoCD detection info in operated mode.

**Data**: `operatorStatus.argocd` field containing detected, namespace, version

### KubectlCommands
**Responsibility**: Executes all kubectl operations for querying CRDs and patching applications.

**Operations**:
- Query ArgoCD CRDs
- Patch applications for sync/refresh
- Query operator status ConfigMap

### CacheService
**Responsibility**: Caches detection status (5 min) and application lists (30 sec) for performance.

**Benefits**: Reduces kubectl calls, improves responsiveness, provides fallback on errors

### Kubernetes API
**External System**: Cluster API server that kubectl communicates with.

### ArgoCD CRDs
**External Resources**: ArgoCD Application CRDs managed by ArgoCD controller. Extension queries and patches these CRDs via kubectl.

## Data Flow Summary

1. **Detection**: Service → Operator Status OR Service → kubectl → K8s API → ArgoCD CRDs
2. **Query Applications**: Tree/Webview → Service → kubectl → K8s API → ArgoCD CRDs
3. **Display**: Service → (cache) → Tree Provider → ArgoCD Category
4. **Actions**: Category/Webview → Commands → Service → kubectl → K8s API (patch CRD)
5. **Details**: Tree → Webview Provider → Service → Application Data → Webview Panel

## Key Design Patterns

- **Service Layer**: ArgoCDService encapsulates all ArgoCD logic
- **Dual Mode**: Operates in both operated mode (operator status) and basic mode (direct CRD)
- **Caching**: Multi-tier caching for performance
- **Event-Driven**: Tree and webview react to application status changes
- **Command Pattern**: Actions implemented as VS Code commands

