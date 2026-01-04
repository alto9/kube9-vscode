---
diagram_id: cluster-manager-architecture
name: Cluster Organizer Architecture
description: Architecture for the Cluster Organizer webview that enables cluster organization, hiding, and aliasing
type: components
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
feature_id:
  - cluster-manager-webview
---

# Cluster Organizer Architecture

This diagram shows the component architecture for the Cluster Organizer, which provides a webview interface for organizing, hiding, and aliasing clusters.

```json
{
  "nodes": [
    {
      "id": "user",
      "type": "actor",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "User managing cluster organization"
      }
    },
    {
      "id": "command-palette",
      "type": "interface",
      "position": { "x": 50, "y": 150 },
      "data": {
        "label": "Command Palette",
        "description": "VS Code command: Kube9: Cluster Organizer"
      }
    },
    {
      "id": "cluster-manager-command",
      "type": "component",
      "position": { "x": 50, "y": 250 },
      "data": {
        "label": "ClusterManagerCommand",
        "description": "Command handler that opens webview",
        "spec_id": "cluster-manager-webview-spec"
      }
    },
    {
      "id": "cluster-manager-webview",
      "type": "component",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "ClusterManagerWebview",
        "description": "React webview for managing clusters",
        "spec_id": "cluster-manager-webview-spec"
      }
    },
    {
      "id": "customization-service",
      "type": "component",
      "position": { "x": 300, "y": 250 },
      "data": {
        "label": "ClusterCustomizationService",
        "description": "Manages cluster customizations (folders, aliases, visibility)",
        "spec_id": "cluster-customization-storage-spec"
      }
    },
    {
      "id": "kubeconfig-service",
      "type": "component",
      "position": { "x": 300, "y": 150 },
      "data": {
        "label": "KubeconfigService",
        "description": "Reads clusters from kubeconfig",
        "spec_id": "kubectl-context-operations-spec"
      }
    },
    {
      "id": "tree-provider",
      "type": "component",
      "position": { "x": 550, "y": 250 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Renders tree view with customizations",
        "spec_id": "tree-view-spec"
      }
    },
    {
      "id": "global-state",
      "type": "data",
      "position": { "x": 300, "y": 400 },
      "data": {
        "label": "VS Code Global State",
        "description": "Persists customization configuration",
        "spec_id": "cluster-customization-storage-spec"
      }
    },
    {
      "id": "kubeconfig",
      "type": "data",
      "position": { "x": 550, "y": 150 },
      "data": {
        "label": "kubeconfig File",
        "description": "Source of truth for available clusters"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user",
      "target": "command-palette",
      "label": "executes Kube9: Cluster Organizer",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "command-palette",
      "target": "cluster-manager-command",
      "label": "triggers",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "cluster-manager-command",
      "target": "cluster-manager-webview",
      "label": "opens",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "cluster-manager-webview",
      "target": "customization-service",
      "label": "get/update customizations",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "customization-service",
      "target": "global-state",
      "label": "read/write",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "kubeconfig-service",
      "target": "kubeconfig",
      "label": "parses",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "cluster-manager-webview",
      "target": "kubeconfig-service",
      "label": "list all clusters",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "customization-service",
      "target": "tree-provider",
      "label": "notifies on change",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "tree-provider",
      "target": "customization-service",
      "label": "applies customizations",
      "type": "smoothstep"
    }
  ]
}
```

## Component Interactions

### Opening Cluster Organizer
```
1. User executes "Kube9: Cluster Organizer" command
2. ClusterManagerCommand creates/shows ClusterManagerWebview
3. Webview requests cluster list from KubeconfigService
4. Webview requests customizations from ClusterCustomizationService
5. Webview displays organized clusters with folders, aliases, visibility
```

### Updating Customizations
```
1. User modifies cluster organization in webview (drag-drop, rename, hide/show)
2. Webview sends update to ClusterCustomizationService
3. ClusterCustomizationService validates and persists to Global State
4. ClusterCustomizationService notifies ClusterTreeProvider
5. ClusterTreeProvider refreshes to show updated organization
```

### Tree View Integration
```
1. ClusterTreeProvider requests customizations on startup
2. ClusterCustomizationService loads from Global State
3. Tree Provider applies folders, aliases, visibility to tree items
4. Tree shows organized structure matching customizations
5. On kubeconfig changes, tree merges new clusters with existing customizations
```

## Data Flow

### Customization Configuration Structure
```json
{
  "version": "1.0",
  "folders": [
    {
      "id": "folder-1",
      "name": "Production",
      "parentId": null,
      "order": 0
    }
  ],
  "clusters": {
    "arn:aws:eks:us-east-1:123:cluster/prod": {
      "alias": "Prod EKS East",
      "hidden": false,
      "folderId": "folder-1",
      "order": 0
    }
  }
}
```

## Key Design Decisions

### Installation-Wide Configuration
- Customizations stored in VS Code Global State (not Workspace State)
- Configuration applies across all workspaces
- Survives workspace changes and extension updates

### Source of Truth Pattern
- kubeconfig is source of truth for available clusters
- Customizations overlay on top of kubeconfig data
- Missing clusters handled gracefully (marked as inactive)
- New clusters auto-added with default customizations

### Real-time Synchronization
- Webview subscribes to customization changes
- Tree provider subscribes to customization changes
- Both stay synchronized via ClusterCustomizationService events








