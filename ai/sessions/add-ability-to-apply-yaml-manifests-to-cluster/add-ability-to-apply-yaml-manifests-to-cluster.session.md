---
session_id: add-ability-to-apply-yaml-manifests-to-cluster
start_time: '2025-11-28T15:31:22.110Z'
status: completed
problem_statement: Add ability to apply YAML manifests to cluster
changed_files:
  - path: ai/features/cluster/apply-yaml-manifest.feature.md
    change_type: added
    scenarios_added:
      - User applies YAML from active editor via command palette
      - User applies YAML from context menu
      - User applies YAML when no YAML file is active
      - User selects Apply option
      - User selects Dry Run Server option
      - User selects Dry Run Client option
      - User cancels apply operation
      - Apply succeeds with single resource
      - Apply succeeds with multiple resources
      - Dry run succeeds
      - Apply fails due to invalid YAML syntax
      - Apply fails due to invalid Kubernetes manifest
      - Apply fails due to cluster connectivity issues
      - Apply fails due to RBAC permissions
      - Apply fails due to namespace not found
      - Output channel shows command execution
start_commit: 8663688b07b1bc52a103f9788db065e98309d980
end_time: '2025-11-28T15:39:41.040Z'
---
## Problem Statement

Users cannot apply YAML manifests from the kube9 UI. The README mentions "Launch workloads with freeform YAML" but this feature is missing. Users must use kubectl manually to create resources.

**GitHub Issue**: [#4 - Add ability to apply YAML manifests to cluster](https://github.com/alto9/kube9-vscode/issues/4)

## Goals

1. **Add "kube9: Apply YAML" command** - Enable users to apply Kubernetes YAML manifests directly from the extension
2. **Support dry-run modes** - Allow users to validate manifests before applying (server-side and client-side validation)
3. **Provide clear feedback** - Show results in output channel with success/error notifications
4. **Follow established patterns** - Align with the vscode-kubernetes-tools extension approach

## Approach

### Command Implementation
- **Command Name**: "kube9: Apply YAML"
- **Activation Points**:
  - Right-click context menu on open YAML/YML files
  - Command palette (Ctrl+Shift+P / Cmd+Shift+P)

### Input Sources
1. **Active editor** (primary): Apply the currently open YAML file
2. **File picker**: Select a YAML file from the filesystem if no YAML file is active

### Apply Options (Quick Pick)
When triggered, prompt user with three options:
- **Apply** - Execute `kubectl apply -f <file>`
- **Dry Run (Server)** - Execute `kubectl apply -f <file> --dry-run=server` (validates against cluster)
- **Dry Run (Client)** - Execute `kubectl apply -f <file> --dry-run=client` (local validation only)

### Output Handling
- Show results in the kube9 output channel
- Success notification with summary of resources created/updated
- Error notification with details on failure

### Technical Implementation
```typescript
// Core execution - delegate to kubectl
const applyCommand = dryRun 
  ? `kubectl apply -f "${filePath}" --dry-run=${dryRunMode}`
  : `kubectl apply -f "${filePath}"`;

// Execute and capture output
const result = await shell.exec(applyCommand);
```

## Key Decisions

1. **Delegate to kubectl** - Use kubectl directly rather than implementing custom Kubernetes API calls
2. **Multi-document support handled by kubectl** - YAML files with multiple documents separated by `---` work natively
3. **Quick pick for apply options** - Simple 3-option menu rather than complex configuration dialogs
4. **Respect current context** - Uses current kubectl context and namespace (no override UI in this version)
5. **Context menu activation** - Register for YAML/YML file context menus via `when` clause

## Notes

### Acceptance Criteria
- [ ] User can right-click on open YAML file and select "kube9: Apply YAML"
- [ ] User can run command from command palette
- [ ] User is prompted to choose: Apply, Dry Run (Server), or Dry Run (Client)
- [ ] Multi-document YAML files work correctly
- [ ] Results displayed in output channel
- [ ] Success notification shows resources affected
- [ ] Error messages are clear and actionable
- [ ] Respects current kubectl context and namespace

### Out of Scope (for this issue)
- Paste YAML into input box
- Diff preview before apply
- Namespace override UI
- Auto-create namespace if missing

### References
- [vscode-kubernetes-tools](https://github.com/vscode-kubernetes-tools/vscode-kubernetes-tools) - Official extension implementation
- [kubectl apply documentation](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply)
- [kubectl dry-run documentation](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
