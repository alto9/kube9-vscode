---
diagram_id: argocd-data-flow
feature_id: [argocd-detection, argocd-tree-view, argocd-application-webview, argocd-actions]
actor_id: [gitops-developer]
type: flow
---

# ArgoCD Data Flow Diagram

## Overview

This diagram visualizes the data flow for ArgoCD integration in kube9-vscode, showing how data moves from ArgoCD CRDs through kubectl queries, parsing and transformation in the service layer, caching, and finally to the UI (tree view and webview). It also shows the flow for sync actions from UI back to cluster.

## Diagram

```json
{
  "nodes": [
    {
      "id": "argocd-crds",
      "type": "input",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "ArgoCD Application CRDs",
        "description": "Source of truth in cluster"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#FF8C42",
        "color": "#FFFFFF",
        "border": "2px solid #E07130",
        "borderRadius": "8px",
        "fontSize": "14px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "kubectl-query",
      "type": "default",
      "position": { "x": 50, "y": 180 },
      "data": {
        "label": "kubectl get applications",
        "description": "Query CRDs with JSON output"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#95C8D8",
        "color": "#FFFFFF",
        "border": "2px solid #6FA8B8",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "raw-json",
      "type": "default",
      "position": { "x": 50, "y": 310 },
      "data": {
        "label": "Raw CRD JSON",
        "description": "status.sync, status.health, etc."
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#D3D3D3",
        "color": "#333333",
        "border": "2px solid #A9A9A9",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "parse-transform",
      "type": "default",
      "position": { "x": 350, "y": 310 },
      "data": {
        "label": "Parse & Transform",
        "spec_id": "argocd-service-spec",
        "description": "ArgoCDService.parseApplication()"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#4A90E2",
        "color": "#FFFFFF",
        "border": "2px solid #2E5C8A",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "typed-data",
      "type": "default",
      "position": { "x": 650, "y": 310 },
      "data": {
        "label": "Typed Application Data",
        "spec_id": "argocd-status-spec",
        "description": "ArgoCDApplication interface"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#7B68EE",
        "color": "#FFFFFF",
        "border": "2px solid #5A4DB3",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "cache-layer",
      "type": "default",
      "position": { "x": 650, "y": 180 },
      "data": {
        "label": "Cache Layer",
        "description": "30-second TTL"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#DDA0DD",
        "color": "#FFFFFF",
        "border": "2px solid #B880B8",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "tree-display",
      "type": "default",
      "position": { "x": 950, "y": 180 },
      "data": {
        "label": "Tree View Display",
        "description": "Application items with icons"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#50C878",
        "color": "#FFFFFF",
        "border": "2px solid #3A9B5C",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "webview-display",
      "type": "default",
      "position": { "x": 950, "y": 310 },
      "data": {
        "label": "Webview Display",
        "description": "Detailed app information"
      },
      "style": {
        "width": 220,
        "height": 70,
        "backgroundColor": "#50C878",
        "color": "#FFFFFF",
        "border": "2px solid #3A9B5C",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "sync-action",
      "type": "default",
      "position": { "x": 950, "y": 450 },
      "data": {
        "label": "Sync Action",
        "description": "User triggers sync"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#FF6B6B",
        "color": "#FFFFFF",
        "border": "2px solid #CC5555",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "kubectl-patch",
      "type": "default",
      "position": { "x": 650, "y": 450 },
      "data": {
        "label": "kubectl patch",
        "description": "Add refresh annotation"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#95C8D8",
        "color": "#FFFFFF",
        "border": "2px solid #6FA8B8",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "argocd-controller",
      "type": "default",
      "position": { "x": 350, "y": 450 },
      "data": {
        "label": "ArgoCD Controller",
        "description": "Detects annotation, syncs"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#FF8C42",
        "color": "#FFFFFF",
        "border": "2px solid #E07130",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "git-repo",
      "type": "input",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "Git Repository",
        "description": "Source of truth for desired state"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#333333",
        "color": "#FFFFFF",
        "border": "2px solid #1A1A1A",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "poll-status",
      "type": "default",
      "position": { "x": 350, "y": 180 },
      "data": {
        "label": "Poll Operation Status",
        "description": "Check status.operationState"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#4A90E2",
        "color": "#FFFFFF",
        "border": "2px solid #2E5C8A",
        "borderRadius": "8px",
        "fontSize": "12px"
      }
    },
    {
      "id": "status-update",
      "type": "output",
      "position": { "x": 950, "y": 50 },
      "data": {
        "label": "Status Update",
        "description": "Refresh tree & webview"
      },
      "style": {
        "width": 220,
        "height": 60,
        "backgroundColor": "#50C878",
        "color": "#FFFFFF",
        "border": "2px solid #3A9B5C",
        "borderRadius": "8px",
        "fontSize": "12px",
        "fontWeight": "bold"
      }
    }
  ],
  "edges": [
    {
      "id": "crds-to-query",
      "source": "argocd-crds",
      "target": "kubectl-query",
      "label": "read",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#95C8D8", "strokeWidth": 3 }
    },
    {
      "id": "query-to-json",
      "source": "kubectl-query",
      "target": "raw-json",
      "label": "returns",
      "type": "smoothstep",
      "style": { "stroke": "#D3D3D3", "strokeWidth": 2 }
    },
    {
      "id": "json-to-parse",
      "source": "raw-json",
      "target": "parse-transform",
      "label": "parse",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#4A90E2", "strokeWidth": 3 }
    },
    {
      "id": "parse-to-typed",
      "source": "parse-transform",
      "target": "typed-data",
      "label": "transform",
      "type": "smoothstep",
      "style": { "stroke": "#7B68EE", "strokeWidth": 2 }
    },
    {
      "id": "typed-to-cache",
      "source": "typed-data",
      "target": "cache-layer",
      "label": "store (30s)",
      "type": "smoothstep",
      "style": { "stroke": "#DDA0DD", "strokeWidth": 2 }
    },
    {
      "id": "cache-to-tree",
      "source": "cache-layer",
      "target": "tree-display",
      "label": "display",
      "type": "smoothstep",
      "style": { "stroke": "#50C878", "strokeWidth": 2 }
    },
    {
      "id": "typed-to-webview",
      "source": "typed-data",
      "target": "webview-display",
      "label": "display",
      "type": "smoothstep",
      "style": { "stroke": "#50C878", "strokeWidth": 2 }
    },
    {
      "id": "webview-to-action",
      "source": "webview-display",
      "target": "sync-action",
      "label": "user clicks sync",
      "type": "smoothstep",
      "style": { "stroke": "#FF6B6B", "strokeWidth": 2 }
    },
    {
      "id": "tree-to-action",
      "source": "tree-display",
      "target": "sync-action",
      "label": "context menu",
      "type": "smoothstep",
      "style": { "stroke": "#FF6B6B", "strokeWidth": 2 }
    },
    {
      "id": "action-to-patch",
      "source": "sync-action",
      "target": "kubectl-patch",
      "label": "execute",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#95C8D8", "strokeWidth": 3 }
    },
    {
      "id": "patch-to-crds",
      "source": "kubectl-patch",
      "target": "argocd-crds",
      "label": "add annotation",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#FF8C42", "strokeWidth": 3 }
    },
    {
      "id": "crds-to-controller",
      "source": "argocd-crds",
      "target": "argocd-controller",
      "label": "watch",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#FF8C42", "strokeWidth": 2 }
    },
    {
      "id": "git-to-controller",
      "source": "git-repo",
      "target": "argocd-controller",
      "label": "fetch manifests",
      "type": "smoothstep",
      "style": { "stroke": "#333333", "strokeWidth": 2 }
    },
    {
      "id": "controller-to-crds",
      "source": "argocd-controller",
      "target": "argocd-crds",
      "label": "apply & update status",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#FF8C42", "strokeWidth": 3 }
    },
    {
      "id": "poll-from-service",
      "source": "parse-transform",
      "target": "poll-status",
      "label": "poll every 2s",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#4A90E2", "strokeWidth": 2, "strokeDasharray": "5,5" }
    },
    {
      "id": "poll-to-query",
      "source": "poll-status",
      "target": "kubectl-query",
      "label": "query status",
      "type": "smoothstep",
      "style": { "stroke": "#95C8D8", "strokeWidth": 2, "strokeDasharray": "5,5" }
    },
    {
      "id": "cache-to-update",
      "source": "cache-layer",
      "target": "status-update",
      "label": "on complete",
      "type": "smoothstep",
      "style": { "stroke": "#50C878", "strokeWidth": 2 }
    }
  ]
}
```

## Data Flow Descriptions

### Query Flow (Read Path)

**1. Query ArgoCD CRDs**
- User expands ArgoCD Applications category in tree
- Service executes: `kubectl get applications.argoproj.io -n argocd -o json`
- Returns raw CRD JSON data

**2. Parse & Transform**
- ArgoCDService receives raw JSON
- Calls `parseApplication()` for each CRD
- Extracts relevant fields: metadata, sync status, health status, resources
- Transforms into `ArgoCDApplication` TypeScript interfaces

**3. Cache Layer**
- Parsed application data stored in cache
- TTL: 30 seconds for application lists
- Key: `argocd:applications:${context}`
- On subsequent queries, return cached data if valid

**4. Display in UI**
- **Tree View**: Shows application list with icons based on sync/health status
- **Webview**: Displays detailed application information across tabs
- Both consume cached data for performance

### Sync Flow (Write Path)

**1. User Triggers Sync**
- User clicks "Sync" in tree context menu or webview
- Command handler receives action
- Calls `ArgoCDService.syncApplication()`

**2. Patch Application CRD**
- Service executes: `kubectl patch application.argoproj.io/<name> --type=merge -p='{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'`
- Adds refresh annotation to Application CRD
- kubectl patches the CRD in cluster

**3. ArgoCD Controller Responds**
- ArgoCD controller watches for annotation changes
- Detects refresh annotation on Application
- Fetches manifests from Git repository
- Compares Git state with cluster state
- Applies changes to cluster resources
- Updates Application CRD status fields

**4. Poll Operation Status**
- Extension polls application status every 2 seconds
- Queries: `kubectl get application.argoproj.io/<name> -o json`
- Checks `status.operationState.phase`
- Continues until phase is "Succeeded" or "Failed"

**5. Update UI**
- When operation completes, invalidate cache
- Re-query application data
- Update tree view (new icon, description)
- Update webview (new status information)
- Show notification to user

## Data Structures at Each Stage

### Raw CRD JSON
```json
{
  "metadata": { "name": "guestbook", "namespace": "argocd" },
  "spec": {
    "source": { "repoURL": "...", "path": "guestbook", "targetRevision": "main" },
    "destination": { "server": "...", "namespace": "default" }
  },
  "status": {
    "sync": { "status": "Synced", "revision": "abc123..." },
    "health": { "status": "Healthy" },
    "resources": [...]
  }
}
```

### Typed Application Data
```typescript
{
  name: "guestbook",
  namespace: "argocd",
  project: "default",
  syncStatus: {
    status: "Synced",
    revision: "abc123...",
    comparedTo: { source: {...} }
  },
  healthStatus: {
    status: "Healthy"
  },
  resources: [...],
  source: {...},
  destination: {...}
}
```

### Tree Display Data
```typescript
{
  label: "guestbook",
  description: "Synced, Healthy",
  icon: "check-circle-green",
  tooltip: "Name: guestbook\nSync: Synced\nHealth: Healthy",
  contextValue: "argocd-application"
}
```

## Caching Strategy

### Detection Cache
- **Key**: `argocd:detection:${context}`
- **TTL**: 5 minutes
- **Data**: `ArgoCDInstallationStatus`
- **Invalidation**: Manual tree refresh

### Application List Cache
- **Key**: `argocd:applications:${context}`
- **TTL**: 30 seconds
- **Data**: `ArgoCDApplication[]`
- **Invalidation**: Manual refresh, sync completion

## Performance Optimizations

1. **Cache First**: Always check cache before kubectl queries
2. **Batch Queries**: Single kubectl call returns all applications
3. **Lazy Loading**: Only query when category expanded
4. **Debounced Polling**: 2-second intervals to avoid excessive queries
5. **Smart Invalidation**: Only invalidate cache when necessary (sync complete, manual refresh)

## Error Handling Flow

**Query Errors**:
- kubectl fails → Check cache → Return cached data OR empty array
- RBAC denied → Show permission error → Don't cache
- Network timeout → Use cached data → Log error

**Sync Errors**:
- kubectl patch fails → Show error notification → Don't update UI
- Operation timeout → Stop polling → Show timeout message → Operation continues in ArgoCD
- Controller error → Poll detects failed phase → Show error from operationState.message

## Key Timing Parameters

- **Cache TTL (Detection)**: 5 minutes
- **Cache TTL (Applications)**: 30 seconds
- **Poll Interval (Operations)**: 2 seconds
- **Operation Timeout**: 5 minutes
- **Tree Refresh**: On-demand (manual refresh or sync completion)

