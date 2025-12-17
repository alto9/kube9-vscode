---
diagram_id: tree-view-error-display
name: Tree View Error Display
description: Architecture for displaying errors within the tree view with graceful degradation
type: components
spec_id:
  - tree-view-error-display
feature_id:
  - error-ux-improvements
---

# Tree View Error Display

This diagram shows how errors are displayed within the tree view, including error items, context menus, and graceful degradation when some resources fail to load.

```json
{
  "nodes": [
    {
      "id": "tree-provider",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Main tree data provider"
      }
    },
    {
      "id": "get-children",
      "type": "default",
      "position": { "x": 100, "y": 220 },
      "data": {
        "label": "getChildren()",
        "description": "Load tree items"
      }
    },
    {
      "id": "try-load",
      "type": "default",
      "position": { "x": 100, "y": 340 },
      "data": {
        "label": "Try Load Resources",
        "description": "Attempt to fetch resources"
      }
    },
    {
      "id": "success",
      "type": "default",
      "position": { "x": 350, "y": 460 },
      "data": {
        "label": "Success",
        "description": "Resources loaded"
      }
    },
    {
      "id": "error",
      "type": "default",
      "position": { "x": -150, "y": 460 },
      "data": {
        "label": "Error Caught",
        "description": "Exception during load"
      }
    },
    {
      "id": "categorize-error",
      "type": "default",
      "position": { "x": -150, "y": 580 },
      "data": {
        "label": "Categorize Error",
        "description": "Determine error type"
      }
    },
    {
      "id": "create-error-item",
      "type": "default",
      "position": { "x": -150, "y": 700 },
      "data": {
        "label": "Create ErrorTreeItem",
        "description": "Build error display item"
      }
    },
    {
      "id": "error-tree-item",
      "type": "default",
      "position": { "x": -150, "y": 820 },
      "data": {
        "label": "ErrorTreeItem",
        "description": "Tree item with error icon and message"
      }
    },
    {
      "id": "return-items",
      "type": "default",
      "position": { "x": 100, "y": 940 },
      "data": {
        "label": "Return Items",
        "description": "Mix of success and error items"
      }
    },
    {
      "id": "tree-view",
      "type": "default",
      "position": { "x": 100, "y": 1060 },
      "data": {
        "label": "Tree View UI",
        "description": "VS Code tree view display"
      }
    },
    {
      "id": "user-sees",
      "type": "default",
      "position": { "x": 100, "y": 1180 },
      "data": {
        "label": "User Sees Tree",
        "description": "Normal items + error items"
      }
    },
    {
      "id": "right-click",
      "type": "default",
      "position": { "x": 100, "y": 1300 },
      "data": {
        "label": "Right-Click Error Item",
        "description": "User opens context menu"
      }
    },
    {
      "id": "context-menu",
      "type": "default",
      "position": { "x": 100, "y": 1420 },
      "data": {
        "label": "Context Menu",
        "description": "Show error actions"
      }
    },
    {
      "id": "retry",
      "type": "default",
      "position": { "x": -200, "y": 1540 },
      "data": {
        "label": "Retry",
        "description": "Execute retry callback"
      }
    },
    {
      "id": "view-details",
      "type": "default",
      "position": { "x": 100, "y": 1540 },
      "data": {
        "label": "View Details",
        "description": "Open Output Panel"
      }
    },
    {
      "id": "copy-details",
      "type": "default",
      "position": { "x": 400, "y": 1540 },
      "data": {
        "label": "Copy Details",
        "description": "Copy to clipboard"
      }
    },
    {
      "id": "refresh-tree",
      "type": "default",
      "position": { "x": -200, "y": 1660 },
      "data": {
        "label": "Refresh Tree Item",
        "description": "Fire tree data change event"
      }
    },
    {
      "id": "output-panel",
      "type": "default",
      "position": { "x": 100, "y": 1660 },
      "data": {
        "label": "Output Panel",
        "description": "Show detailed logs"
      }
    },
    {
      "id": "clipboard",
      "type": "default",
      "position": { "x": 400, "y": 1660 },
      "data": {
        "label": "Clipboard",
        "description": "Error details copied"
      }
    },
    {
      "id": "graceful-loader",
      "type": "default",
      "position": { "x": 600, "y": 340 },
      "data": {
        "label": "Graceful Degradation",
        "description": "Load what we can"
      }
    },
    {
      "id": "multiple-loaders",
      "type": "default",
      "position": { "x": 600, "y": 460 },
      "data": {
        "label": "Multiple Loaders",
        "description": "Load different resource types"
      }
    },
    {
      "id": "loader-1",
      "type": "default",
      "position": { "x": 600, "y": 580 },
      "data": {
        "label": "Loader 1 (Pods)",
        "description": "Try load pods"
      }
    },
    {
      "id": "loader-2",
      "type": "default",
      "position": { "x": 750, "y": 580 },
      "data": {
        "label": "Loader 2 (Services)",
        "description": "Try load services"
      }
    },
    {
      "id": "loader-3",
      "type": "default",
      "position": { "x": 900, "y": 580 },
      "data": {
        "label": "Loader 3 (Deployments)",
        "description": "Try load deployments"
      }
    },
    {
      "id": "mixed-results",
      "type": "default",
      "position": { "x": 750, "y": 700 },
      "data": {
        "label": "Mixed Results",
        "description": "Some succeed, some fail"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "tree-provider",
      "target": "get-children",
      "label": "VS Code calls",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "get-children",
      "target": "try-load",
      "label": "Try-catch block",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "try-load",
      "target": "success",
      "label": "Success",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "try-load",
      "target": "error",
      "label": "Exception",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "error",
      "target": "categorize-error",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "categorize-error",
      "target": "create-error-item",
      "label": "Connection/RBAC/Timeout/etc",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "create-error-item",
      "target": "error-tree-item",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "success",
      "target": "return-items",
      "label": "Normal items",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "error-tree-item",
      "target": "return-items",
      "label": "Error items",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "return-items",
      "target": "tree-view",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "tree-view",
      "target": "user-sees",
      "label": "Render",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "user-sees",
      "target": "right-click",
      "label": "User action",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "right-click",
      "target": "context-menu",
      "label": "Show menu",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "context-menu",
      "target": "retry",
      "label": "Retry option",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "context-menu",
      "target": "view-details",
      "label": "View Details option",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "context-menu",
      "target": "copy-details",
      "label": "Copy option",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "retry",
      "target": "refresh-tree",
      "label": "Execute callback",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "view-details",
      "target": "output-panel",
      "label": "Open panel",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "copy-details",
      "target": "clipboard",
      "label": "Copy text",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "refresh-tree",
      "target": "get-children",
      "label": "Loop back",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e21",
      "source": "try-load",
      "target": "graceful-loader",
      "label": "Alternative: batch load",
      "type": "smoothstep"
    },
    {
      "id": "e22",
      "source": "graceful-loader",
      "target": "multiple-loaders",
      "label": "",
      "type": "smoothstep"
    },
    {
      "id": "e23",
      "source": "multiple-loaders",
      "target": "loader-1",
      "label": "Parallel",
      "type": "smoothstep"
    },
    {
      "id": "e24",
      "source": "multiple-loaders",
      "target": "loader-2",
      "label": "Parallel",
      "type": "smoothstep"
    },
    {
      "id": "e25",
      "source": "multiple-loaders",
      "target": "loader-3",
      "label": "Parallel",
      "type": "smoothstep"
    },
    {
      "id": "e26",
      "source": "loader-1",
      "target": "mixed-results",
      "label": "Success/fail",
      "type": "smoothstep"
    },
    {
      "id": "e27",
      "source": "loader-2",
      "target": "mixed-results",
      "label": "Success/fail",
      "type": "smoothstep"
    },
    {
      "id": "e28",
      "source": "loader-3",
      "target": "mixed-results",
      "label": "Success/fail",
      "type": "smoothstep"
    },
    {
      "id": "e29",
      "source": "mixed-results",
      "target": "return-items",
      "label": "Combined",
      "type": "smoothstep"
    }
  ]
}
```

## Component Descriptions

### Core Components

**ClusterTreeProvider**: Main tree data provider that implements `vscode.TreeDataProvider<TreeItem>`

**ErrorTreeItem**: Special tree item class for displaying errors with:
- Error icon (red with error foreground color)
- Brief error message as label
- Error category as description
- Detailed tooltip with full error info
- Context value `"error"` for context menu

### Flow Paths

#### Normal Flow (Success)
1. VS Code calls `getChildren()`
2. Try to load resources
3. Success → return normal tree items
4. Display in tree view

#### Error Flow (Single Item)
1. VS Code calls `getChildren()`
2. Try to load resources
3. Error caught → categorize error
4. Create `ErrorTreeItem` with retry callback
5. Return error item
6. Display error in tree view

#### Graceful Degradation Flow (Multiple Items)
1. VS Code calls `getChildren()`
2. Use graceful degradation loader
3. Load multiple resource types in parallel
4. Some succeed, some fail
5. Return mixed results (normal + error items)
6. Display all items in tree view

### User Interaction Flow

1. User sees tree with normal items and error items
2. User right-clicks error item
3. Context menu shows:
   - **Retry** (inline icon)
   - **View Error Details**
   - **Copy Error Details**
4. User selects action:
   - **Retry**: Executes retry callback → refreshes tree item
   - **View Details**: Opens Output Panel with logs
   - **Copy Details**: Copies error info to clipboard

## Key Features

### Graceful Degradation
- Tree view never completely fails
- Successful categories display normally
- Failed categories show error items
- User can interact with successful parts

### Inline Error Display
- Errors shown directly in tree
- No blocking modal dialogs
- Maintains context and navigation

### Retry Capability
- Every error item has retry callback
- Refreshes only affected tree item
- Doesn't reload entire tree

### Rich Error Information
- Brief message in label
- Category in description
- Full details in tooltip
- Complete logs in Output Panel

