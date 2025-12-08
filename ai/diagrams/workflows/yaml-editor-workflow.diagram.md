---
diagram_id: yaml-editor-workflow
feature_id: [yaml-editor]
actor_id: [developer, vscode-extension, kubernetes-cluster]
---

# YAML Editor Workflow Diagram

## Overview

This diagram visualizes the YAML editor workflow, showing how users open, edit, and save Kubernetes resource YAML configurations. Element-level spec linkages connect components to their technical specifications.

## Workflow Architecture

```json
{
  "nodes": [
    {
      "id": "developer",
      "type": "actor",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "User editing YAML"
      }
    },
    {
      "id": "tree-view",
      "type": "interface",
      "position": { "x": 50, "y": 150 },
      "data": {
        "label": "Tree View Context Menu",
        "description": "Right-click 'View YAML'",
        "spec_id": "tree-view-spec"
      }
    },
    {
      "id": "yaml-editor-manager",
      "type": "component",
      "position": { "x": 50, "y": 250 },
      "data": {
        "label": "YAMLEditorManager",
        "description": "Manages YAML editor lifecycle",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "yaml-content-provider",
      "type": "component",
      "position": { "x": 250, "y": 250 },
      "data": {
        "label": "YAMLContentProvider",
        "description": "Fetches resource YAML from cluster",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "kubectl-get",
      "type": "process",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "kubectl get -o yaml",
        "description": "Fetch resource YAML"
      }
    },
    {
      "id": "fs-provider",
      "type": "component",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "Kube9YAMLFileSystemProvider",
        "description": "Custom URI: kube9-yaml://",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "vscode-editor",
      "type": "interface",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "VS Code Text Editor",
        "description": "YAML editor with syntax highlighting"
      }
    },
    {
      "id": "developer-edit",
      "type": "actor",
      "position": { "x": 50, "y": 550 },
      "data": {
        "label": "Developer",
        "description": "Edits YAML and saves (Ctrl+S)"
      }
    },
    {
      "id": "yaml-save-handler",
      "type": "component",
      "position": { "x": 50, "y": 650 },
      "data": {
        "label": "YAMLSaveHandler",
        "description": "Handles save operations",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "yaml-validator",
      "type": "component",
      "position": { "x": 250, "y": 650 },
      "data": {
        "label": "YAMLValidator",
        "description": "Validates YAML syntax",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "dry-run",
      "type": "process",
      "position": { "x": 250, "y": 750 },
      "data": {
        "label": "kubectl apply --dry-run=server",
        "description": "Validate against Kubernetes API"
      }
    },
    {
      "id": "kubectl-apply",
      "type": "process",
      "position": { "x": 250, "y": 850 },
      "data": {
        "label": "kubectl apply -f -",
        "description": "Apply changes to cluster"
      }
    },
    {
      "id": "refresh-coordinator",
      "type": "component",
      "position": { "x": 50, "y": 950 },
      "data": {
        "label": "RefreshCoordinator",
        "description": "Updates tree view and webviews",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "success-notification",
      "type": "interface",
      "position": { "x": 50, "y": 1050 },
      "data": {
        "label": "Success Notification",
        "description": "YAML saved successfully"
      }
    },
    {
      "id": "kubernetes-api",
      "type": "external",
      "position": { "x": 450, "y": 350 },
      "data": {
        "label": "Kubernetes API",
        "description": "Cluster API server"
      }
    },
    {
      "id": "conflict-detector",
      "type": "component",
      "position": { "x": 450, "y": 650 },
      "data": {
        "label": "ConflictDetector",
        "description": "Detects external changes",
        "spec_id": "yaml-editor-spec"
      }
    },
    {
      "id": "permission-checker",
      "type": "component",
      "position": { "x": 450, "y": 750 },
      "data": {
        "label": "PermissionChecker",
        "description": "Validates RBAC permissions",
        "spec_id": "yaml-editor-spec"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "developer",
      "target": "tree-view",
      "label": "right-click → View YAML"
    },
    {
      "id": "e2",
      "source": "tree-view",
      "target": "yaml-editor-manager",
      "label": "openYAMLEditor(resource)"
    },
    {
      "id": "e3",
      "source": "yaml-editor-manager",
      "target": "yaml-content-provider",
      "label": "fetchYAML(resource)"
    },
    {
      "id": "e4",
      "source": "yaml-content-provider",
      "target": "kubectl-get",
      "label": "execute"
    },
    {
      "id": "e5",
      "source": "kubectl-get",
      "target": "kubernetes-api",
      "label": "GET request"
    },
    {
      "id": "e6",
      "source": "kubernetes-api",
      "target": "yaml-content-provider",
      "label": "YAML content"
    },
    {
      "id": "e7",
      "source": "yaml-editor-manager",
      "target": "fs-provider",
      "label": "register URI scheme"
    },
    {
      "id": "e8",
      "source": "fs-provider",
      "target": "vscode-editor",
      "label": "open editor"
    },
    {
      "id": "e9",
      "source": "vscode-editor",
      "target": "developer-edit",
      "label": "display YAML"
    },
    {
      "id": "e10",
      "source": "developer-edit",
      "target": "yaml-save-handler",
      "label": "Ctrl+S (save)"
    },
    {
      "id": "e11",
      "source": "yaml-save-handler",
      "target": "yaml-validator",
      "label": "validateSyntax()"
    },
    {
      "id": "e12",
      "source": "yaml-validator",
      "target": "dry-run",
      "label": "if syntax valid"
    },
    {
      "id": "e13",
      "source": "dry-run",
      "target": "kubernetes-api",
      "label": "validate schema"
    },
    {
      "id": "e14",
      "source": "dry-run",
      "target": "kubectl-apply",
      "label": "if valid"
    },
    {
      "id": "e15",
      "source": "kubectl-apply",
      "target": "kubernetes-api",
      "label": "apply changes"
    },
    {
      "id": "e16",
      "source": "kubectl-apply",
      "target": "refresh-coordinator",
      "label": "on success"
    },
    {
      "id": "e17",
      "source": "refresh-coordinator",
      "target": "success-notification",
      "label": "show notification"
    },
    {
      "id": "e18",
      "source": "conflict-detector",
      "target": "kubernetes-api",
      "label": "check resourceVersion"
    },
    {
      "id": "e19",
      "source": "permission-checker",
      "target": "kubernetes-api",
      "label": "check RBAC"
    },
    {
      "id": "e20",
      "source": "yaml-save-handler",
      "target": "permission-checker",
      "label": "checkPermissions()"
    },
    {
      "id": "e21",
      "source": "yaml-save-handler",
      "target": "conflict-detector",
      "label": "checkConflicts()"
    }
  ]
}
```

## Key Workflow Phases

### Phase 1: Open YAML Editor
```
1. Developer right-clicks resource in tree view
2. Selects "View YAML" from context menu
3. YAMLEditorManager.openYAMLEditor(resource) called
4. YAMLContentProvider fetches YAML via kubectl get
5. Custom URI created: kube9-yaml://<cluster>/<ns>/<kind>/<name>
6. Kube9YAMLFileSystemProvider handles custom scheme
7. VS Code opens text editor with YAML content
8. Syntax highlighting applied (YAML language mode)
```

**Spec Linkage**: `yaml-editor-manager`, `yaml-content-provider`, `fs-provider` all link to `yaml-editor-spec`

### Phase 2: Edit YAML
```
1. Developer edits YAML in VS Code editor
2. Changes tracked by VS Code (dirty indicator)
3. ConflictDetector periodically checks resourceVersion
4. If external change detected, notify developer
5. Developer continues editing or reloads
```

**Spec Linkage**: `conflict-detector` links to `yaml-editor-spec`

### Phase 3: Save Changes
```
1. Developer presses Ctrl+S (or Cmd+S)
2. YAMLSaveHandler.handleSave(document) triggered
3. YAMLValidator validates YAML syntax
4. If syntax invalid, show error and abort
5. If syntax valid, proceed to dry-run
```

**Spec Linkage**: `yaml-save-handler`, `yaml-validator` link to `yaml-editor-spec`

### Phase 4: Validation
```
1. PermissionChecker checks RBAC permissions
2. If permission denied, show read-only message and abort
3. Execute: kubectl apply --dry-run=server -f -
4. Kubernetes API validates resource schema
5. If validation fails, show kubectl error and abort
6. If validation succeeds, proceed to apply
```

**Spec Linkage**: `permission-checker` links to `yaml-editor-spec`

### Phase 5: Apply Changes
```
1. Execute: kubectl apply -f -
2. Kubernetes API applies changes to cluster
3. If apply fails, show error
4. If apply succeeds, update resourceVersion
```

### Phase 6: Refresh & Notify
```
1. RefreshCoordinator.coordinateRefresh() called
2. Refresh tree view (specific category)
3. Refresh open webviews for affected namespace
4. Show success notification: "YAML saved successfully"
5. Mark editor as clean (remove dirty indicator)
```

**Spec Linkage**: `refresh-coordinator` links to `yaml-editor-spec`

## Error Handling Flows

### YAML Syntax Error
```
yaml-validator → detects invalid YAML
              → highlights error line
              → shows message with line number
              → aborts save
              → keeps editor in dirty state
```

### Kubernetes Validation Error
```
dry-run → Kubernetes API returns 400
        → parse error message
        → show detailed kubectl error
        → aborts save
        → keeps editor in dirty state
```

### Permission Denied
```
permission-checker → kubectl auth can-i returns 'no'
                   → set editor to read-only mode
                   → show warning message
                   → disable save command
```

### External Conflict
```
conflict-detector → resourceVersion changed
                  → show notification: "Resource modified externally"
                  → offer options: Reload / Compare / Keep Local
                  → if Reload: fetch latest YAML and replace
                  → if Compare: open diff view
                  → if Keep Local: disable conflict detection
```

### Network Error
```
kubectl-apply → connection refused
              → show error: "Unable to connect to cluster"
              → offer Retry button
              → keeps editor in dirty state
```

## Custom URI Scheme

### URI Format
```
kube9-yaml://<cluster-context>/<namespace>/<kind>/<resource-name>.yaml

Examples:
  kube9-yaml://minikube/default/Deployment/nginx-deployment.yaml
  kube9-yaml://prod-cluster/production/Service/api-service.yaml
  kube9-yaml://staging//Node/worker-node-1.yaml  // empty namespace for cluster-scoped
```

### File System Provider Operations
- **readFile**: Fetch YAML via kubectl get
- **writeFile**: Validate and apply via kubectl apply
- **stat**: Return file metadata (size, mtime)
- **watch**: Monitor for external changes (optional)

## Performance Optimizations

### Caching Strategy
- Cache fetched YAML content for 30 seconds
- Avoid redundant kubectl calls for same resource
- Debounce conflict detection (check every 30 seconds)

### Process Management
- Reuse kubectl processes when possible
- Set timeouts for long-running operations (30s)
- Clean up processes on editor close

### Memory Management
- Dispose editors when closed
- Clear caches periodically
- Limit number of concurrent editors (10 max)

## Spec Linkages

This diagram uses element-level spec linkages via `node.data.spec_id`:

All components link to `yaml-editor-spec`:
- **yaml-editor-manager** - Main editor lifecycle management
- **yaml-content-provider** - YAML fetching from cluster
- **fs-provider** - Custom file system provider for kube9-yaml:// URIs
- **yaml-save-handler** - Save operation orchestration
- **yaml-validator** - YAML syntax validation
- **conflict-detector** - External change detection
- **permission-checker** - RBAC permission validation
- **refresh-coordinator** - Post-save refresh coordination

The `tree-view` node links to `tree-view-spec` as the entry point for opening editors.

These linkages ensure each component can be traced to its technical implementation in the yaml-editor specification.

