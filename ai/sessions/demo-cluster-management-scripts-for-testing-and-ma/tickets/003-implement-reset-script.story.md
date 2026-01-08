---
story_id: 003-implement-reset-script
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
status: pending
---

# Implement reset.sh Script

## Objective

Create the `reset.sh` script that deletes and recreates the demo cluster for a clean slate.

## Context

This script provides complete cluster reset functionality with confirmation prompt to prevent accidental deletion. It's useful when developers need a fresh environment or want to clean up completely.

## Files to Create/Modify

- `scripts/demo-cluster/reset.sh` (new file)

## Implementation Details

### Implement reset.sh

Key requirements from spec:
1. **Confirmation prompt**: Ask user to confirm before deletion
2. **Allow cancellation**: Exit gracefully if user cancels
3. **Delete existing cluster**: `minikube delete --profile=kube9-demo`
4. **Remove old kubeconfig**: Delete `./demo-cluster/kubeconfig`
5. **Create fresh cluster**: Same specs as start.sh
6. **Export new kubeconfig**: Generate fresh isolated kubeconfig
7. **Show success message**: Indicate fresh cluster ready

### Script Structure

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_DIR="./demo-cluster"
KUBECONFIG_FILE="${KUBECONFIG_DIR}/kubeconfig"

# 1. Check Minikube installed
# 2. Prompt for confirmation
# 3. Delete existing cluster if exists
# 4. Remove old kubeconfig
# 5. Create fresh cluster
# 6. Export new kubeconfig
# 7. Display success message
```

### Confirmation Prompt

```bash
echo "WARNING: This will DELETE the demo cluster and all its resources."
echo "Profile: ${PROFILE}"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled"
    exit 0
fi
```

### Exit Codes

- 0: Success (reset complete or user cancelled)
- 1: Minikube not found

## Acceptance Criteria

- [ ] File `reset.sh` is created and executable
- [ ] Script checks for Minikube installation
- [ ] Script displays warning before deletion
- [ ] Confirmation prompt accepts Y/y to proceed
- [ ] User can cancel operation (any other input)
- [ ] Existing cluster deleted with `minikube delete`
- [ ] Old kubeconfig file removed
- [ ] Fresh cluster created with same specs as start.sh
- [ ] New kubeconfig exported
- [ ] Success message displays next steps
- [ ] Script exits with code 0

## Testing

Run manually:
```bash
# After starting and populating cluster
./scripts/demo-cluster/reset.sh
# Test cancellation: Type 'n' at prompt
# Test reset: Type 'y' at prompt
# Verify clean cluster: kubectl get all --all-namespaces --kubeconfig=demo-cluster/kubeconfig
```

## Time Estimate

15-20 minutes
