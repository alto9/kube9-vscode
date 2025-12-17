---
diagram_id: cluster-manager-workflow
name: Cluster Organizer User Workflow
description: User workflow for organizing clusters using folders, aliases, and visibility controls
type: flows
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
feature_id:
  - cluster-manager-webview
  - cluster-folder-organization
  - cluster-alias-management
  - cluster-visibility-control
---

# Cluster Organizer User Workflow

This diagram shows the complete user workflow for managing cluster customizations through the Cluster Organizer webview.

```json
{
  "nodes": [
    {
      "id": "open-manager",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "Open Cluster Organizer",
        "description": "User executes command from palette"
      }
    },
    {
      "id": "view-clusters",
      "type": "default",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "View All Clusters",
        "description": "Webview displays clusters from kubeconfig with current customizations"
      }
    },
    {
      "id": "organize-action",
      "type": "decision",
      "position": { "x": 100, "y": 250 },
      "data": {
        "label": "Choose Organization Action",
        "description": "User decides how to organize"
      }
    },
    {
      "id": "create-folder",
      "type": "default",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "Create Folder",
        "description": "User clicks New Folder button, enters name"
      }
    },
    {
      "id": "move-cluster",
      "type": "default",
      "position": { "x": 200, "y": 350 },
      "data": {
        "label": "Move to Folder",
        "description": "User drags cluster into folder"
      }
    },
    {
      "id": "set-alias",
      "type": "default",
      "position": { "x": 350, "y": 350 },
      "data": {
        "label": "Set Alias",
        "description": "User clicks edit icon, enters friendly name"
      }
    },
    {
      "id": "toggle-visibility",
      "type": "default",
      "position": { "x": 500, "y": 350 },
      "data": {
        "label": "Hide/Show Cluster",
        "description": "User toggles visibility switch"
      }
    },
    {
      "id": "save-config",
      "type": "default",
      "position": { "x": 100, "y": 450 },
      "data": {
        "label": "Save Configuration",
        "description": "Customizations persisted to global state",
        "spec_id": "cluster-customization-storage-spec"
      }
    },
    {
      "id": "refresh-tree",
      "type": "default",
      "position": { "x": 100, "y": 550 },
      "data": {
        "label": "Tree View Updates",
        "description": "Tree provider applies customizations",
        "spec_id": "tree-view-spec"
      }
    },
    {
      "id": "view-organized",
      "type": "default",
      "position": { "x": 100, "y": 650 },
      "data": {
        "label": "View Organized Tree",
        "description": "User sees folders, aliases, hidden clusters in tree view"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "open-manager",
      "target": "view-clusters",
      "label": "command executed",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "view-clusters",
      "target": "organize-action",
      "label": "user reviews",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "organize-action",
      "target": "create-folder",
      "label": "create folder",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "organize-action",
      "target": "move-cluster",
      "label": "organize clusters",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "organize-action",
      "target": "set-alias",
      "label": "rename cluster",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "organize-action",
      "target": "toggle-visibility",
      "label": "hide/show",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "create-folder",
      "target": "save-config",
      "label": "auto-save",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "move-cluster",
      "target": "save-config",
      "label": "auto-save",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "set-alias",
      "target": "save-config",
      "label": "auto-save",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "toggle-visibility",
      "target": "save-config",
      "label": "auto-save",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "save-config",
      "target": "refresh-tree",
      "label": "notify change",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "refresh-tree",
      "target": "view-organized",
      "label": "render update",
      "type": "smoothstep"
    }
  ]
}
```

## Workflow Scenarios

### Scenario 1: Create Folder Structure
```
1. User opens Cluster Organizer
2. Clicks "New Folder" button
3. Enters folder name (e.g., "Production")
4. Folder appears in list
5. Can create nested folders by selecting parent first
6. Changes auto-save to global state
```

### Scenario 2: Move Clusters into Folders
```
1. User views flat list of clusters
2. Drags cluster onto folder
3. Cluster moves into folder (indented in UI)
4. Tree view automatically updates to show hierarchy
5. Can drag clusters between folders
6. Can drag out of folder to ungroup
```

### Scenario 3: Assign Alias Names
```
1. User sees long cluster name (e.g., ARN)
2. Clicks edit icon next to cluster name
3. Enters friendly alias (e.g., "Prod EKS East")
4. Alias displays in both manager and tree view
5. Hover shows original context name in tooltip
6. Can remove alias to restore original name
```

### Scenario 4: Hide Unused Clusters
```
1. User identifies clusters not currently in use
2. Toggles visibility switch to "hidden"
3. Cluster grayed out in manager with "Hidden" badge
4. Cluster removed from tree view
5. Can toggle back to "visible" anytime
6. Hidden clusters still accessible in manager
```

### Scenario 5: Import/Export Configuration
```
1. User clicks "Export" button
2. Configuration downloaded as JSON file
3. User shares with team or backs up
4. To import: clicks "Import" button
5. Selects JSON file
6. Configuration merges with existing customizations
```

## Auto-Save Behavior

All customization changes auto-save immediately:
- No explicit "Save" button required
- Changes persist across VS Code restarts
- Undo/redo not supported (use export/import for backups)
- Failed saves show error notification with retry option

## Real-time Synchronization

Tree view updates automatically when:
- Folders created/renamed/deleted
- Clusters moved between folders
- Aliases added/removed/edited
- Visibility toggled
- Configuration imported

No manual refresh required - changes appear instantly in tree view.







