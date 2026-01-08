---
story_id: 006-add-vscode-launch-configuration
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-vscode-integration
status: pending
---

# Add VSCode Launch Configuration for Demo Cluster

## Objective

Add a new launch configuration to `.vscode/launch.json` that sets the `KUBECONFIG` environment variable to use the demo cluster.

## Context

This configuration enables developers to test the extension against the isolated demo cluster by launching the Extension Development Host with the demo kubeconfig. The extension will only see the demo cluster, not real clusters.

## Files to Create/Modify

- `.vscode/launch.json` (modify existing file)

## Implementation Details

### Read Existing launch.json

First, read the existing `.vscode/launch.json` to understand current configurations.

### Add New Configuration

Add a new configuration object to the `configurations` array:

```json
{
  "name": "Extension (Demo Cluster)",
  "type": "extensionHost",
  "request": "launch",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}"
  ],
  "env": {
    "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
  },
  "outFiles": [
    "${workspaceFolder}/out/**/*.js"
  ],
  "preLaunchTask": "npm: watch"
}
```

### Key Configuration Elements

1. **name**: "Extension (Demo Cluster)" - Clearly indicates demo mode
2. **env.KUBECONFIG**: Points to isolated demo cluster kubeconfig
3. **Same structure as existing configs**: Maintains consistency
4. **preLaunchTask**: Ensures TypeScript compilation

### Preserve Existing Configurations

Do not remove or modify existing launch configurations. The new config should be added alongside existing ones (e.g., "Extension (Default)", "Extension Tests").

### Configuration Order

Place the demo cluster configuration near the top of the array for easy access.

## Acceptance Criteria

- [ ] `.vscode/launch.json` file is modified
- [ ] New configuration "Extension (Demo Cluster)" is added
- [ ] `env.KUBECONFIG` points to `${workspaceFolder}/demo-cluster/kubeconfig`
- [ ] Configuration uses `extensionHost` type
- [ ] `preLaunchTask` is set to "npm: watch"
- [ ] `outFiles` points to compiled JavaScript
- [ ] Existing configurations are preserved
- [ ] JSON syntax is valid
- [ ] Configuration appears in VSCode debug dropdown

## Testing

Test the launch configuration:
```bash
# 1. Start demo cluster
./scripts/demo-cluster/start.sh

# 2. Populate with scenario
./scripts/demo-cluster/populate.sh with-operator

# 3. In VSCode:
#    - Press F5
#    - Select "Extension (Demo Cluster)"
#    - Extension Development Host should open
#    - Tree view should show ONLY kube9-demo cluster
#    - No real clusters should be visible
```

## Time Estimate

10-15 minutes
