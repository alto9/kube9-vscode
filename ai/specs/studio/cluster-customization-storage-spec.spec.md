---
spec_id: cluster-customization-storage-spec
name: Cluster Customization Storage Specification
description: Technical specification for persisting and managing cluster customizations
feature_id:
  - cluster-manager-webview
  - cluster-folder-organization
  - cluster-alias-management
  - cluster-visibility-control
diagram_id:
  - cluster-manager-architecture
  - cluster-manager-workflow
---

# Cluster Customization Storage Specification

## Overview

The ClusterCustomizationService manages the persistence and retrieval of cluster customizations (folders, aliases, visibility) using VS Code's Global State API. It provides real-time synchronization between the Cluster Organizer webview and the tree view.

## Architecture

See [cluster-manager-architecture](../../diagrams/studio/cluster-manager-architecture.diagram.md) for how this service integrates with other components.

## Data Schema

### ClusterCustomizationConfig

```typescript
interface ClusterCustomizationConfig {
  version: string;  // Schema version (e.g., "1.0")
  folders: FolderConfig[];
  clusters: Record<string, ClusterConfig>;  // Key: kubeconfig context name
}

interface FolderConfig {
  id: string;        // UUID v4
  name: string;      // User-defined folder name
  parentId: string | null;  // Parent folder ID for nesting, null for root
  order: number;     // Display order within parent (0-indexed)
  expanded: boolean; // Whether folder is expanded in tree view
}

interface ClusterConfig {
  alias: string | null;      // User-friendly name, null for original name
  hidden: boolean;           // Whether cluster is hidden from tree view
  folderId: string | null;   // Parent folder ID, null for root level
  order: number;             // Display order within folder (0-indexed)
}
```

### Example Configuration

```json
{
  "version": "1.0",
  "folders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production",
      "parentId": null,
      "order": 0,
      "expanded": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "AWS",
      "parentId": "550e8400-e29b-41d4-a716-446655440000",
      "order": 0,
      "expanded": false
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Development",
      "parentId": null,
      "order": 1,
      "expanded": true
    }
  ],
  "clusters": {
    "arn:aws:eks:us-east-1:123456789:cluster/prod-eks": {
      "alias": "Prod EKS East",
      "hidden": false,
      "folderId": "550e8400-e29b-41d4-a716-446655440001",
      "order": 0
    },
    "arn:aws:eks:us-west-2:123456789:cluster/prod-eks": {
      "alias": "Prod EKS West",
      "hidden": false,
      "folderId": "550e8400-e29b-41d4-a716-446655440001",
      "order": 1
    },
    "docker-desktop": {
      "alias": "Local Dev",
      "hidden": false,
      "folderId": "550e8400-e29b-41d4-a716-446655440002",
      "order": 0
    },
    "test-cluster": {
      "alias": null,
      "hidden": true,
      "folderId": null,
      "order": 0
    }
  }
}
```

## ClusterCustomizationService API

### Constructor

```typescript
class ClusterCustomizationService {
  constructor(
    private context: vscode.ExtensionContext,
    private treeProvider: ClusterTreeProvider
  ) {}
}
```

### Methods

#### getConfiguration()
```typescript
async getConfiguration(): Promise<ClusterCustomizationConfig>
```

**Purpose**: Retrieve current customization configuration

**Returns**: Complete configuration object

**Behavior**:
- Read from VS Code Global State
- If not found, return default empty configuration
- Validate schema version
- Migrate if necessary

#### updateConfiguration()
```typescript
async updateConfiguration(
  config: ClusterCustomizationConfig
): Promise<void>
```

**Purpose**: Save updated configuration

**Parameters**: Complete configuration object

**Behavior**:
- Validate configuration structure
- Write to VS Code Global State
- Emit change event
- Notify tree provider to refresh

**Throws**: ValidationError if configuration invalid

#### createFolder()
```typescript
async createFolder(
  name: string,
  parentId: string | null
): Promise<FolderConfig>
```

**Purpose**: Create new folder

**Parameters**:
- `name`: Folder display name
- `parentId`: Parent folder ID or null for root

**Returns**: Created folder configuration

**Behavior**:
- Generate UUID for folder ID
- Validate folder name (non-empty, unique within parent)
- Calculate next order value within parent
- Add to configuration
- Save and notify

**Throws**: ValidationError if name invalid or duplicate

#### renameFolder()
```typescript
async renameFolder(
  folderId: string,
  newName: string
): Promise<void>
```

**Purpose**: Rename existing folder

**Parameters**:
- `folderId`: Folder to rename
- `newName`: New folder name

**Behavior**:
- Validate folder exists
- Validate new name (non-empty, unique within parent)
- Update folder name
- Save and notify

**Throws**:
- NotFoundError if folder doesn't exist
- ValidationError if name invalid or duplicate

#### deleteFolder()
```typescript
async deleteFolder(
  folderId: string,
  moveToRoot: boolean = true
): Promise<void>
```

**Purpose**: Delete folder

**Parameters**:
- `folderId`: Folder to delete
- `moveToRoot`: If true, move contained clusters to root; if false, delete contained clusters

**Behavior**:
- Validate folder exists
- If moveToRoot:
  - Update all clusters in folder to folderId: null
  - Delete all child folders recursively
- Remove folder from configuration
- Save and notify

**Throws**: NotFoundError if folder doesn't exist

#### moveCluster()
```typescript
async moveCluster(
  contextName: string,
  folderId: string | null,
  order: number
): Promise<void>
```

**Purpose**: Move cluster to different folder or change order

**Parameters**:
- `contextName`: Cluster context name
- `folderId`: Target folder ID or null for root
- `order`: Position within folder

**Behavior**:
- Get or create cluster config for context
- Validate folder exists (if not null)
- Update folderId and order
- Reorder other clusters in folder if necessary
- Save and notify

#### setAlias()
```typescript
async setAlias(
  contextName: string,
  alias: string | null
): Promise<void>
```

**Purpose**: Set or remove cluster alias

**Parameters**:
- `contextName`: Cluster context name
- `alias`: Friendly name or null to remove

**Behavior**:
- Get or create cluster config for context
- Update alias field
- Save and notify

#### setVisibility()
```typescript
async setVisibility(
  contextName: string,
  hidden: boolean
): Promise<void>
```

**Purpose**: Show or hide cluster in tree view

**Parameters**:
- `contextName`: Cluster context name
- `hidden`: Whether cluster should be hidden

**Behavior**:
- Get or create cluster config for context
- Update hidden field
- Save and notify

#### getClusterConfig()
```typescript
getClusterConfig(contextName: string): ClusterConfig
```

**Purpose**: Get customization for specific cluster

**Parameters**: `contextName` - Cluster context name

**Returns**: Cluster configuration or default values

**Behavior**:
- Look up cluster in configuration
- If not found, return default: `{ alias: null, hidden: false, folderId: null, order: 0 }`

#### exportConfiguration()
```typescript
async exportConfiguration(): Promise<string>
```

**Purpose**: Export configuration as JSON string

**Returns**: Pretty-printed JSON string

**Behavior**:
- Get current configuration
- Serialize to JSON with indentation
- Return string for file save

#### importConfiguration()
```typescript
async importConfiguration(jsonString: string): Promise<void>
```

**Purpose**: Import configuration from JSON string

**Parameters**: `jsonString` - JSON configuration

**Behavior**:
- Parse JSON string
- Validate schema
- Merge with existing configuration (import takes precedence)
- Save and notify

**Throws**:
- ParseError if invalid JSON
- ValidationError if schema invalid

#### resetToDefaults()
```typescript
async resetToDefaults(): Promise<void>
```

**Purpose**: Clear all customizations

**Behavior**:
- Create empty default configuration
- Save and notify
- Show confirmation dialog before executing

## Event System

### Change Events

```typescript
interface CustomizationChangeEvent {
  type: 'folder' | 'cluster' | 'bulk';
  operation: 'create' | 'update' | 'delete';
  affectedIds: string[];
}
```

### Event Emitter

```typescript
class ClusterCustomizationService {
  private changeEmitter = new vscode.EventEmitter<CustomizationChangeEvent>();
  
  readonly onDidChangeCustomizations = this.changeEmitter.event;
}
```

### Subscribers

**Tree Provider**:
```typescript
customizationService.onDidChangeCustomizations((event) => {
  this.refresh();  // Rebuild tree with new customizations
});
```

**Cluster Organizer Webview**:
```typescript
customizationService.onDidChangeCustomizations((event) => {
  this.sendMessageToWebview({
    type: 'customizationsUpdated',
    data: await customizationService.getConfiguration()
  });
});
```

## Storage Location

### VS Code Global State

**Storage Key**: `kube9.clusterCustomizations`

**Scope**: Installation-wide (not workspace-specific)

**Persistence**:
- Survives workspace changes
- Survives extension updates
- Survives VS Code restarts
- Syncs across machines if Settings Sync enabled

**Access**:
```typescript
// Read
const config = context.globalState.get<ClusterCustomizationConfig>(
  'kube9.clusterCustomizations',
  defaultConfig
);

// Write
await context.globalState.update(
  'kube9.clusterCustomizations',
  config
);
```

## Migration Strategy

### Version Detection

```typescript
function getSchemaVersion(config: any): string {
  return config?.version || '0.0';
}
```

### Migration Functions

```typescript
async function migrateConfiguration(
  config: any,
  fromVersion: string,
  toVersion: string
): Promise<ClusterCustomizationConfig> {
  // Implement version-specific migrations
  // Example: 0.0 → 1.0 (initial schema)
  
  if (fromVersion === '0.0' && toVersion === '1.0') {
    return {
      version: '1.0',
      folders: [],
      clusters: {}
    };
  }
  
  return config;
}
```

### Backward Compatibility

- Always support reading older schema versions
- Auto-migrate on first read after extension update
- Never break existing configurations
- Log migration events for debugging

## Validation Rules

### Folder Validation

```typescript
function validateFolder(folder: FolderConfig): ValidationResult {
  const errors: string[] = [];
  
  // Name validation
  if (!folder.name || folder.name.trim().length === 0) {
    errors.push('Folder name cannot be empty');
  }
  
  if (folder.name.length > 100) {
    errors.push('Folder name must be 100 characters or less');
  }
  
  // ID validation
  if (!folder.id || !isValidUUID(folder.id)) {
    errors.push('Folder ID must be valid UUID');
  }
  
  // Order validation
  if (folder.order < 0) {
    errors.push('Folder order must be non-negative');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Cluster Validation

```typescript
function validateCluster(cluster: ClusterConfig): ValidationResult {
  const errors: string[] = [];
  
  // Alias validation
  if (cluster.alias !== null && cluster.alias.length > 100) {
    errors.push('Alias must be 100 characters or less');
  }
  
  // Order validation
  if (cluster.order < 0) {
    errors.push('Cluster order must be non-negative');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Configuration Validation

```typescript
function validateConfiguration(
  config: ClusterCustomizationConfig
): ValidationResult {
  const errors: string[] = [];
  
  // Version validation
  if (config.version !== CURRENT_SCHEMA_VERSION) {
    errors.push(`Unsupported schema version: ${config.version}`);
  }
  
  // Validate all folders
  for (const folder of config.folders) {
    const result = validateFolder(folder);
    errors.push(...result.errors);
  }
  
  // Check for folder ID conflicts
  const folderIds = new Set<string>();
  for (const folder of config.folders) {
    if (folderIds.has(folder.id)) {
      errors.push(`Duplicate folder ID: ${folder.id}`);
    }
    folderIds.add(folder.id);
  }
  
  // Validate folder parent references
  for (const folder of config.folders) {
    if (folder.parentId !== null && !folderIds.has(folder.parentId)) {
      errors.push(`Folder ${folder.id} references non-existent parent ${folder.parentId}`);
    }
  }
  
  // Validate all clusters
  for (const [contextName, cluster] of Object.entries(config.clusters)) {
    const result = validateCluster(cluster);
    errors.push(...result.errors);
    
    // Validate folder reference
    if (cluster.folderId !== null && !folderIds.has(cluster.folderId)) {
      errors.push(`Cluster ${contextName} references non-existent folder ${cluster.folderId}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Synchronization with kubeconfig

### Handling New Clusters

When a cluster appears in kubeconfig that isn't in customizations:
- Auto-add to configuration with defaults
- Place at root level (folderId: null)
- No alias (alias: null)
- Visible (hidden: false)
- Append to end (order: max + 1)

### Handling Removed Clusters

When a cluster in customizations is not in kubeconfig:
- Mark as "inactive" in Cluster Organizer UI
- Keep customizations (don't delete)
- Show warning badge in Cluster Organizer
- Don't show in tree view
- Allow user to delete manually

### Real-time Detection

```typescript
// Watch for kubeconfig changes
const watcher = vscode.workspace.createFileSystemWatcher(
  kubeconfigPath
);

watcher.onDidChange(async () => {
  await syncWithKubeconfig();
});
```

## Performance Considerations

### Caching

- Cache configuration in memory after first read
- Invalidate cache only after write operations
- Avoid reading from Global State on every access

### Batch Operations

- Support bulk updates to minimize write operations
- Single save for multi-cluster moves
- Single notification after batch complete

### Debouncing

- Debounce auto-save during rapid changes
- 500ms delay after last change before write
- Queue changes during debounce period

## Error Recovery

### Corrupted Configuration

If configuration fails validation:
1. Log error with full configuration dump
2. Show error notification to user
3. Offer to reset to defaults
4. Create backup of corrupted configuration
5. Continue with default configuration

### Write Failures

If Global State write fails:
1. Retry up to 3 times with exponential backoff
2. Show error notification after retries exhausted
3. Keep changes in memory
4. Attempt to save on next change

## Testing Strategy

### Unit Tests

- CRUD operations for folders and clusters
- Validation functions
- Migration functions
- Default value generation
- Event emission

### Integration Tests

- Global State read/write
- Configuration persistence across restarts
- Migration from old versions
- Synchronization with kubeconfig changes

### E2E Tests

- Complete workflow: create, update, delete
- Export/import configuration
- Tree view synchronization
- Error recovery scenarios








