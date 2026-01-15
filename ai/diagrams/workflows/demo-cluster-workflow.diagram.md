---
diagram_id: demo-cluster-workflow
name: Demo Cluster Management Workflow
description: Visual representation of demo cluster lifecycle and VSCode integration
type: flows
spec_id:
  - demo-cluster-scripts
  - demo-cluster-scenarios
  - demo-cluster-vscode-integration
feature_id:
  - demo-cluster-management
actor_id:
  - developer
---

# Demo Cluster Management Workflow

This diagram visualizes the complete workflow for managing demo clusters, from initial setup through testing and cleanup. It shows how developers interact with shell scripts, Minikube, and VSCode debug configurations.

```json
{
  "nodes": [
    {
      "id": "developer",
      "type": "actor",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "Developer or QA engineer"
      }
    },
    {
      "id": "start-script",
      "type": "component",
      "position": { "x": 50, "y": 150 },
      "data": {
        "label": "start.sh",
        "description": "Start/create demo cluster",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "check-minikube",
      "type": "process",
      "position": { "x": 50, "y": 250 },
      "data": {
        "label": "Check Minikube Installed",
        "description": "command -v minikube"
      }
    },
    {
      "id": "minikube-missing",
      "type": "interface",
      "position": { "x": 250, "y": 250 },
      "data": {
        "label": "Error: Install Minikube",
        "description": "Show installation instructions"
      }
    },
    {
      "id": "check-cluster-exists",
      "type": "process",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "Check Cluster Running",
        "description": "minikube status --profile kube9-demo"
      }
    },
    {
      "id": "cluster-exists",
      "type": "interface",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "Already Running Message",
        "description": "Show kubeconfig path"
      }
    },
    {
      "id": "minikube-start",
      "type": "process",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "minikube start",
        "description": "Create cluster with profile kube9-demo",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "minikube-cluster",
      "type": "external",
      "position": { "x": 50, "y": 550 },
      "data": {
        "label": "Minikube Cluster",
        "description": "Profile: kube9-demo, 2CPU, 4GB RAM"
      }
    },
    {
      "id": "export-kubeconfig",
      "type": "process",
      "position": { "x": 50, "y": 650 },
      "data": {
        "label": "Export Kubeconfig",
        "description": "kubectl config view --flatten",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "isolated-kubeconfig",
      "type": "component",
      "position": { "x": 50, "y": 750 },
      "data": {
        "label": "demo-cluster/kubeconfig",
        "description": "Isolated kubeconfig file",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "start-complete",
      "type": "interface",
      "position": { "x": 50, "y": 850 },
      "data": {
        "label": "✓ Cluster Started",
        "description": "Show next steps"
      }
    },
    {
      "id": "developer-populate",
      "type": "actor",
      "position": { "x": 450, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "Populate with scenario"
      }
    },
    {
      "id": "populate-script",
      "type": "component",
      "position": { "x": 450, "y": 150 },
      "data": {
        "label": "populate.sh",
        "description": "Deploy scenario to cluster",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "validate-scenario",
      "type": "process",
      "position": { "x": 450, "y": 250 },
      "data": {
        "label": "Validate Scenario",
        "description": "Check scenario file exists"
      }
    },
    {
      "id": "scenario-not-found",
      "type": "interface",
      "position": { "x": 650, "y": 250 },
      "data": {
        "label": "Error: Invalid Scenario",
        "description": "List available scenarios"
      }
    },
    {
      "id": "check-existing-resources",
      "type": "process",
      "position": { "x": 450, "y": 350 },
      "data": {
        "label": "Check Existing Resources",
        "description": "kubectl get all --all-namespaces"
      }
    },
    {
      "id": "cleanup-prompt",
      "type": "interface",
      "position": { "x": 650, "y": 350 },
      "data": {
        "label": "Cleanup Prompt",
        "description": "Delete existing resources?"
      }
    },
    {
      "id": "cleanup-resources",
      "type": "process",
      "position": { "x": 650, "y": 450 },
      "data": {
        "label": "Delete Resources",
        "description": "kubectl delete all/namespace"
      }
    },
    {
      "id": "scenario-yaml",
      "type": "component",
      "position": { "x": 450, "y": 550 },
      "data": {
        "label": "Scenario YAML",
        "description": "scenarios/<name>.yaml",
        "spec_id": "demo-cluster-scenarios"
      }
    },
    {
      "id": "kubectl-apply",
      "type": "process",
      "position": { "x": 450, "y": 650 },
      "data": {
        "label": "kubectl apply",
        "description": "Deploy scenario resources",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "scenario-resources",
      "type": "component",
      "position": { "x": 450, "y": 750 },
      "data": {
        "label": "Deployed Resources",
        "description": "Pods, Deployments, Services, etc.",
        "spec_id": "demo-cluster-scenarios"
      }
    },
    {
      "id": "populate-complete",
      "type": "interface",
      "position": { "x": 450, "y": 850 },
      "data": {
        "label": "✓ Scenario Deployed",
        "description": "Show created resources"
      }
    },
    {
      "id": "developer-debug",
      "type": "actor",
      "position": { "x": 850, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "Launch VSCode debug"
      }
    },
    {
      "id": "vscode",
      "type": "interface",
      "position": { "x": 850, "y": 150 },
      "data": {
        "label": "VSCode",
        "description": "Open kube9-vscode project"
      }
    },
    {
      "id": "select-debug-config",
      "type": "interface",
      "position": { "x": 850, "y": 250 },
      "data": {
        "label": "Debug Configuration",
        "description": "Select 'Extension (Demo Cluster)'"
      }
    },
    {
      "id": "launch-json",
      "type": "component",
      "position": { "x": 850, "y": 350 },
      "data": {
        "label": ".vscode/launch.json",
        "description": "Debug configuration file",
        "spec_id": "demo-cluster-vscode-integration"
      }
    },
    {
      "id": "set-kubeconfig-env",
      "type": "process",
      "position": { "x": 850, "y": 450 },
      "data": {
        "label": "Set KUBECONFIG",
        "description": "env.KUBECONFIG = demo-cluster/kubeconfig",
        "spec_id": "demo-cluster-vscode-integration"
      }
    },
    {
      "id": "extension-dev-host",
      "type": "interface",
      "position": { "x": 850, "y": 550 },
      "data": {
        "label": "Extension Development Host",
        "description": "New VSCode window with extension"
      }
    },
    {
      "id": "extension-activate",
      "type": "process",
      "position": { "x": 850, "y": 650 },
      "data": {
        "label": "Extension Activates",
        "description": "Reads KUBECONFIG env var",
        "spec_id": "demo-cluster-vscode-integration"
      }
    },
    {
      "id": "load-demo-kubeconfig",
      "type": "process",
      "position": { "x": 850, "y": 750 },
      "data": {
        "label": "Load Demo Kubeconfig",
        "description": "Only kube9-demo cluster visible"
      }
    },
    {
      "id": "tree-view-demo",
      "type": "interface",
      "position": { "x": 850, "y": 850 },
      "data": {
        "label": "Tree View",
        "description": "Shows demo cluster resources"
      }
    },
    {
      "id": "test-features",
      "type": "actor",
      "position": { "x": 850, "y": 950 },
      "data": {
        "label": "Developer",
        "description": "Test features safely"
      }
    },
    {
      "id": "developer-cleanup",
      "type": "actor",
      "position": { "x": 1250, "y": 50 },
      "data": {
        "label": "Developer",
        "description": "Cleanup demo cluster"
      }
    },
    {
      "id": "stop-script",
      "type": "component",
      "position": { "x": 1250, "y": 150 },
      "data": {
        "label": "stop.sh",
        "description": "Stop cluster (preserve data)",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "minikube-stop",
      "type": "process",
      "position": { "x": 1250, "y": 250 },
      "data": {
        "label": "minikube stop",
        "description": "Stop cluster, keep state"
      }
    },
    {
      "id": "cluster-stopped",
      "type": "interface",
      "position": { "x": 1250, "y": 350 },
      "data": {
        "label": "✓ Cluster Stopped",
        "description": "State preserved"
      }
    },
    {
      "id": "reset-script",
      "type": "component",
      "position": { "x": 1250, "y": 500 },
      "data": {
        "label": "reset.sh",
        "description": "Delete and recreate cluster",
        "spec_id": "demo-cluster-scripts"
      }
    },
    {
      "id": "confirm-reset",
      "type": "interface",
      "position": { "x": 1250, "y": 600 },
      "data": {
        "label": "Confirmation Prompt",
        "description": "Are you sure?"
      }
    },
    {
      "id": "reset-cancelled",
      "type": "interface",
      "position": { "x": 1450, "y": 600 },
      "data": {
        "label": "Reset Cancelled",
        "description": "Cluster unchanged"
      }
    },
    {
      "id": "minikube-delete",
      "type": "process",
      "position": { "x": 1250, "y": 700 },
      "data": {
        "label": "minikube delete",
        "description": "Delete existing cluster"
      }
    },
    {
      "id": "minikube-start-fresh",
      "type": "process",
      "position": { "x": 1250, "y": 800 },
      "data": {
        "label": "minikube start",
        "description": "Create fresh cluster"
      }
    },
    {
      "id": "export-kubeconfig-reset",
      "type": "process",
      "position": { "x": 1250, "y": 900 },
      "data": {
        "label": "Export Kubeconfig",
        "description": "Generate new kubeconfig"
      }
    },
    {
      "id": "reset-complete",
      "type": "interface",
      "position": { "x": 1250, "y": 1000 },
      "data": {
        "label": "✓ Cluster Reset",
        "description": "Fresh empty cluster"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "developer",
      "target": "start-script",
      "label": "runs ./start.sh"
    },
    {
      "id": "e2",
      "source": "start-script",
      "target": "check-minikube",
      "label": "check prerequisites"
    },
    {
      "id": "e3",
      "source": "check-minikube",
      "target": "minikube-missing",
      "label": "if not found"
    },
    {
      "id": "e4",
      "source": "check-minikube",
      "target": "check-cluster-exists",
      "label": "if found"
    },
    {
      "id": "e5",
      "source": "check-cluster-exists",
      "target": "cluster-exists",
      "label": "if running"
    },
    {
      "id": "e6",
      "source": "check-cluster-exists",
      "target": "minikube-start",
      "label": "if not running"
    },
    {
      "id": "e7",
      "source": "minikube-start",
      "target": "minikube-cluster",
      "label": "creates cluster"
    },
    {
      "id": "e8",
      "source": "minikube-cluster",
      "target": "export-kubeconfig",
      "label": "cluster ready"
    },
    {
      "id": "e9",
      "source": "export-kubeconfig",
      "target": "isolated-kubeconfig",
      "label": "writes file"
    },
    {
      "id": "e10",
      "source": "isolated-kubeconfig",
      "target": "start-complete",
      "label": "setup complete"
    },
    {
      "id": "e11",
      "source": "developer-populate",
      "target": "populate-script",
      "label": "runs ./populate.sh <scenario>"
    },
    {
      "id": "e12",
      "source": "populate-script",
      "target": "validate-scenario",
      "label": "validate args"
    },
    {
      "id": "e13",
      "source": "validate-scenario",
      "target": "scenario-not-found",
      "label": "if invalid"
    },
    {
      "id": "e14",
      "source": "validate-scenario",
      "target": "check-existing-resources",
      "label": "if valid"
    },
    {
      "id": "e15",
      "source": "check-existing-resources",
      "target": "cleanup-prompt",
      "label": "if resources exist"
    },
    {
      "id": "e16",
      "source": "cleanup-prompt",
      "target": "cleanup-resources",
      "label": "if confirmed"
    },
    {
      "id": "e17",
      "source": "cleanup-resources",
      "target": "scenario-yaml",
      "label": "after cleanup"
    },
    {
      "id": "e18",
      "source": "check-existing-resources",
      "target": "scenario-yaml",
      "label": "if empty"
    },
    {
      "id": "e19",
      "source": "scenario-yaml",
      "target": "kubectl-apply",
      "label": "load scenario"
    },
    {
      "id": "e20",
      "source": "kubectl-apply",
      "target": "minikube-cluster",
      "label": "apply to cluster"
    },
    {
      "id": "e21",
      "source": "kubectl-apply",
      "target": "scenario-resources",
      "label": "creates resources"
    },
    {
      "id": "e22",
      "source": "scenario-resources",
      "target": "populate-complete",
      "label": "deployment complete"
    },
    {
      "id": "e23",
      "source": "developer-debug",
      "target": "vscode",
      "label": "opens project"
    },
    {
      "id": "e24",
      "source": "vscode",
      "target": "select-debug-config",
      "label": "F5"
    },
    {
      "id": "e25",
      "source": "select-debug-config",
      "target": "launch-json",
      "label": "reads config"
    },
    {
      "id": "e26",
      "source": "launch-json",
      "target": "set-kubeconfig-env",
      "label": "env: KUBECONFIG"
    },
    {
      "id": "e27",
      "source": "isolated-kubeconfig",
      "target": "set-kubeconfig-env",
      "label": "references file"
    },
    {
      "id": "e28",
      "source": "set-kubeconfig-env",
      "target": "extension-dev-host",
      "label": "launches with env"
    },
    {
      "id": "e29",
      "source": "extension-dev-host",
      "target": "extension-activate",
      "label": "activates extension"
    },
    {
      "id": "e30",
      "source": "extension-activate",
      "target": "load-demo-kubeconfig",
      "label": "reads KUBECONFIG env"
    },
    {
      "id": "e31",
      "source": "load-demo-kubeconfig",
      "target": "isolated-kubeconfig",
      "label": "loads from file"
    },
    {
      "id": "e32",
      "source": "load-demo-kubeconfig",
      "target": "tree-view-demo",
      "label": "populates tree"
    },
    {
      "id": "e33",
      "source": "scenario-resources",
      "target": "tree-view-demo",
      "label": "displays resources"
    },
    {
      "id": "e34",
      "source": "tree-view-demo",
      "target": "test-features",
      "label": "interact with demo cluster"
    },
    {
      "id": "e35",
      "source": "developer-cleanup",
      "target": "stop-script",
      "label": "runs ./stop.sh"
    },
    {
      "id": "e36",
      "source": "stop-script",
      "target": "minikube-stop",
      "label": "stop cluster"
    },
    {
      "id": "e37",
      "source": "minikube-stop",
      "target": "minikube-cluster",
      "label": "stops cluster"
    },
    {
      "id": "e38",
      "source": "minikube-stop",
      "target": "cluster-stopped",
      "label": "complete"
    },
    {
      "id": "e39",
      "source": "developer-cleanup",
      "target": "reset-script",
      "label": "runs ./reset.sh"
    },
    {
      "id": "e40",
      "source": "reset-script",
      "target": "confirm-reset",
      "label": "prompt for confirmation"
    },
    {
      "id": "e41",
      "source": "confirm-reset",
      "target": "reset-cancelled",
      "label": "if cancelled"
    },
    {
      "id": "e42",
      "source": "confirm-reset",
      "target": "minikube-delete",
      "label": "if confirmed"
    },
    {
      "id": "e43",
      "source": "minikube-delete",
      "target": "minikube-cluster",
      "label": "deletes cluster"
    },
    {
      "id": "e44",
      "source": "minikube-delete",
      "target": "minikube-start-fresh",
      "label": "after deletion"
    },
    {
      "id": "e45",
      "source": "minikube-start-fresh",
      "target": "minikube-cluster",
      "label": "creates new cluster"
    },
    {
      "id": "e46",
      "source": "minikube-start-fresh",
      "target": "export-kubeconfig-reset",
      "label": "cluster ready"
    },
    {
      "id": "e47",
      "source": "export-kubeconfig-reset",
      "target": "isolated-kubeconfig",
      "label": "updates kubeconfig"
    },
    {
      "id": "e48",
      "source": "export-kubeconfig-reset",
      "target": "reset-complete",
      "label": "complete"
    }
  ]
}
```

## Workflow Overview

This diagram illustrates four major workflow paths:

### 1. Start Workflow (Left Side)

```
Developer → start.sh → Check Minikube → Check Cluster → Create/Start → Export Kubeconfig → Success
```

**Key Steps**:
1. Developer runs `./scripts/demo-cluster/start.sh`
2. Script checks if Minikube is installed
3. Script checks if cluster already exists
4. If not existing, create new cluster with profile `kube9-demo`
5. Export isolated kubeconfig to `demo-cluster/kubeconfig`
6. Display success message with next steps

**Error Paths**:
- Minikube not found → Show installation instructions
- Cluster already running → Show existing cluster info

### 2. Populate Workflow (Center-Left)

```
Developer → populate.sh → Validate → Check Resources → Apply Scenario → Success
```

**Key Steps**:
1. Developer runs `./scripts/demo-cluster/populate.sh <scenario>`
2. Script validates scenario name
3. Check if cluster has existing resources
4. Optionally clean up existing resources
5. Apply scenario YAML to cluster
6. Display deployed resources

**Error Paths**:
- Invalid scenario → List available scenarios
- Cluster not running → Prompt to start cluster first

### 3. Debug Workflow (Center-Right)

```
Developer → VSCode → Select Debug Config → Set KUBECONFIG → Extension Dev Host → Load Demo Cluster → Test
```

**Key Steps**:
1. Developer opens VSCode and presses F5
2. Selects "Extension (Demo Cluster)" debug configuration
3. launch.json sets `KUBECONFIG` environment variable
4. Extension Development Host launches with demo kubeconfig
5. Extension loads only demo cluster (isolated)
6. Tree view displays demo cluster resources
7. Developer tests features safely

**Key Integration**:
- `launch.json` references `demo-cluster/kubeconfig`
- `KUBECONFIG` env var provides complete isolation
- Real clusters not visible in Extension Development Host

### 4. Cleanup Workflows (Right Side)

**Stop Workflow**:
```
Developer → stop.sh → minikube stop → Cluster Stopped (State Preserved)
```

**Reset Workflow**:
```
Developer → reset.sh → Confirm → Delete → Recreate → Export Kubeconfig → Success
```

**Key Differences**:
- **stop.sh**: Pauses cluster, preserves all data, quick restart
- **reset.sh**: Deletes cluster completely, creates fresh empty cluster, requires confirmation

## Key Components

### Shell Scripts

All shell scripts link to `demo-cluster-scripts` specification:
- **start.sh**: Cluster creation and kubeconfig export
- **populate.sh**: Scenario deployment
- **stop.sh**: Cluster pause
- **reset.sh**: Cluster deletion and recreation

### Minikube Cluster

**Central Resource**: All scripts interact with the same Minikube cluster (profile: kube9-demo)

**Configuration**:
- Profile: kube9-demo
- CPUs: 2
- Memory: 4GB
- Driver: docker

### Isolated Kubeconfig

**Critical Component**: `demo-cluster/kubeconfig`

**Purpose**: Complete isolation from real clusters

**Created by**: start.sh and reset.sh
**Referenced by**: launch.json
**Loaded by**: Extension in debug mode

### Scenario YAML Files

Link to `demo-cluster-scenarios` specification:
- Contains Kubernetes manifests
- Defines cluster state (healthy, degraded, with-operator, etc.)
- Applied by populate.sh

### VSCode Launch Configuration

Links to `demo-cluster-vscode-integration` specification:
- `.vscode/launch.json`
- Sets `KUBECONFIG` environment variable
- Launches Extension Development Host with demo cluster only

## Isolation Strategy

### Complete Isolation Demonstrated

1. **Kubeconfig Isolation**:
   ```
   System ~/.kube/config ← NOT affected
                          ↓
   demo-cluster/kubeconfig ← ONLY this used in debug mode
   ```

2. **Process Isolation**:
   ```
   Main VSCode ← Uses system kubeconfig
                 ↓
   Extension Dev Host ← Uses demo kubeconfig (KUBECONFIG env var)
   ```

3. **Cluster Isolation**:
   ```
   Real Clusters ← Not visible in Extension Dev Host
                   ↓
   kube9-demo ← ONLY cluster visible in Extension Dev Host
   ```

## Error Handling Flows

### Minikube Not Installed

```
check-minikube → [not found] → minikube-missing → Show installation instructions
```

### Cluster Already Running

```
check-cluster-exists → [running] → cluster-exists → Show existing cluster info
```

### Invalid Scenario Name

```
validate-scenario → [invalid] → scenario-not-found → List available scenarios
```

### Existing Resources Conflict

```
check-existing-resources → [resources exist] → cleanup-prompt → [user choice]
  ├─ [yes] → cleanup-resources → proceed
  └─ [no] → proceed (resources will co-exist)
```

### Reset Cancellation

```
confirm-reset → [user cancels] → reset-cancelled → Cluster unchanged
```

## Use Case Flows

### Use Case 1: First-Time Setup

```
Developer → start.sh → Create cluster → Export kubeconfig → populate.sh with-operator → Launch VSCode debug → Test features
```

**Timeline**: ~3-5 minutes
- Cluster creation: 1-2 minutes
- Scenario deployment: 30-60 seconds
- Extension launch: 10-20 seconds

### Use Case 2: Daily Development

```
[Cluster already running] → Launch VSCode debug → Test features → Stop debugging → stop.sh (end of day)
```

**Timeline**: ~30 seconds
- Extension launch: 10-20 seconds
- Ready to test immediately

### Use Case 3: Marketing Screenshots

```
reset.sh → Start fresh → populate.sh healthy → Launch VSCode debug → Navigate to views → Take screenshots
```

**Timeline**: ~3-4 minutes
- Reset: 2-3 minutes
- Populate: 30-60 seconds
- Launch and navigate: 30 seconds

### Use Case 4: QA Regression Testing

```
reset.sh → Start fresh → populate.sh degraded → Launch VSCode debug → Execute test cases → Verify fixes
```

**Timeline**: ~3-4 minutes
- Reset: 2-3 minutes
- Populate: 30-60 seconds
- Testing: variable

### Use Case 5: Scenario Switching

```
[Cluster with scenario A] → populate.sh scenario-B → Cleanup prompt → Confirm → Deploy B → Test
```

**Timeline**: ~1-2 minutes
- Cleanup: 30 seconds
- Deploy: 30-60 seconds

## Spec Linkages

This diagram uses element-level spec linkages to connect components to their technical specifications:

### demo-cluster-scripts

Components linking to this spec:
- **start.sh** - Cluster creation logic
- **populate.sh** - Scenario deployment logic
- **stop.sh** - Cluster pause logic
- **reset.sh** - Cluster deletion/recreation logic
- **minikube start** - Minikube configuration
- **Export Kubeconfig** - Kubeconfig isolation strategy
- **kubectl apply** - Resource deployment

### demo-cluster-scenarios

Components linking to this spec:
- **Scenario YAML** - YAML file structure and content
- **Deployed Resources** - Resource types and configurations

### demo-cluster-vscode-integration

Components linking to this spec:
- **.vscode/launch.json** - Debug configuration format
- **Set KUBECONFIG** - Environment variable strategy
- **Extension Activates** - Extension kubeconfig loading logic

## Performance Characteristics

### Timing Estimates

| Operation | Time | Notes |
|-----------|------|-------|
| start.sh (first time) | 1-2 min | Minikube cluster creation |
| start.sh (already running) | < 1 sec | Just checks status |
| populate.sh | 30-60 sec | Depends on scenario size |
| stop.sh | 10-20 sec | Cluster pause |
| reset.sh | 2-3 min | Delete + recreate |
| Launch debug | 10-20 sec | Extension compilation + launch |

### Resource Usage

| Resource | Demo Cluster | Host Impact |
|----------|--------------|-------------|
| CPU | 2 cores | Moderate |
| Memory | 4 GB | Moderate |
| Disk | ~2 GB | Low |
| Network | Local only | None |

## Security Boundaries

### Isolation Boundaries (Visualized)

```
┌─────────────────────────────────────────┐
│ Host System                              │
│  ┌────────────────────────────────────┐ │
│  │ Main VSCode                         │ │
│  │  - Uses ~/.kube/config             │ │
│  │  - Sees real clusters              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Extension Development Host         │ │
│  │  - Uses demo-cluster/kubeconfig    │ │
│  │  - Sees ONLY kube9-demo            │ │
│  │  - Isolated via KUBECONFIG env     │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Minikube Cluster (kube9-demo)      │ │
│  │  - Isolated profile                │ │
│  │  - Local only (no external access) │ │
│  │  - Generic demo data               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Isolation Points**:
1. Separate kubeconfig file (not merged with system config)
2. Environment variable scope (only Extension Dev Host)
3. Minikube profile isolation (separate from other profiles)
4. No network exposure (local cluster only)

## Extensibility Points

### Adding New Scenarios

```
Developer creates new YAML → scenarios/<name>.yaml → populate.sh auto-detects → Available for deployment
```

### Adding New Scripts

```
Create script in scripts/demo-cluster/ → Make executable → Document usage → Integrate with workflow
```

### Custom Launch Configurations

```
Copy existing config → Modify KUBECONFIG path or scenario → Save as new config → Available in debug dropdown
```

## Diagram Notes

### Visual Organization

The diagram is organized into four vertical columns representing workflow stages:

1. **Left Column (x: 50-250)**: Start/Create workflow
2. **Center-Left Column (x: 450-650)**: Populate workflow
3. **Center-Right Column (x: 850-1050)**: Debug/Test workflow
4. **Right Column (x: 1250-1450)**: Cleanup workflows

### Node Types

- **actor**: Developer/user (circular)
- **component**: Scripts, files, components (rectangular)
- **process**: Commands, operations (diamond)
- **interface**: UI messages, prompts (rounded rectangle)
- **external**: External systems (hexagon)

### Color Coding (Recommended)

- **Green edges**: Success paths
- **Red edges**: Error paths
- **Blue edges**: Data flow
- **Gray edges**: Control flow

### Critical Paths

The most common developer workflow (bold in implementation):
```
start.sh → populate.sh → VSCode debug → test → stop.sh
```

### Feedback Loops

- **Stop → Start**: Quick restart without reset
- **Populate → Populate**: Scenario switching
- **Reset → Start → Populate**: Complete refresh
