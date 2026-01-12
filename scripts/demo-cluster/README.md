# Demo Cluster System

Complete documentation for the isolated Minikube-based demo cluster system used for safe testing, marketing screenshots, and QA workflows.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Scripts Reference](#scripts-reference)
5. [Scenarios Reference](#scenarios-reference)
6. [VSCode Integration](#vscode-integration)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)
9. [Platform-Specific Notes](#platform-specific-notes)
10. [Extending](#extending)

## Overview

The demo cluster system provides a completely isolated Minikube-based Kubernetes cluster for testing kube9-vscode features without any risk to real production clusters. It uses a dedicated Minikube profile and an isolated kubeconfig file that never merges with your system configuration.

### Purpose

- **Safe Testing**: Test extension features without exposing real clusters
- **Marketing Screenshots**: Create reproducible, realistic cluster states for screenshots without sensitive data
- **QA Workflows**: Enable reproducible test environments for regression testing and bug verification
- **Development**: Reduce friction in testing extension features with easy cluster setup and teardown

### Benefits

- **Complete Isolation**: Demo cluster operations never affect real clusters in `~/.kube/config`
- **Reproducible States**: Scenarios provide consistent, known cluster states
- **Fast Iteration**: Quick reset and scenario switching for rapid testing cycles
- **Safe for Sharing**: Generic resource names and no sensitive data make it safe for screenshots and demos

### Architecture

- **Minikube Profile**: Single cluster with profile `kube9-demo`
- **Isolated Kubeconfig**: Dedicated file at `./demo-cluster/kubeconfig` (never merged with system config)
- **Shell Scripts**: Four scripts for cluster lifecycle management
- **YAML Scenarios**: Four pre-defined scenarios for different cluster states

## Prerequisites

Before using the demo cluster system, ensure you have the following installed:

### Required Software

#### Minikube

**macOS**:
```bash
brew install minikube
```

**Linux**:
```bash
# Download and install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**Windows WSL2**:
Install Minikube in your WSL2 environment using the Linux instructions above.

For detailed installation instructions, see: https://minikube.sigs.k8s.io/docs/start/

#### kubectl

Install kubectl following the official guide:
https://kubernetes.io/docs/tasks/tools/

**macOS**:
```bash
brew install kubectl
```

**Linux**:
```bash
# Download and install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

#### Docker or Appropriate Driver

**macOS**:
- Docker Desktop (recommended)
- HyperKit driver (alternative)

**Linux**:
- Docker (recommended)
- KVM2 driver (alternative)

**Windows WSL2**:
- Docker Desktop with WSL2 backend

### System Requirements

- **CPUs**: 2 cores minimum (allocated to cluster)
- **Memory**: 4GB RAM minimum (allocated to cluster)
- **Disk**: ~2GB free space for Minikube cluster
- **Operating System**: macOS, Linux, or Windows with WSL2

## Quick Start

Get started with the demo cluster in three simple steps:

### Step 1: Start Demo Cluster

```bash
./scripts/demo-cluster/start.sh
```

This will:
- Create a new Minikube cluster with profile `kube9-demo`
- Configure it with 2 CPUs and 4GB RAM
- Export an isolated kubeconfig to `./demo-cluster/kubeconfig`
- Display available scenarios

**Output**:
```
✓ Demo cluster started successfully
✓ Kubeconfig: ./demo-cluster/kubeconfig

Available scenarios:
  - with-operator    : Cluster with kube9-operator deployed
  - without-operator : Cluster without operator (Free Tier)
  - healthy          : All workloads in healthy state
  - degraded         : Various workloads in error states
```

### Step 2: Populate with Scenario

```bash
./scripts/demo-cluster/populate.sh with-operator
```

This deploys the selected scenario to your demo cluster. Available scenarios:
- `with-operator` - Pro Tier with kube9-operator
- `without-operator` - Free Tier without operator
- `healthy` - All resources in healthy state
- `degraded` - Various error states for troubleshooting

### Step 3: Launch VSCode Debug

1. Press `F5` in VS Code
2. Select **"Extension (Demo Cluster)"** from the debug dropdown
3. Extension Development Host opens with only the demo cluster visible

The extension will automatically use the isolated kubeconfig and only show the demo cluster.

## Scripts Reference

### start.sh

**Purpose**: Start or create the kube9-demo Minikube cluster

**Usage**:
```bash
./scripts/demo-cluster/start.sh
```

**Behavior**:
- Checks if Minikube is installed
- Detects if cluster already exists (exits gracefully if running)
- Creates `./demo-cluster/` directory if needed
- Starts Minikube cluster with profile `kube9-demo`
- Configures cluster with 2 CPUs, 4GB RAM, Docker driver
- Exports isolated kubeconfig to `./demo-cluster/kubeconfig`
- Displays available scenarios and next steps

**Output Example**:
```
Starting demo cluster (profile: kube9-demo)...
Exporting isolated kubeconfig...

✓ Demo cluster started successfully
✓ Kubeconfig: ./demo-cluster/kubeconfig

Available scenarios:
  - with-operator    : Cluster with kube9-operator deployed
  - without-operator : Cluster without operator (Free Tier)
  - healthy          : All workloads in healthy state
  - degraded         : Various workloads in error states

To populate with a scenario, run:
  ./scripts/demo-cluster/populate.sh <scenario-name>
```

**Exit Codes**:
- `0`: Success (cluster started or already running)
- `1`: Minikube not found or start failed

### stop.sh

**Purpose**: Stop the demo cluster while preserving its state

**Usage**:
```bash
./scripts/demo-cluster/stop.sh
```

**Behavior**:
- Checks if Minikube is installed
- Detects if cluster is running (exits gracefully if not running)
- Stops the Minikube cluster
- Preserves all cluster data and configurations
- Cluster can be restarted later with `start.sh`

**Output Example**:
```
Stopping demo cluster (profile: kube9-demo)...

✓ Demo cluster stopped successfully
✓ Cluster state has been preserved

To restart the cluster, run:
  ./scripts/demo-cluster/start.sh

Note: All cluster data and configurations will be restored when you restart.
```

**When to Use**:
- Pausing work without losing cluster state
- Freeing up system resources temporarily
- Preserving scenario state for later testing

**Exit Codes**:
- `0`: Success (cluster stopped or not running)
- `1`: Minikube not found or stop failed

### reset.sh

**Purpose**: Delete and recreate the demo cluster (clean slate)

**Usage**:
```bash
./scripts/demo-cluster/reset.sh
```

**Behavior**:
- **WARNING**: Prompts for confirmation before deletion
- Deletes existing cluster if it exists
- Removes old kubeconfig file
- Creates a fresh, empty cluster
- Exports new isolated kubeconfig

**Output Example**:
```
WARNING: This will DELETE the demo cluster and all its resources.
Profile: kube9-demo

Are you sure you want to continue? (y/N): y
Deleting existing demo cluster...
Creating fresh demo cluster...
Exporting isolated kubeconfig...

✓ Demo cluster reset complete
✓ Kubeconfig: ./demo-cluster/kubeconfig
```

**When to Use**:
- Starting fresh for a new test cycle
- Clearing all resources and scenarios
- Troubleshooting cluster issues
- Before taking new screenshots

**⚠️ Warning**: This operation deletes all cluster data. Use `stop.sh` if you want to preserve state.

**Exit Codes**:
- `0`: Success (cluster reset or user cancelled)
- `1`: Minikube not found or operation failed

### populate.sh

**Purpose**: Deploy a scenario to the demo cluster

**Usage**:
```bash
./scripts/demo-cluster/populate.sh <scenario-name>
```

**Arguments**:
- `<scenario-name>`: One of `with-operator`, `without-operator`, `healthy`, or `degraded`

**Behavior**:
- Validates scenario name and file existence
- Checks if Minikube cluster is running
- Checks if kubeconfig exists
- Detects existing resources and prompts for cleanup (optional)
- Applies scenario YAML to cluster
- Displays created resources

**Output Example**:
```
Deploying scenario: with-operator...
Waiting for resources to be created...

✓ Scenario 'with-operator' deployed successfully

Created resources:
NAMESPACE          NAME                              READY   STATUS
kube9-system      deployment/kube9-operator         1/1     Running
production        deployment/api-service             3/3     Running
...
```

**Switching Scenarios**:
If the cluster already has resources, `populate.sh` will prompt:
```
Warning: Demo cluster contains existing resources

Delete all existing resources before deploying scenario? (y/N):
```

Answer `y` to clean up before deploying the new scenario.

**Exit Codes**:
- `0`: Success
- `1`: Invalid usage, scenario not found, cluster not running, or deployment failed

**Error Handling**:
- Shows usage if no scenario name provided
- Lists available scenarios if invalid name provided
- Validates cluster is running before deployment
- Checks kubectl is installed

## Scenarios Reference

Scenarios are YAML files that define different cluster states. Each scenario creates a specific set of resources for different testing purposes.

### with-operator

**Purpose**: Demonstrates kube9-vscode Pro Tier features with the kube9-operator deployed

**Resources Created**:
- `kube9-system` namespace with kube9-operator deployment
- Multiple application namespaces (production, staging, development)
- ~15-20 resources including:
  - Deployments with multiple replicas
  - Services (ClusterIP and NodePort)
  - ConfigMaps and Secrets (with dummy data)
  - Multiple namespaces with realistic workloads

**When to Use**:
- Testing Pro Tier features
- Marketing screenshots showing operator integration
- Demonstrating multi-namespace scenarios
- Testing operator detection and health reporting

**Example**:
```bash
./scripts/demo-cluster/populate.sh with-operator
```

### without-operator

**Purpose**: Demonstrates kube9-vscode Free Tier functionality without the kube9-operator

**Resources Created**:
- `default-app` namespace
- ~8-10 resources including:
  - Simple deployments
  - Services
  - Basic workloads without operator dependencies

**When to Use**:
- Testing Free Tier features
- Demonstrating extension functionality without operator
- Lightweight testing scenarios
- Testing operator absence detection

**Example**:
```bash
./scripts/demo-cluster/populate.sh without-operator
```

### healthy

**Purpose**: All resources in healthy, running state for testing normal operations

**Resources Created**:
- Multiple namespaces (app-1, app-2)
- ~12-15 resources including:
  - Healthy deployments with working readiness/liveness probes
  - StatefulSets in running state
  - Services with active endpoints
  - All pods reach Running state
  - All replica counts match desired state

**Characteristics**:
- All pods reach Running state
- All readiness/liveness probes pass
- No error events
- All deployments reach desired replicas

**When to Use**:
- Testing normal operations
- Verifying extension displays healthy resources correctly
- Testing resource navigation and viewing
- Baseline testing before introducing errors

**Example**:
```bash
./scripts/demo-cluster/populate.sh healthy
```

### degraded

**Purpose**: Various resources in error states for testing troubleshooting features

**Resources Created**:
- `broken-apps` namespace
- ~10-12 resources with various error states:
  - CrashLoopBackOff pods (intentionally crashing containers)
  - ImagePullBackOff pods (non-existent images)
  - Pending pods (insufficient resources)
  - Failed readiness probes
  - Services with no endpoints
  - Failed jobs

**Error States Included**:
- CrashLoopBackOff: Containers that exit immediately
- ImagePullBackOff: Images that don't exist
- Pending: Pods that can't be scheduled (resource constraints)
- Readiness failures: Probes that fail
- Partial availability: Deployments with insufficient replicas

**When to Use**:
- Testing error handling and display
- Testing troubleshooting workflows
- Verifying extension shows error states correctly
- Testing event viewer with error events
- QA regression testing for error scenarios

**Example**:
```bash
./scripts/demo-cluster/populate.sh degraded
```

## VSCode Integration

The demo cluster integrates seamlessly with VS Code's debug configuration system to provide complete isolation from real clusters.

### Launch Configuration

A dedicated launch configuration is available in `.vscode/launch.json`:

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

### How It Works

1. **Environment Variable**: The `KUBECONFIG` environment variable is set to the isolated demo cluster kubeconfig
2. **Extension Development Host**: VS Code launches a new window with the extension loaded
3. **Isolation**: The extension only sees the demo cluster, not real clusters
4. **Automatic**: No code changes needed - the extension automatically respects the `KUBECONFIG` environment variable

### Using the Demo Cluster Configuration

1. **Start the demo cluster**:
   ```bash
   ./scripts/demo-cluster/start.sh
   ```

2. **Populate with a scenario** (optional):
   ```bash
   ./scripts/demo-cluster/populate.sh with-operator
   ```

3. **Launch Extension Development Host**:
   - Press `F5` in VS Code
   - Select **"Extension (Demo Cluster)"** from the debug dropdown
   - A new VS Code window opens with the extension loaded

4. **Verify Isolation**:
   - Open the Kube9 tree view
   - You should see only the `kube9-demo` cluster
   - No real clusters from `~/.kube/config` should be visible

### Switching Between Demo and Real Clusters

- **Demo Cluster**: Use "Extension (Demo Cluster)" launch configuration
- **Real Clusters**: Use "Extension (Default)" or other launch configurations without `KUBECONFIG` override

The main VS Code window continues to use your system kubeconfig (`~/.kube/config`), so you can work with real clusters there while testing in the Extension Development Host.

### Verifying Isolation

To verify the demo cluster is isolated:

1. **Check kubeconfig path**:
   ```bash
   # In Extension Development Host terminal
   echo $KUBECONFIG
   # Should show: /path/to/kube9-vscode/demo-cluster/kubeconfig
   ```

2. **List contexts**:
   ```bash
   kubectl config get-contexts
   # Should show only: kube9-demo
   ```

3. **Check tree view**: Only `kube9-demo` cluster should appear in the Kube9 tree view

## Common Workflows

### Daily Development Workflow

**Use Case**: Regular feature development and testing

```bash
# 1. Start demo cluster
./scripts/demo-cluster/start.sh

# 2. Populate with relevant scenario
./scripts/demo-cluster/populate.sh with-operator

# 3. Launch Extension Development Host (F5 → "Extension (Demo Cluster)")

# 4. Develop and test features
# - Make code changes
# - Reload extension (Ctrl+R / Cmd+R)
# - Test functionality

# 5. Stop cluster when done (preserves state)
./scripts/demo-cluster/stop.sh
```

**Benefits**: Fast iteration, safe testing, preserved state for next session

### Marketing Screenshot Workflow

**Use Case**: Creating screenshots for marketing materials

```bash
# 1. Reset to clean state
./scripts/demo-cluster/reset.sh

# 2. Populate with impressive scenario
./scripts/demo-cluster/populate.sh with-operator

# 3. Launch Extension Development Host
# Press F5 → "Extension (Demo Cluster)"

# 4. Navigate to desired views
# - Expand clusters and namespaces
# - Open resource details
# - Arrange views for best composition

# 5. Take screenshots
# - No sensitive data visible
# - Generic resource names
# - Professional appearance

# 6. Reset for next set of screenshots
./scripts/demo-cluster/reset.sh
```

**Benefits**: Reproducible screenshots, no sensitive data, professional appearance

### QA Regression Testing Workflow

**Use Case**: Reproducible test environments for bug verification

```bash
# 1. Start fresh cluster
./scripts/demo-cluster/reset.sh

# 2. Populate with test scenario
./scripts/demo-cluster/populate.sh degraded  # or healthy, depending on test

# 3. Launch Extension Development Host
# Press F5 → "Extension (Demo Cluster)"

# 4. Execute test cases
# - Reproduce bug
# - Verify fix works
# - Test edge cases

# 5. Reset and retry
./scripts/demo-cluster/reset.sh
./scripts/demo-cluster/populate.sh degraded
# Repeat as needed
```

**Benefits**: Reproducible environment, known initial state, fast reset between tests

### Demo Presentation Workflow

**Use Case**: Product demonstrations and presentations

```bash
# 1. Start cluster before presentation
./scripts/demo-cluster/start.sh

# 2. Populate with impressive scenario
./scripts/demo-cluster/populate.sh with-operator

# 3. Verify everything works
# Launch Extension Development Host and test

# 4. During presentation:
# - Launch Extension Development Host
# - Navigate through features
# - Show realistic data

# 5. If something goes wrong:
./scripts/demo-cluster/reset.sh
./scripts/demo-cluster/populate.sh with-operator
# Quick recovery
```

**Benefits**: Reliable demo environment, quick recovery, no unexpected issues from real clusters

## Troubleshooting

### Demo Cluster Not Starting

**Symptoms**: `start.sh` fails or cluster doesn't start

**Possible Causes**:
- Minikube not installed
- Docker not running
- Insufficient system resources
- Port conflicts

**Solutions**:
1. **Verify Minikube installation**:
   ```bash
   minikube version
   ```

2. **Check Docker is running**:
   ```bash
   docker ps
   # On macOS/Linux, ensure Docker Desktop is running
   ```

3. **Check system resources**:
   ```bash
   # Ensure you have at least 2 CPUs and 4GB RAM available
   # Close other resource-intensive applications
   ```

4. **Check Minikube status**:
   ```bash
   minikube status --profile=kube9-demo
   ```

5. **Try manual start**:
   ```bash
   minikube start --profile=kube9-demo --cpus=2 --memory=4096 --driver=docker
   ```

### Extension Shows Real Clusters Instead of Demo

**Symptoms**: Extension Development Host shows real clusters from `~/.kube/config`

**Possible Causes**:
- Wrong launch configuration selected
- `KUBECONFIG` environment variable not set in launch.json
- Path resolution issue

**Solutions**:
1. **Verify launch configuration**:
   - Ensure "Extension (Demo Cluster)" is selected (not "Extension (Default)")
   - Check `.vscode/launch.json` has the demo cluster configuration

2. **Verify KUBECONFIG in launch.json**:
   ```json
   "env": {
     "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
   }
   ```

3. **Check kubeconfig file exists**:
   ```bash
   ls -l demo-cluster/kubeconfig
   # If missing, run: ./scripts/demo-cluster/start.sh
   ```

4. **Restart debug session**:
   - Stop current debug session
   - Select "Extension (Demo Cluster)" again
   - Press F5

### Cannot Connect to Demo Cluster

**Symptoms**: Extension shows "Cannot connect" or no clusters visible

**Possible Causes**:
- Demo cluster not running
- Kubeconfig file missing or invalid
- Cluster stopped unexpectedly

**Solutions**:
1. **Check cluster status**:
   ```bash
   minikube status --profile=kube9-demo
   ```

2. **Start cluster if stopped**:
   ```bash
   ./scripts/demo-cluster/start.sh
   ```

3. **Verify kubeconfig exists**:
   ```bash
   cat demo-cluster/kubeconfig
   # Should show valid kubeconfig content
   ```

4. **Test kubectl access**:
   ```bash
   export KUBECONFIG=./demo-cluster/kubeconfig
   kubectl get nodes
   # Should show demo cluster node
   ```

### Scenario Deployment Fails

**Symptoms**: `populate.sh` fails with errors

**Possible Causes**:
- Scenario file doesn't exist
- Cluster not running
- kubectl not installed
- Invalid YAML in scenario

**Solutions**:
1. **Verify scenario exists**:
   ```bash
   ls scripts/demo-cluster/scenarios/
   # Should show: degraded.yaml, healthy.yaml, with-operator.yaml, without-operator.yaml
   ```

2. **Check cluster is running**:
   ```bash
   minikube status --profile=kube9-demo
   ```

3. **Verify kubectl is installed**:
   ```bash
   kubectl version --client
   ```

4. **Check scenario YAML syntax**:
   ```bash
   kubectl apply --dry-run=client -f scripts/demo-cluster/scenarios/with-operator.yaml
   ```

5. **View detailed error**:
   ```bash
   export KUBECONFIG=./demo-cluster/kubeconfig
   kubectl apply -f scripts/demo-cluster/scenarios/with-operator.yaml
   # Check error messages
   ```

### Wrong Kubeconfig Being Used

**Symptoms**: Extension uses wrong kubeconfig or `${workspaceFolder}` doesn't resolve

**Possible Causes**:
- VS Code workspace folder not set correctly
- Path resolution issue
- Multiple VS Code windows with different workspaces

**Solutions**:
1. **Verify workspace folder**:
   - Check VS Code shows correct workspace root
   - File → Open Folder → Select kube9-vscode root directory

2. **Use absolute path** (temporary workaround):
   ```json
   "env": {
     "KUBECONFIG": "/absolute/path/to/kube9-vscode/demo-cluster/kubeconfig"
   }
   ```

3. **Check VS Code variables**:
   - `${workspaceFolder}` should resolve to your project root
   - Verify in VS Code terminal: `echo ${workspaceFolder}`

4. **Restart VS Code**:
   - Close all VS Code windows
   - Reopen project from correct directory

### Cluster Resources Not Appearing

**Symptoms**: Scenario deployed but resources not visible in extension

**Possible Causes**:
- Resources still being created (pending state)
- Extension cache issue
- Wrong namespace selected

**Solutions**:
1. **Wait for resources**:
   ```bash
   export KUBECONFIG=./demo-cluster/kubeconfig
   kubectl get pods --all-namespaces
   # Check if resources are still being created
   ```

2. **Refresh extension**:
   - In Extension Development Host, press `Ctrl+R` (Windows/Linux) or `Cmd+R` (macOS)
   - Or click refresh button in tree view

3. **Check namespace filter**:
   - Ensure no namespace filter is active
   - Expand all namespaces in tree view

4. **Verify resources exist**:
   ```bash
   kubectl get all --all-namespaces
   # Should show resources from scenario
   ```

## Platform-Specific Notes

### macOS

**Installation**:
- Minikube: `brew install minikube`
- kubectl: `brew install kubectl`
- Docker: Docker Desktop for Mac

**Driver**: Docker Desktop (recommended)

**Path Handling**: Standard Unix paths work correctly

**Notes**:
- Docker Desktop must be running before starting cluster
- Homebrew installation is recommended for easy updates
- File paths use forward slashes (`/`)

**Troubleshooting**:
- If Docker fails, ensure Docker Desktop is running
- Check Docker Desktop has sufficient resources allocated
- Verify Docker context: `docker context ls`

### Linux

**Installation**:
- Minikube: Download from https://minikube.sigs.k8s.io/docs/start/
- kubectl: Install via package manager or download binary
- Docker: Install Docker Engine or use KVM2 driver

**Drivers**: Docker (recommended) or KVM2

**Path Handling**: Standard Unix paths work correctly

**Permissions**:
- Ensure user is in `docker` group for Docker driver
- For KVM2, user may need `libvirt` group membership

**Notes**:
- Docker driver requires Docker daemon running
- KVM2 driver requires virtualization support enabled in BIOS
- File paths use forward slashes (`/`)

**Troubleshooting**:
- Docker permission issues: `sudo usermod -aG docker $USER` (logout/login required)
- KVM2 issues: Verify virtualization: `egrep -c '(vmx|svm)' /proc/cpuinfo` (should be > 0)

### Windows WSL2

**Installation**:
- Minikube: Install in WSL2 environment using Linux instructions
- kubectl: Install in WSL2 environment
- Docker: Docker Desktop with WSL2 backend

**Driver**: Docker Desktop with WSL2 backend

**Path Handling**: VS Code automatically handles WSL2 path translation

**Notes**:
- Run all scripts from WSL2 terminal, not Windows PowerShell/CMD
- Docker Desktop must have WSL2 backend enabled
- VS Code should open workspace from WSL2 file system

**Troubleshooting**:
- Ensure Docker Desktop WSL2 integration is enabled for your WSL2 distribution
- Verify WSL2 distribution: `wsl --list --verbose`
- Check Docker context: `docker context ls` (should show default)

**VS Code Integration**:
- VS Code automatically translates `${workspaceFolder}` for WSL2 paths
- Launch configurations work correctly with WSL2 paths
- Extension Development Host runs in WSL2 environment

## Extending

### Creating Custom Scenarios

You can create custom scenarios for specific testing needs:

1. **Create YAML file**:
   ```bash
   # Create new scenario file
   touch scripts/demo-cluster/scenarios/my-custom-scenario.yaml
   ```

2. **Add resources**:
   ```yaml
   ---
   # Custom scenario for specific testing
   apiVersion: v1
   kind: Namespace
   metadata:
     name: my-test-namespace
     labels:
       scenario: my-custom-scenario
   ---
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: my-test-app
     namespace: my-test-namespace
     labels:
       app: my-test-app
       scenario: my-custom-scenario
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: my-test-app
     template:
       metadata:
         labels:
           app: my-test-app
       spec:
         containers:
         - name: app
           image: nginx:latest
           ports:
           - containerPort: 80
   ```

3. **Use the scenario**:
   ```bash
   ./scripts/demo-cluster/populate.sh my-custom-scenario
   ```

**Important**: Always include `scenario: <name>` label on all resources for proper cleanup.

### Modifying Existing Scenarios

Edit scenario YAML files directly:

1. **Open scenario file**:
   ```bash
   code scripts/demo-cluster/scenarios/healthy.yaml
   ```

2. **Make changes**:
   - Add or remove resources
   - Modify resource configurations
   - Update labels or annotations

3. **Apply changes**:
   ```bash
   ./scripts/demo-cluster/reset.sh  # Clean slate
   ./scripts/demo-cluster/populate.sh healthy  # Apply modified scenario
   ```

**Note**: Changes are local to your repository. Commit changes to share with team.

### Labeling Conventions

All scenario resources should include:

```yaml
metadata:
  labels:
    scenario: <scenario-name>
```

**Benefits**:
- Easy cleanup: `kubectl delete all -l scenario=<name> --all-namespaces`
- Resource filtering
- Scenario identification in extension

**Example**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
    scenario: with-operator  # Required
spec:
  # ...
```

### Resource Naming

Use generic, non-sensitive names:

**Good Names**:
- `api-service`, `web-app`, `demo-app`
- `app-1`, `app-2`, `service-a`
- `production`, `staging`, `development` (for namespaces)

**Avoid**:
- Real company names
- Real product names
- Customer names
- Internal codenames
- Sensitive identifiers

**Rationale**: Scenarios may be used in screenshots, demos, or shared documentation. Generic names ensure no sensitive data exposure.

### Sharing Custom Scenarios

To share custom scenarios with your team:

1. **Commit to repository**:
   ```bash
   git add scripts/demo-cluster/scenarios/my-custom-scenario.yaml
   git commit -m "docs: add custom scenario for X testing"
   git push
   ```

2. **Document in team wiki** or add comments in YAML file explaining purpose

3. **Update this README** (optional) to document the custom scenario

---

## Related Documentation

- [Main Project README](../../README.md) - Overview of kube9-vscode
- [Contributing Guide](../../CONTRIBUTING.md) - Development guidelines
- [Demo Cluster Scripts Spec](../../ai/specs/cluster/demo-cluster-scripts.spec.md) - Technical specification
- [Demo Cluster Scenarios Spec](../../ai/specs/cluster/demo-cluster-scenarios.spec.md) - Scenario details
- [VSCode Integration Spec](../../ai/specs/cluster/demo-cluster-vscode-integration.spec.md) - Integration details

---

**Happy Testing! 🚀**
