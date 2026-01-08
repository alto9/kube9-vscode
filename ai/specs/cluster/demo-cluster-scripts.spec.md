---
spec_id: demo-cluster-scripts
name: Demo Cluster Shell Scripts
description: Technical specification for Minikube-based demo cluster management scripts
feature_id:
  - demo-cluster-management
---

# Demo Cluster Shell Scripts Specification

## Overview

This specification defines the implementation of shell scripts that manage isolated Minikube demo clusters for kube9-vscode development, testing, and marketing purposes. The scripts provide a safe, reproducible environment completely isolated from real production clusters.

## Directory Structure

```
scripts/demo-cluster/
├── start.sh              # Start/create demo cluster
├── stop.sh               # Stop demo cluster (preserve state)
├── reset.sh              # Delete and recreate cluster (clean slate)
├── populate.sh           # Deploy scenario to cluster
└── scenarios/
    ├── with-operator.yaml
    ├── without-operator.yaml
    ├── healthy.yaml
    └── degraded.yaml
```

## Script Specifications

### start.sh

**Purpose**: Start or create the kube9-demo Minikube cluster

**Implementation Details**:

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_DIR="./demo-cluster"
KUBECONFIG_FILE="${KUBECONFIG_DIR}/kubeconfig"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found. Please install Minikube:"
    echo "  macOS: brew install minikube"
    echo "  Linux: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if cluster already exists
if minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Demo cluster is already running"
    echo "Kubeconfig: ${KUBECONFIG_FILE}"
    echo ""
    echo "To populate with a scenario, run:"
    echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
    exit 0
fi

# Create kubeconfig directory
mkdir -p "${KUBECONFIG_DIR}"

# Start Minikube cluster
echo "Starting demo cluster (profile: ${PROFILE})..."
minikube start \
    --profile="${PROFILE}" \
    --cpus=2 \
    --memory=4096 \
    --driver=docker \
    --kubernetes-version=stable

# Export isolated kubeconfig
echo "Exporting isolated kubeconfig..."
MINIKUBE_KUBECONFIG=$(minikube kubectl --profile="${PROFILE}" -- config view --flatten --minify)
echo "${MINIKUBE_KUBECONFIG}" > "${KUBECONFIG_FILE}"

echo ""
echo "✓ Demo cluster started successfully"
echo "✓ Kubeconfig: ${KUBECONFIG_FILE}"
echo ""
echo "Available scenarios:"
echo "  - with-operator    : Cluster with kube9-operator deployed"
echo "  - without-operator : Cluster without operator (Free Tier)"
echo "  - healthy          : All workloads in healthy state"
echo "  - degraded         : Various workloads in error states"
echo ""
echo "To populate with a scenario, run:"
echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
echo ""
echo "To use this cluster in VS Code, run the debug configuration:"
echo "  'Extension (Demo Cluster)'"
```

**Exit Codes**:
- `0`: Success (cluster started or already running)
- `1`: Minikube not found
- Non-zero: Minikube start failed

**Environment Variables**:
- None required

**Dependencies**:
- `minikube` command must be in PATH
- Docker or appropriate driver must be available

### stop.sh

**Purpose**: Stop the demo cluster without deleting data

**Implementation Details**:

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found"
    exit 1
fi

# Check if cluster is running
if ! minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Demo cluster is not running"
    exit 0
fi

# Stop the cluster
echo "Stopping demo cluster (profile: ${PROFILE})..."
minikube stop --profile="${PROFILE}"

echo ""
echo "✓ Demo cluster stopped"
echo ""
echo "The cluster state has been preserved."
echo "To restart, run: ./scripts/demo-cluster/start.sh"
echo "To delete completely, run: ./scripts/demo-cluster/reset.sh"
```

**Exit Codes**:
- `0`: Success (cluster stopped or not running)
- `1`: Minikube not found
- Non-zero: Minikube stop failed

### reset.sh

**Purpose**: Delete and recreate the demo cluster (clean slate)

**Implementation Details**:

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_DIR="./demo-cluster"
KUBECONFIG_FILE="${KUBECONFIG_DIR}/kubeconfig"

# Check if Minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "Error: Minikube not found"
    exit 1
fi

# Prompt for confirmation
echo "WARNING: This will DELETE the demo cluster and all its resources."
echo "Profile: ${PROFILE}"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled"
    exit 0
fi

# Delete existing cluster if it exists
if minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Deleting existing demo cluster..."
    minikube delete --profile="${PROFILE}"
fi

# Remove old kubeconfig
rm -f "${KUBECONFIG_FILE}"

# Create fresh cluster
echo "Creating fresh demo cluster..."
minikube start \
    --profile="${PROFILE}" \
    --cpus=2 \
    --memory=4096 \
    --driver=docker \
    --kubernetes-version=stable

# Export isolated kubeconfig
echo "Exporting isolated kubeconfig..."
mkdir -p "${KUBECONFIG_DIR}"
MINIKUBE_KUBECONFIG=$(minikube kubectl --profile="${PROFILE}" -- config view --flatten --minify)
echo "${MINIKUBE_KUBECONFIG}" > "${KUBECONFIG_FILE}"

echo ""
echo "✓ Demo cluster reset complete"
echo "✓ Kubeconfig: ${KUBECONFIG_FILE}"
echo ""
echo "To populate with a scenario, run:"
echo "  ./scripts/demo-cluster/populate.sh <scenario-name>"
```

**Exit Codes**:
- `0`: Success (cluster reset or user cancelled)
- `1`: Minikube not found
- Non-zero: Minikube operation failed

**Interactive Prompts**:
- Confirmation prompt before deletion
- Supports 'Y', 'y' to confirm
- Any other input cancels operation

### populate.sh

**Purpose**: Deploy a scenario to the demo cluster

**Implementation Details**:

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_FILE="./demo-cluster/kubeconfig"
SCENARIOS_DIR="./scripts/demo-cluster/scenarios"

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <scenario-name>"
    echo ""
    echo "Available scenarios:"
    echo "  with-operator    - Cluster with kube9-operator deployed"
    echo "  without-operator - Cluster without operator (Free Tier)"
    echo "  healthy          - All workloads in healthy state"
    echo "  degraded         - Various workloads in error states"
    echo ""
    echo "Example:"
    echo "  $0 with-operator"
    exit 1
fi

SCENARIO_NAME="$1"
SCENARIO_FILE="${SCENARIOS_DIR}/${SCENARIO_NAME}.yaml"

# Validate scenario exists
if [ ! -f "${SCENARIO_FILE}" ]; then
    echo "Error: Scenario '${SCENARIO_NAME}' not found"
    echo "File does not exist: ${SCENARIO_FILE}"
    echo ""
    echo "Available scenarios:"
    for scenario in "${SCENARIOS_DIR}"/*.yaml; do
        basename=$(basename "${scenario}" .yaml)
        echo "  - ${basename}"
    done
    exit 1
fi

# Check if Minikube cluster is running
if ! minikube status --profile="${PROFILE}" &> /dev/null; then
    echo "Error: Demo cluster is not running"
    echo "Start it first: ./scripts/demo-cluster/start.sh"
    exit 1
fi

# Check if kubeconfig exists
if [ ! -f "${KUBECONFIG_FILE}" ]; then
    echo "Error: Kubeconfig not found: ${KUBECONFIG_FILE}"
    exit 1
fi

# Check if cluster has existing resources (except kube-system)
export KUBECONFIG="${KUBECONFIG_FILE}"
RESOURCE_COUNT=$(kubectl get all --all-namespaces --ignore-not-found | grep -v "kube-system" | wc -l)

if [ "${RESOURCE_COUNT}" -gt 1 ]; then
    echo "Warning: Demo cluster contains existing resources"
    echo ""
    read -p "Delete all existing resources before deploying scenario? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleaning up existing resources..."
        # Delete all namespaces except kube-system, kube-public, kube-node-lease, default
        kubectl get namespaces -o json | \
            jq -r '.items[] | select(.metadata.name | IN("kube-system", "kube-public", "kube-node-lease", "default") | not) | .metadata.name' | \
            xargs -I {} kubectl delete namespace {} --wait=false 2>/dev/null || true
        
        # Delete resources in default namespace
        kubectl delete all --all -n default --wait=false 2>/dev/null || true
        
        echo "Waiting for cleanup to complete..."
        sleep 5
    fi
fi

# Apply scenario
echo "Deploying scenario: ${SCENARIO_NAME}..."
kubectl apply -f "${SCENARIO_FILE}"

# Wait for resources to be created
echo "Waiting for resources to be created..."
sleep 3

# Show deployed resources
echo ""
echo "✓ Scenario '${SCENARIO_NAME}' deployed successfully"
echo ""
echo "Created resources:"
kubectl get all --all-namespaces | grep -v "kube-system" || echo "No resources created yet (may be pending)"

echo ""
echo "To view the cluster in VS Code, run the debug configuration:"
echo "  'Extension (Demo Cluster)'"
```

**Exit Codes**:
- `0`: Success
- `1`: Invalid usage, scenario not found, or cluster not running
- Non-zero: kubectl apply failed

**Environment Variables Used**:
- `KUBECONFIG`: Set to isolated demo cluster kubeconfig

**Dependencies**:
- `kubectl` command must be in PATH
- `jq` command for JSON processing (optional, graceful degradation)

## Kubeconfig Isolation Strategy

### Isolated Kubeconfig File

**Location**: `./demo-cluster/kubeconfig`

**Generation Method**:
```bash
minikube kubectl --profile=kube9-demo -- config view --flatten --minify
```

**Key Properties**:
- Contains ONLY the kube9-demo cluster context
- Does NOT merge with ~/.kube/config
- Can be safely shared for documentation/screenshots
- Must be explicitly set via KUBECONFIG environment variable

**Usage in Scripts**:
```bash
export KUBECONFIG="./demo-cluster/kubeconfig"
kubectl get pods  # Only sees demo cluster
```

**Usage in VS Code**:
```json
{
  "name": "Extension (Demo Cluster)",
  "type": "extensionHost",
  "env": {
    "KUBECONFIG": "${workspaceFolder}/demo-cluster/kubeconfig"
  }
}
```

## Minikube Configuration

### Cluster Profile

**Profile Name**: `kube9-demo`

**Purpose**: Namespace all demo cluster operations to avoid conflicts

**Resource Allocation**:
- **CPUs**: 2
- **Memory**: 4096 MB (4 GB)
- **Driver**: docker (preferred), fallback to kvm2 on Linux
- **Kubernetes Version**: stable (latest stable release)

**Rationale**:
- 2 CPUs and 4GB RAM are adequate for extension testing
- Docker driver is most portable across platforms
- Stable Kubernetes version ensures compatibility

### Driver Selection

**Primary**: Docker
```bash
minikube start --driver=docker
```

**Fallback** (Linux): KVM2
```bash
# If Docker fails, scripts could detect and try kvm2
minikube start --driver=kvm2
```

**Detection**:
```bash
# Let Minikube auto-detect driver
minikube start  # Will choose best available driver
```

## Error Handling

### Minikube Not Found

**Detection**: `command -v minikube` returns non-zero

**Message**:
```
Error: Minikube not found. Please install Minikube:
  macOS: brew install minikube
  Linux: https://minikube.sigs.k8s.io/docs/start/
```

**Exit Code**: 1

### Cluster Already Running (start.sh)

**Detection**: `minikube status --profile=kube9-demo` succeeds

**Message**:
```
Demo cluster is already running
Kubeconfig: ./demo-cluster/kubeconfig
```

**Exit Code**: 0 (not an error)

### Cluster Not Running (populate.sh)

**Detection**: `minikube status --profile=kube9-demo` fails

**Message**:
```
Error: Demo cluster is not running
Start it first: ./scripts/demo-cluster/start.sh
```

**Exit Code**: 1

### Invalid Scenario Name

**Detection**: Scenario YAML file does not exist

**Message**:
```
Error: Scenario 'invalid-name' not found
File does not exist: ./scripts/demo-cluster/scenarios/invalid-name.yaml

Available scenarios:
  - with-operator
  - without-operator
  - healthy
  - degraded
```

**Exit Code**: 1

### kubectl Not Found

**Detection**: `command -v kubectl` returns non-zero

**Message**:
```
Error: kubectl not found. Please install kubectl:
  https://kubernetes.io/docs/tasks/tools/
```

**Exit Code**: 1

## Output Formatting

### Success Messages

Use checkmark prefix: `✓ <message>`

Examples:
```
✓ Demo cluster started successfully
✓ Scenario 'healthy' deployed successfully
✓ Demo cluster reset complete
```

### Progress Messages

No prefix, descriptive action:
```
Starting demo cluster (profile: kube9-demo)...
Deploying scenario: with-operator...
Waiting for resources to be created...
```

### Error Messages

`Error:` prefix, followed by actionable guidance:
```
Error: Minikube not found. Please install Minikube:
  macOS: brew install minikube
```

### Guidance Messages

Blank line before/after, clear next steps:
```

To populate with a scenario, run:
  ./scripts/demo-cluster/populate.sh <scenario-name>

```

## Shell Script Standards

### Shebang

```bash
#!/usr/bin/env bash
```

**Rationale**: More portable than `#!/bin/bash`

### Error Handling

```bash
set -e  # Exit on error
```

**Rationale**: Fail fast on any command error

### Variable Naming

- Constants: UPPER_SNAKE_CASE
- Local variables: lower_snake_case

Examples:
```bash
PROFILE="kube9-demo"
scenario_name="$1"
```

### Quoting

- Always quote variables: `"${VARIABLE}"`
- Prevents word splitting and glob expansion

### Comments

- Comment non-obvious operations
- Explain "why" not "what"

Example:
```bash
# Use --flatten to embed certificates directly in kubeconfig
minikube kubectl -- config view --flatten
```

## Testing Considerations

### Manual Testing Checklist

- [ ] `start.sh` creates new cluster successfully
- [ ] `start.sh` detects existing cluster
- [ ] `stop.sh` stops running cluster
- [ ] `stop.sh` handles non-running cluster gracefully
- [ ] `reset.sh` prompts for confirmation
- [ ] `reset.sh` allows cancellation
- [ ] `reset.sh` recreates cluster successfully
- [ ] `populate.sh` shows usage without arguments
- [ ] `populate.sh` detects invalid scenario names
- [ ] `populate.sh` applies scenario successfully
- [ ] `populate.sh` prompts to clean existing resources
- [ ] Kubeconfig is properly isolated
- [ ] Scripts work on macOS
- [ ] Scripts work on Linux
- [ ] Error messages are helpful

### Edge Cases

1. **Minikube version incompatibility**: Scripts should work with Minikube v1.30+
2. **Insufficient system resources**: Minikube will fail with clear message
3. **Port conflicts**: Minikube handles automatically by using different ports
4. **Multiple minikube profiles**: kube9-demo profile isolates our cluster
5. **Concurrent script execution**: Minikube handles locking automatically

## Security Considerations

### Isolated Kubeconfig

- Never merge with user's main ~/.kube/config
- Prevents accidental operations on real clusters
- Safe to share for documentation/screenshots

### No Sensitive Data

- Scenarios use generic names (app-1, service-a)
- No real company data or secrets
- Safe for marketing materials

### Local Only

- Cluster runs locally on developer's machine
- No external network exposure
- No cloud provider credentials required

## Platform Support

### macOS

**Driver**: Docker Desktop
**Installation**:
```bash
brew install minikube
brew install kubectl
```

### Linux

**Driver**: Docker or KVM2
**Installation**:
```bash
# Ubuntu/Debian
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### Windows (WSL2)

**Driver**: Docker Desktop with WSL2 backend
**Installation**: Same as Linux, run in WSL2 environment

**Note**: Scripts use bash and should run in WSL2 on Windows

## Future Enhancements

### Potential Improvements

1. **Auto-detect driver**: Try docker first, fallback to kvm2/hyperkit
2. **Configurable resources**: Allow CPU/memory override via env vars
3. **Scenario validation**: Validate YAML before applying
4. **Cluster health check**: Verify cluster is healthy before populate
5. **Resource wait**: Wait for Deployments to be Ready after populate
6. **Logging**: Optional verbose mode for debugging
7. **Cleanup timeout**: Add timeout to resource deletion in populate.sh
8. **Multi-scenario**: Support applying multiple scenarios at once
9. **Scenario diff**: Show what will be created before applying
10. **Status command**: New script to show cluster status and resources

### Extensibility

**Adding New Scenarios**:
1. Create new YAML file in `scenarios/` directory
2. File automatically detected by `populate.sh`
3. Name format: `<scenario-name>.yaml`

**Custom Configuration**:
```bash
# Could support environment variables
MINIKUBE_CPUS=4 MINIKUBE_MEMORY=8192 ./scripts/demo-cluster/start.sh
```

## Dependencies

### Required

- **minikube**: v1.30.0 or later
- **kubectl**: v1.28.0 or later
- **bash**: v4.0 or later
- **Docker** or **KVM2**: For Minikube driver

### Optional

- **jq**: For JSON processing in populate.sh cleanup (graceful degradation if missing)

### Not Required

- No NPM dependencies
- No Python dependencies
- Standalone shell scripts

## Documentation

### README.md for scripts/demo-cluster/

Should include:
- Overview of demo cluster system
- Prerequisites and installation
- Usage examples for each script
- Scenario descriptions
- Troubleshooting guide
- VSCode debug configuration instructions

### Inline Script Documentation

Each script should have header comment:
```bash
#!/usr/bin/env bash
# start.sh - Start or create the kube9-demo Minikube cluster
#
# Usage: ./start.sh
#
# This script creates an isolated demo cluster for testing kube9-vscode
# features without affecting real clusters.
```

## Implementation Checklist

- [ ] Create scripts/demo-cluster/ directory
- [ ] Implement start.sh with Minikube profile creation
- [ ] Implement stop.sh with cluster pause
- [ ] Implement reset.sh with confirmation prompt
- [ ] Implement populate.sh with scenario deployment
- [ ] Create scenarios/ subdirectory
- [ ] Make all scripts executable (chmod +x)
- [ ] Test on macOS with Docker driver
- [ ] Test on Linux with Docker driver
- [ ] Verify kubeconfig isolation
- [ ] Add README.md with usage instructions
- [ ] Document in main project README
- [ ] Create VSCode debug configuration
- [ ] Test all error scenarios
- [ ] Verify no interference with real clusters
