---
spec_id: cluster-manager-webview-spec
name: Cluster Organizer Webview Specification
description: Technical specification for the Cluster Organizer webview interface
feature_id:
  - cluster-manager-webview
  - cluster-folder-organization
  - cluster-alias-management
  - cluster-visibility-control
diagram_id:
  - cluster-manager-architecture
  - cluster-manager-workflow
---

# Cluster Organizer Webview Specification

## Overview

The Cluster Organizer webview provides a React-based interface for organizing, hiding, and aliasing Kubernetes clusters. It integrates with VS Code's webview API and communicates with the extension host via message passing.

## Architecture

See [cluster-manager-architecture](../../diagrams/studio/cluster-manager-architecture.diagram.md) for the component architecture and [cluster-manager-workflow](../../diagrams/studio/cluster-manager-workflow.diagram.md) for user workflows.

## Command Registration

### Command: `kube9.openClusterManager`

**Activation**:
- Command Palette: "Kube9: Cluster Organizer"
- Keyboard Shortcut: None (optional future enhancement)

**Implementation**:
```typescript
vscode.commands.registerCommand('kube9.openClusterManager', async () => {
  const panel = ClusterManagerWebview.createOrShow(context.extensionUri);
  await panel.initialize();
});
```

## Webview Panel Configuration

### Panel Options

```typescript
interface WebviewPanelOptions {
  viewType: 'kube9.clusterManager';
  title: 'Cluster Organizer';
  showOptions: {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false
  };
  options: {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(extensionUri, 'media', 'cluster-manager')
    ]
  };
}
```

### Singleton Pattern

Only one Cluster Organizer webview can be open at a time:
- If panel already exists, reveal and focus it
- If panel closed, create new instance
- Store panel reference in static class property

```typescript
class ClusterManagerWebview {
  private static currentPanel: ClusterManagerWebview | undefined;
  
  public static createOrShow(extensionUri: vscode.Uri): ClusterManagerWebview {
    if (ClusterManagerWebview.currentPanel) {
      ClusterManagerWebview.currentPanel.panel.reveal();
      return ClusterManagerWebview.currentPanel;
    }
    
    return new ClusterManagerWebview(extensionUri);
  }
}
```

## Message Protocol

### Extension → Webview Messages

#### Initialize
```typescript
{
  type: 'initialize',
  data: {
    clusters: Array<{
      contextName: string;      // Original kubeconfig context name
      clusterName: string;      // Cluster name from kubeconfig
      clusterServer: string;    // API server URL
      isActive: boolean;        // Whether this is current kubectl context
    }>,
    customizations: ClusterCustomizationConfig,
    theme: 'light' | 'dark'
  }
}
```

#### Customizations Updated
```typescript
{
  type: 'customizationsUpdated',
  data: ClusterCustomizationConfig
}
```

#### Theme Changed
```typescript
{
  type: 'themeChanged',
  data: {
    theme: 'light' | 'dark'
  }
}
```

### Webview → Extension Messages

#### Get Clusters
```typescript
{
  type: 'getClusters'
}
// Response: 'initialize' message
```

#### Update Customizations
```typescript
{
  type: 'updateCustomizations',
  data: ClusterCustomizationConfig
}
// Response: Success/error notification
```

#### Create Folder
```typescript
{
  type: 'createFolder',
  data: {
    name: string;
    parentId: string | null;
  }
}
// Response: 'customizationsUpdated' message
```

#### Move Cluster
```typescript
{
  type: 'moveCluster',
  data: {
    contextName: string;
    folderId: string | null;
    order: number;
  }
}
// Response: 'customizationsUpdated' message
```

#### Set Alias
```typescript
{
  type: 'setAlias',
  data: {
    contextName: string;
    alias: string | null;  // null removes alias
  }
}
// Response: 'customizationsUpdated' message
```

#### Toggle Visibility
```typescript
{
  type: 'toggleVisibility',
  data: {
    contextName: string;
    hidden: boolean;
  }
}
// Response: 'customizationsUpdated' message
```

#### Export Configuration
```typescript
{
  type: 'exportConfiguration'
}
// Response: Triggers file save dialog
```

#### Import Configuration
```typescript
{
  type: 'importConfiguration',
  data: ClusterCustomizationConfig
}
// Response: 'customizationsUpdated' message
```

## React Component Structure

### Main Components

#### ClusterManagerApp (Root)
- Manages webview state
- Handles message passing with extension
- Provides context for child components

#### ClusterList
- Displays organized list of clusters and folders
- Implements drag-and-drop for reordering
- Shows visibility status and aliases

#### FolderItem
- Collapsible folder with nested clusters
- Rename folder inline editing
- Delete folder with confirmation
- Drag-and-drop support

#### ClusterItem
- Individual cluster display
- Inline alias editing
- Visibility toggle switch
- Shows original context name in tooltip
- Badge for active cluster

#### Toolbar
- New Folder button
- Search/filter input
- Import/Export buttons
- Reset to defaults button

#### SearchFilter
- Filters clusters by name or alias
- Highlights matching text
- Preserves folder structure

## UI/UX Requirements

### Visual Design

**Layout**:
- Header: Toolbar with actions
- Body: Scrollable cluster list
- Footer: Status information (cluster count, hidden count)

**Theme Integration**:
- Use VS Code theme colors via CSS variables
- Icons from Codicons font
- Respect light/dark theme switching

**Drag-and-Drop Visual Feedback**:
- Dragging cluster: 50% opacity, ghost cursor
- Drop target folder: highlighted border, slight expand
- Invalid drop target: red border, no-drop cursor
- Drop indicator line: blue line showing insertion point

### Interactions

**Folder Operations**:
- Click folder name: Toggle expand/collapse
- Click "New Folder": Creates folder, focuses name input
- Double-click folder name: Enter rename mode
- Delete folder: Confirmation dialog, moves clusters to root

**Cluster Operations**:
- Drag cluster: Move to folder or reorder
- Click edit icon: Enter alias edit mode
- Click visibility toggle: Hide/show cluster
- Hover cluster: Show tooltip with full context name

**Keyboard Navigation**:
- Tab: Navigate between folders/clusters
- Enter: Toggle folder or edit selected item
- Delete: Delete selected folder/cluster
- Arrow keys: Navigate list
- Escape: Cancel edit mode

### Search and Filter

**Search Features**:
- Search by cluster name or alias
- Real-time filtering as user types
- Case-insensitive matching
- Highlight matching text in results
- Show folder if any child matches

**Filter Behavior**:
- Empty search: Show all clusters (respect visibility)
- Active search: Show matching clusters and their parent folders
- No matches: Show "No clusters found" message
- Clear button: Reset search and show all

## Accessibility

### ARIA Labels

```typescript
<div role="tree" aria-label="Cluster organization tree">
  <div role="treeitem" aria-expanded="true" aria-label="Production folder">
    <div role="treeitem" aria-label="Prod EKS cluster">
```

### Keyboard Support

All interactions accessible via keyboard:
- Tab order: Toolbar → Search → Folders/Clusters → Footer
- Focus indicators: Clear 2px outline on focused elements
- Screen reader announcements: For folder expand/collapse, cluster move, alias change

## Performance Considerations

### Virtualization

For large cluster lists (>100 clusters):
- Implement virtual scrolling with react-window
- Render only visible items plus buffer
- Smooth scrolling performance

### Debouncing

- Search input: 300ms debounce
- Drag operations: 150ms debounce for position updates
- Auto-save: 500ms debounce after last change

### Memoization

Use React.memo for:
- FolderItem components
- ClusterItem components
- Toolbar components

Memoize computed values:
- Filtered cluster lists
- Folder hierarchy calculations
- Active cluster lookup

## Error Handling

### Validation Errors

**Invalid Folder Name**:
- Empty name: "Folder name cannot be empty"
- Duplicate name: "A folder with this name already exists"
- Invalid characters: "Folder name contains invalid characters"

**Invalid Alias**:
- Too long (>100 chars): "Alias must be 100 characters or less"
- Invalid characters: Allow all unicode, no validation needed

**Invalid Configuration Import**:
- Parse error: "Invalid JSON file format"
- Schema mismatch: "Configuration file version not supported"
- Missing required fields: "Configuration file is incomplete"

### Communication Errors

**Extension Not Responding**:
- Timeout after 5 seconds
- Show error: "Unable to communicate with extension. Please reload the window."
- Retry button available

**Save Failures**:
- Show error notification with specific message
- Offer retry option
- Revert UI to last known good state

## Testing Strategy

### Unit Tests

- Message handler functions
- Folder/cluster CRUD operations
- Search/filter logic
- Drag-and-drop position calculations
- Validation functions

### Integration Tests

- Extension ↔ Webview message passing
- Configuration persistence
- Tree view synchronization
- Theme change handling

### E2E Tests

- Create folder workflow
- Move cluster workflow
- Set alias workflow
- Hide/show cluster workflow
- Import/export configuration
- Search and filter behavior







