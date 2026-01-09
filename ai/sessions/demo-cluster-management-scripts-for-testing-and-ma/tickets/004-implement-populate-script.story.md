---
story_id: 004-implement-populate-script
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
  - demo-cluster-scenarios
status: completed
---

# Implement populate.sh Script

## Objective

Create the `populate.sh` script that deploys scenario YAML files to the demo cluster with validation and cleanup options.

## Context

This script is the bridge between the cluster and scenario definitions. It validates scenario names, handles existing resources, and applies YAML manifests to create desired cluster states.

## Files to Create/Modify

- `scripts/demo-cluster/populate.sh` (new file)
- `scripts/demo-cluster/scenarios/` directory (create)

## Implementation Details

### Create Scenarios Directory

```bash
mkdir -p scripts/demo-cluster/scenarios
```

### Implement populate.sh

Key requirements from spec:
1. **Show usage**: Display available scenarios if no argument provided
2. **Validate scenario**: Check if scenario file exists
3. **Check cluster running**: Verify demo cluster is accessible
4. **Check existing resources**: Detect resources from previous scenarios
5. **Prompt for cleanup**: Ask user if they want to delete existing resources
6. **Apply scenario**: Use `kubectl apply -f` with demo kubeconfig
7. **Show deployed resources**: List what was created

### Script Structure

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_FILE="./demo-cluster/kubeconfig"
SCENARIOS_DIR="./scripts/demo-cluster/scenarios"

SCENARIO_NAME="$1"
SCENARIO_FILE="${SCENARIOS_DIR}/${SCENARIO_NAME}.yaml"

# 1. Show usage if no arguments
# 2. Validate scenario file exists
# 3. Check cluster is running
# 4. Check for existing resources
# 5. Optionally cleanup existing resources
# 6. Apply scenario
# 7. Show deployed resources
```

### Usage Message

```bash
echo "Usage: $0 <scenario-name>"
echo ""
echo "Available scenarios:"
echo "  with-operator    - Cluster with kube9-operator deployed"
echo "  without-operator - Cluster without operator (Free Tier)"
echo "  healthy          - All workloads in healthy state"
echo "  degraded         - Various workloads in error states"
```

### Environment Variable

```bash
export KUBECONFIG="${KUBECONFIG_FILE}"
```

### Exit Codes

- 0: Success
- 1: Invalid usage, scenario not found, or cluster not running

## Acceptance Criteria

- [ ] File `populate.sh` is created and executable
- [ ] Directory `scenarios/` is created
- [ ] Script shows usage when called without arguments
- [ ] Script validates scenario file exists
- [ ] Script checks cluster is running
- [ ] Script detects existing resources (excluding kube-system)
- [ ] Script prompts for cleanup if resources exist
- [ ] Script applies scenario YAML with demo kubeconfig
- [ ] Script displays deployed resources
- [ ] Script shows next steps (how to launch VSCode debug)
- [ ] Script exits with appropriate codes

## Testing

Run manually:
```bash
# Test usage
./scripts/demo-cluster/populate.sh
# Test invalid scenario
./scripts/demo-cluster/populate.sh invalid-name
# Will fully test after scenarios are created in next story
```

## Time Estimate

20-25 minutes
