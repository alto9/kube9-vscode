---
session_id: demo-cluster-management-scripts-for-testing-and-ma
start_time: '2026-01-08T14:54:43.220Z'
status: development
problem_statement: Demo Cluster Management Scripts for Testing and Marketing
changed_files:
  - path: ai/features/cluster/demo-cluster-management.feature.md
    change_type: added
    scenarios_added:
      - Start demo cluster for the first time
      - Start demo cluster when already running
      - Stop demo cluster
      - Stop demo cluster when not running
      - Reset demo cluster to clean state
      - Cancel demo cluster reset
      - Populate demo cluster with operator scenario
      - Populate demo cluster with healthy workloads scenario
      - Populate demo cluster with degraded workloads scenario
      - Populate demo cluster without operator scenario
      - Switch between scenarios
      - Launch VSCode debug with demo cluster
      - Take marketing screenshots with demo cluster
      - List available scenarios
      - Handle invalid scenario name
      - Handle Minikube not installed
      - Demo cluster kubeconfig isolation
      - Clean demo environment
      - Demo cluster resource configuration
      - Scenario definitions are easily modifiable
      - Demo cluster for QA regression testing
      - Demo cluster for presentation demos
      - Verify demo cluster isolation
      - Stop and restart demo cluster preserves data
      - Multiple developers use independent demo clusters
      - Script provides helpful output
start_commit: fea53fcdbc77c2c7144fe9a78dcfe273dda7297a
end_time: '2026-01-08T15:06:18.487Z'
---
## Problem Statement

Demo Cluster Management Scripts for Testing and Marketing

## Goals

1. **Enable Safe Testing**: Provide developers with an isolated Minikube-based demo cluster that completely isolates them from real production clusters
2. **Support Marketing Needs**: Create reproducible, realistic cluster states for screenshots and demos without exposing sensitive data
3. **Improve QA Workflow**: Enable reproducible test environments for regression testing and bug verification
4. **Simplify Development**: Reduce friction in testing extension features by providing easy cluster setup and teardown
5. **Ensure Complete Isolation**: Guarantee that demo cluster operations never affect real clusters in ~/.kube/config

## Approach

### Architecture

**Minikube-Based Solution**:
- Single Minikube cluster with profile "kube9-demo"
- Completely isolated kubeconfig file in `demo-cluster/kubeconfig`
- Shell scripts for cluster lifecycle management
- YAML-based scenario definitions for different cluster states

**Four Core Scripts**:
1. `start.sh` - Create/start demo cluster and export isolated kubeconfig
2. `stop.sh` - Stop cluster while preserving state
3. `reset.sh` - Delete and recreate cluster for clean slate
4. `populate.sh` - Deploy scenarios to cluster

**Four Initial Scenarios**:
1. `with-operator.yaml` - Pro Tier with kube9-operator
2. `without-operator.yaml` - Free Tier without operator
3. `healthy.yaml` - All resources in healthy state
4. `degraded.yaml` - Various error states for troubleshooting testing

### VSCode Integration

**Debug Configuration**:
- New launch configuration "Extension (Demo Cluster)" in `.vscode/launch.json`
- Sets `KUBECONFIG` environment variable to demo cluster kubeconfig
- Extension Development Host sees only demo cluster
- Complete isolation from real clusters

### Workflow

1. Developer runs `start.sh` to create demo cluster
2. Developer runs `populate.sh <scenario>` to deploy desired state
3. Developer launches "Extension (Demo Cluster)" debug configuration in VSCode
4. Developer tests features safely against demo cluster
5. Developer runs `stop.sh` to pause or `reset.sh` to clean up

## Key Decisions

### Decision 1: Minikube Over KIND

**Rationale**: Minikube provides full Kubernetes feature set needed for operator and Helm testing, while KIND is faster but more limited. Minikube's profile feature provides excellent isolation.

### Decision 2: Isolated Kubeconfig File

**Rationale**: Never merge with ~/.kube/config to prevent accidental operations on real clusters. Use dedicated file at `demo-cluster/kubeconfig` that must be explicitly referenced via `KUBECONFIG` environment variable.

### Decision 3: Single Cluster with Scenario Switching

**Rationale**: Simpler than multiple Minikube profiles. One cluster (kube9-demo) can be populated with different scenarios. Switching scenarios is faster than creating new clusters.

### Decision 4: Shell Scripts Over NPM Scripts

**Rationale**: Shell scripts are platform-agnostic, don't require Node.js installation, and are simpler to understand and modify. They work equally well on developer machines and CI/CD environments.

### Decision 5: YAML Scenario Definitions

**Rationale**: Standard Kubernetes YAML is familiar to developers, easy to modify, and can include comments. Scenarios are composable and can be version-controlled alongside code.

### Decision 6: Environment Variable for VSCode Integration

**Rationale**: Using `KUBECONFIG` environment variable in launch.json provides complete isolation with zero code changes. Extension automatically respects this standard Kubernetes environment variable.

### Decision 7: Conservative Resource Allocation

**Rationale**: 2 CPUs and 4GB RAM fits comfortably on most developer machines while providing adequate resources for testing scenarios with multiple namespaces and workloads.

### Decision 8: Confirmation Prompts for Destructive Operations

**Rationale**: `reset.sh` prompts for confirmation before deleting cluster. `populate.sh` prompts before cleaning existing resources. Prevents accidental data loss.

## Notes

### Integration with Existing Patterns

- Follows existing kubectl integration patterns from other features
- Uses same error handling approaches as pod-terminal, workload-restart, etc.
- Consistent with extension's tree view and command structure

### Generic Naming Convention

All scenario resources use generic, non-sensitive names:
- Namespaces: production, staging, development
- Applications: api-service, web-app, demo-app
- Safe for marketing materials and public demos

### Platform Support

Scripts designed to work on:
- macOS (Homebrew, Docker Desktop)
- Linux (Docker, KVM2)
- Windows WSL2 (Docker Desktop with WSL2 backend)

### Extensibility

**Easy to Extend**:
- New scenarios: Just add YAML file to scenarios/ directory
- Custom scenarios: Developers can create project-specific scenarios
- Script enhancements: Shell scripts are easy to modify and contribute
- Additional launch configs: Can create scenario-specific debug configurations

### Safety Features

**Multiple Isolation Layers**:
1. Separate Minikube profile (kube9-demo)
2. Isolated kubeconfig file (not merged with system)
3. Environment variable scope (only Extension Dev Host)
4. Clear naming (kube9-demo indicates demo cluster)

**Visual Indicators** (Future Enhancement):
- Status bar could show "Demo Cluster" mode
- Orange color to indicate demo environment
- Tooltip explaining isolation

### Performance Characteristics

**Timing Expectations**:
- First-time cluster creation: 1-2 minutes
- Scenario deployment: 30-60 seconds
- Extension launch: 10-20 seconds
- Stop/start cycle: 20-30 seconds
- Reset (delete + recreate): 2-3 minutes

**Resource Footprint**:
- Disk: ~2GB for Minikube cluster
- Memory: 4GB allocated to cluster
- CPU: 2 cores allocated to cluster

### Documentation Needs

**Developer Documentation**:
- README section explaining demo cluster usage
- Troubleshooting guide for common issues
- Platform-specific installation instructions

**Scenario Documentation**:
- Description of each scenario's purpose
- What resources each scenario creates
- When to use each scenario

### Future Enhancements Considered

1. **Auto-start on Debug**: Launch task could automatically start cluster if not running
2. **Multi-scenario Launch Configs**: Pre-configured debug configs for specific scenarios
3. **Screenshot Helper Command**: Prepare views for optimal screenshot composition
4. **Demo Mode Banner**: Visual indicator in Extension Dev Host showing demo mode
5. **Scenario Validation**: Pre-apply validation of scenario YAML files
6. **Resource Wait**: Wait for deployments to be ready after populate
7. **Cluster Health Check**: Verify cluster is healthy before populate
8. **Custom Configuration**: Environment variables for CPU/memory overrides

### Testing Strategy

**Manual Testing Required**:
- All scripts on each platform (macOS, Linux, WSL2)
- All scenarios deploy successfully
- VSCode debug configuration works correctly
- Extension loads only demo cluster
- No interference with real clusters

**Automated Testing Potential**:
- Could add integration tests that use demo cluster
- Test suite runs against known cluster state
- Reproducible test environment for CI/CD

### Related GitHub Issue

Based on: https://github.com/alto9/kube9-vscode/issues/75

**Issue Requirements Addressed**:
- ✓ Safe testing environment without exposing real clusters
- ✓ Marketing screenshot capability with generic data
- ✓ Easy scenario switching
- ✓ Complete isolation from real clusters
- ✓ Minikube-based implementation
- ✓ YAML-based scenario definitions
- ✓ VSCode debug configuration integration
- ✓ Scripts for start, stop, reset, populate
- ✓ Multiple scenarios (with/without operator, healthy, degraded)
