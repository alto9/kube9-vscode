---
spec_id: demo-cluster-vscode-integration
name: Demo Cluster VSCode Integration
description: Technical specification for integrating demo cluster with VSCode debug configuration
feature_id:
  - demo-cluster-management
---

# Demo Cluster VSCode Integration Specification

## Overview

This specification defines how the demo cluster integrates with VSCode's debug/launch configuration system to allow developers to test the kube9-vscode extension against an isolated demo cluster without affecting real clusters.

## Launch Configuration

### File: .vscode/launch.json

The launch configuration file should include a new debug configuration specifically for the demo cluster.

### Configuration Structure

```json
{
  "version": "0.2.0",
  "configurations": [
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
    },
    {
      "name": "Extension (Default)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

### Configuration Breakdown

#### name: "Extension (Demo Cluster)"

**Purpose**: Clearly identifies this configuration as demo cluster mode

**User Experience**: Appears in VS Code debug dropdown with clear naming

#### type: "extensionHost"

**Purpose**: Launches Extension Development Host

**Behavior**: Opens new VS Code window with extension loaded

#### env.KUBECONFIG

**Key Setting**:
```json
"env": {
  "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
}
```

**Effect**:
- Sets `KUBECONFIG` environment variable for Extension Development Host
- Extension loads ONLY the demo cluster
- Real clusters in ~/.kube/config are NOT visible
- Complete isolation from production clusters

**Path Resolution**:
- `${workspaceFolder}` resolves to workspace root
- `/demo-cluster/kubeconfig` is relative to workspace
- Full path example: `/path/to/kube9-vscode/demo-cluster/kubeconfig`

#### preLaunchTask

**Purpose**: Compile TypeScript before launching

**Value**: `"npm: watch"`

**Behavior**:
- Starts `npm run watch` if not already running
- Ensures latest code changes are compiled
- Watches for changes during development

### Comparison with Default Configuration

**Default Configuration**:
- No `KUBECONFIG` override
- Uses system default (~/.kube/config)
- Sees all configured clusters
- For testing with real clusters

**Demo Configuration**:
- Overrides `KUBECONFIG`
- Uses isolated demo cluster kubeconfig
- Sees ONLY demo cluster
- For safe testing and screenshots

## Environment Variable Propagation

### How KUBECONFIG Works

1. **Launch Configuration Sets Environment**:
   ```json
   "env": {
     "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
   }
   ```

2. **Extension Development Host Receives Environment**:
   - VS Code passes environment variables to launched process
   - Extension host runs with `KUBECONFIG` set

3. **Extension Reads KUBECONFIG**:
   - Extension's Kubernetes client libraries (kubectl, @kubernetes/client-node) check `KUBECONFIG` environment variable
   - If set, use specified file instead of ~/.kube/config
   - Extension loads contexts from demo cluster kubeconfig only

4. **Tree View Displays Demo Cluster**:
   - Tree view populates with clusters from demo kubeconfig
   - Only kube9-demo cluster appears
   - No real clusters visible

### Environment Variable Scope

**Scope**: Extension Development Host process only

**Does NOT affect**:
- Main VS Code window
- User's terminal sessions
- Other VS Code windows
- System-wide KUBECONFIG

**Isolation**: Completely isolated to debug session

## Usage Workflow

### Step 1: Start Demo Cluster

```bash
cd /path/to/kube9-vscode
./scripts/demo-cluster/start.sh
```

**Output**:
```
✓ Demo cluster started successfully
✓ Kubeconfig: ./demo-cluster/kubeconfig
```

### Step 2: Populate Scenario (Optional)

```bash
./scripts/demo-cluster/populate.sh with-operator
```

**Output**:
```
✓ Scenario 'with-operator' deployed successfully
```

### Step 3: Launch Extension Development Host

**In VS Code**:
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Select "Debug: Select and Start Debugging"
3. Choose "Extension (Demo Cluster)"
4. OR: Press F5 and select "Extension (Demo Cluster)" from dropdown

**Shortcut**: Click debug icon in sidebar, select "Extension (Demo Cluster)", press F5

### Step 4: Extension Loads Demo Cluster

**Extension Development Host Window Opens**:
- New VS Code window launches
- Extension is activated
- Extension reads KUBECONFIG environment variable
- Extension loads demo-cluster/kubeconfig
- Tree view populates with kube9-demo cluster only

### Step 5: Test Features

Developer can now:
- Interact with demo cluster safely
- Test new features
- Take screenshots for marketing
- Debug issues without risk to real clusters
- Reload extension to test changes (Ctrl+R / Cmd+R)

### Step 6: Stop Debugging

- Close Extension Development Host window
- OR: Click stop button in debug toolbar
- OR: Press Shift+F5

**Cleanup**: Extension Development Host terminates, demo cluster keeps running

## Kubeconfig Path Validation

### Pre-Launch Checks

VS Code automatically validates:
- `${workspaceFolder}` variable resolves correctly
- Path is valid (no syntax errors)

**Does NOT validate**:
- File actually exists
- File is valid kubeconfig format
- Cluster is accessible

### Extension Initialization

**Extension should handle**:
- `KUBECONFIG` file not found
- `KUBECONFIG` file is invalid
- Cluster is not accessible

**Error Handling**:
```typescript
// In extension initialization
const kubeconfigPath = process.env.KUBECONFIG || path.join(os.homedir(), '.kube', 'config');

if (!fs.existsSync(kubeconfigPath)) {
  vscode.window.showErrorMessage(
    `Kubeconfig not found: ${kubeconfigPath}\n` +
    `If using demo cluster, run: ./scripts/demo-cluster/start.sh`
  );
  return;
}
```

## Multiple Launch Configurations

### Recommended Configurations

```json
{
  "version": "0.2.0",
  "configurations": [
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
    },
    {
      "name": "Extension (Default)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "env": {
        "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
      },
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

### Configuration Purposes

| Configuration | Purpose | KUBECONFIG |
|--------------|---------|------------|
| Extension (Demo Cluster) | Safe testing, screenshots | Demo cluster |
| Extension (Default) | Test with real clusters | System default |
| Extension Tests | Run automated tests | Demo cluster |

## Testing with Demo Cluster

### Use Cases

#### 1. Feature Development

**Workflow**:
1. Start demo cluster with relevant scenario
2. Launch Extension (Demo Cluster)
3. Implement feature
4. Test against demo cluster
5. Iterate on changes (Ctrl+R to reload)

**Benefits**:
- No risk to real clusters
- Fast iteration
- Reproducible state

#### 2. Marketing Screenshots

**Workflow**:
1. Start demo cluster
2. Populate with realistic scenario (with-operator)
3. Launch Extension (Demo Cluster)
4. Navigate to desired views
5. Take screenshots (no sensitive data visible)

**Benefits**:
- Professional-looking data
- No sensitive information
- Reproducible screenshots

#### 3. QA Testing

**Workflow**:
1. Start demo cluster
2. Populate with test scenario (degraded)
3. Launch Extension (Demo Cluster)
4. Execute test cases
5. Reset cluster for next test run

**Benefits**:
- Reproducible test environment
- Known initial state
- Fast reset between tests

#### 4. Demo Presentations

**Workflow**:
1. Start demo cluster before presentation
2. Populate with impressive scenario
3. Launch Extension (Demo Cluster) during demo
4. Show features without exposing real clusters

**Benefits**:
- Reliable demo environment
- No unexpected issues from real clusters
- Safe to share screen

## Integration with Extension Code

### Reading KUBECONFIG

Extension should respect `KUBECONFIG` environment variable:

```typescript
import * as os from 'os';
import * as path from 'path';

export function getKubeconfigPath(): string {
  // Check for KUBECONFIG environment variable first
  if (process.env.KUBECONFIG) {
    return process.env.KUBECONFIG;
  }
  
  // Fallback to default location
  return path.join(os.homedir(), '.kube', 'config');
}
```

### Loading Kubeconfig

```typescript
import * as k8s from '@kubernetes/client-node';

export function loadKubeconfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  
  // This automatically respects KUBECONFIG environment variable
  kc.loadFromDefault();
  
  return kc;
}
```

**Note**: `@kubernetes/client-node` automatically checks `KUBECONFIG` environment variable

### Displaying Current Kubeconfig

Extension could show which kubeconfig is in use:

```typescript
export function showKubeconfigInfo() {
  const kubeconfigPath = getKubeconfigPath();
  const isDemo = kubeconfigPath.includes('demo-cluster');
  
  const message = isDemo
    ? `Using demo cluster: ${kubeconfigPath}`
    : `Using system kubeconfig: ${kubeconfigPath}`;
  
  vscode.window.showInformationMessage(message);
}
```

**Status Bar Item**:
```typescript
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left,
  100
);

if (process.env.KUBECONFIG?.includes('demo-cluster')) {
  statusBarItem.text = "$(beaker) Demo Cluster";
  statusBarItem.tooltip = "Using isolated demo cluster";
  statusBarItem.color = "#FFA500"; // Orange color
} else {
  statusBarItem.text = "$(server) Cluster";
  statusBarItem.tooltip = "Using system kubeconfig";
}

statusBarItem.show();
```

## Environment Variables Reference

### KUBECONFIG

**Type**: File path

**Purpose**: Override default kubeconfig location

**Default**: `~/.kube/config`

**Demo Cluster Value**: `${workspaceFolder}/demo-cluster/kubeconfig`

**Format**:
- Absolute path: `/home/user/kube9-vscode/demo-cluster/kubeconfig`
- Relative path (not recommended): `./demo-cluster/kubeconfig`
- Multiple paths (colon-separated): `path1:path2:path3` (not used for demo cluster)

### Other Relevant Variables

**NODE_ENV**:
```json
"env": {
  "NODE_ENV": "development",
  "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
}
```

**DEBUG**:
```json
"env": {
  "DEBUG": "kube9:*",
  "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
}
```

## Security Considerations

### Isolation Guarantees

**What is isolated**:
- Extension Development Host sees ONLY demo cluster
- No access to real clusters from this session
- Kubeconfig contains only demo cluster

**What is NOT affected**:
- Main VS Code window (uses system kubeconfig)
- User's terminal sessions
- Other applications
- User's ~/.kube/config file

### Preventing Accidental Exposure

**Demo Cluster Naming**:
- Cluster name: "kube9-demo"
- Context name: "kube9-demo"
- Clear indication this is a demo

**Kubeconfig Location**:
- Stored in project directory
- Not merged with system kubeconfig
- Easy to identify as demo

**Visual Indicators** (recommended):
- Status bar shows "Demo Cluster"
- Orange/yellow color indicates demo mode
- Tooltip explains isolation

## Troubleshooting

### Issue: Extension Shows No Clusters

**Cause**: Demo cluster not started or kubeconfig not found

**Solution**:
```bash
# Check if kubeconfig exists
ls -l demo-cluster/kubeconfig

# If not, start demo cluster
./scripts/demo-cluster/start.sh
```

### Issue: Extension Shows Real Clusters

**Cause**: `KUBECONFIG` environment variable not set in launch config

**Solution**:
- Verify launch.json has `"env": { "KUBECONFIG": "..." }`
- Ensure correct launch configuration is selected
- Restart debug session

### Issue: Cannot Connect to Demo Cluster

**Cause**: Demo cluster is not running

**Solution**:
```bash
# Check cluster status
minikube status --profile=kube9-demo

# Start cluster if stopped
./scripts/demo-cluster/start.sh
```

### Issue: Wrong Kubeconfig Path

**Cause**: `${workspaceFolder}` not resolving correctly

**Solution**:
- Verify workspace folder is kube9-vscode root
- Use absolute path as temporary workaround:
  ```json
  "env": {
    "KUBECONFIG": "/absolute/path/to/kube9-vscode/demo-cluster/kubeconfig"
  }
  ```

### Issue: Changes Not Reflecting

**Cause**: Extension not recompiled or not reloaded

**Solution**:
1. Ensure `npm run watch` is running
2. In Extension Development Host, press Ctrl+R (Cmd+R) to reload
3. Or restart debug session

## Platform-Specific Considerations

### macOS

**Launch Config**: Standard configuration works

**Path Separators**: Forward slashes (/)

**Home Directory**: `/Users/username`

### Linux

**Launch Config**: Standard configuration works

**Path Separators**: Forward slashes (/)

**Home Directory**: `/home/username`

### Windows (WSL2)

**Launch Config**: Use WSL path format

**Example**:
```json
"env": {
  "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
}
```

**Note**: VS Code automatically handles WSL path translation

### Windows (Native)

**Launch Config**: Use Windows path format

**Example**:
```json
"env": {
  "KUBECONFIG": "${workspaceFolder}\\demo-cluster\\kubeconfig"
}
```

**Note**: Backslashes in Windows paths

## Documentation Requirements

### README.md Section

Should include:
- How to start demo cluster
- How to launch Extension (Demo Cluster) configuration
- What to expect when using demo cluster
- Troubleshooting common issues

### Example Documentation

```markdown
## Testing with Demo Cluster

For safe testing without affecting real clusters:

1. **Start the demo cluster**:
   ```bash
   ./scripts/demo-cluster/start.sh
   ```

2. **Populate with a scenario** (optional):
   ```bash
   ./scripts/demo-cluster/populate.sh with-operator
   ```

3. **Launch in VS Code**:
   - Press F5
   - Select "Extension (Demo Cluster)" from the dropdown
   - Extension Development Host opens with only the demo cluster

4. **Test features safely**:
   - All operations affect only the demo cluster
   - Real clusters are not visible
   - Safe for screenshots and demos

5. **Stop demo cluster** when done:
   ```bash
   ./scripts/demo-cluster/stop.sh
   ```
```

## Implementation Checklist

- [ ] Add "Extension (Demo Cluster)" configuration to .vscode/launch.json
- [ ] Set `KUBECONFIG` environment variable to demo cluster path
- [ ] Test launch configuration starts Extension Development Host
- [ ] Verify extension loads only demo cluster
- [ ] Confirm real clusters are not visible in demo mode
- [ ] Test on macOS, Linux, and Windows (WSL2)
- [ ] Add status bar indicator for demo mode (optional enhancement)
- [ ] Document usage in README.md
- [ ] Add troubleshooting section to docs
- [ ] Test screenshot workflow with demo cluster
- [ ] Verify no sensitive data visible in demo mode

## Future Enhancements

### Potential Improvements

1. **Auto-detect Demo Mode**:
   ```typescript
   if (process.env.KUBECONFIG?.includes('demo-cluster')) {
     // Enable demo mode features
     showDemoWarningBanner();
     enableScreenshotMode();
   }
   ```

2. **Demo Mode Banner**:
   - Show persistent banner: "Demo Mode - Safe for Screenshots"
   - Orange background to clearly indicate demo

3. **Screenshot Helper**:
   - Command: "Kube9: Prepare for Screenshot"
   - Expands tree view to show interesting resources
   - Positions views for best screenshot composition

4. **Launch Task Integration**:
   ```json
   "preLaunchTask": "start-demo-cluster"
   ```
   - Automatically start demo cluster before launching extension
   - Check if cluster is running, start if not

5. **Multi-Scenario Launch Configs**:
   - "Extension (Demo - With Operator)"
   - "Extension (Demo - Degraded)"
   - Each pre-populates specific scenario

6. **Workspace Settings**:
   ```json
   {
     "kube9.demoMode": true,
     "kube9.demoClusterPath": "./demo-cluster/kubeconfig"
   }
   ```
   - Extension reads settings to enable demo mode features
   - Show different UI elements in demo mode
