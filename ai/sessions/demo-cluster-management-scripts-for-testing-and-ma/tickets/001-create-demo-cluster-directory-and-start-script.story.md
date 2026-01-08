---
story_id: 001-create-demo-cluster-directory-and-start-script
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
status: pending
---

# Create Demo Cluster Directory and start.sh Script

## Objective

Create the `scripts/demo-cluster/` directory structure and implement the `start.sh` script that creates/starts a Minikube demo cluster with isolated kubeconfig.

## Context

This is the foundation script that creates the isolated demo cluster. It checks for Minikube installation, manages the kube9-demo profile, and exports an isolated kubeconfig file.

## Files to Create/Modify

- `scripts/demo-cluster/start.sh` (new file)
- `demo-cluster/` directory (create if needed)

## Implementation Details

### Create Directory Structure

```bash
mkdir -p scripts/demo-cluster
mkdir -p demo-cluster
```

### Implement start.sh

Key requirements from spec:
1. **Shebang and error handling**: `#!/usr/bin/env bash` with `set -e`
2. **Check Minikube installed**: Exit with helpful message if not found
3. **Check cluster status**: Don't recreate if already running
4. **Create cluster**: Use profile "kube9-demo", 2 CPUs, 4GB RAM, docker driver
5. **Export isolated kubeconfig**: Write to `./demo-cluster/kubeconfig`
6. **Show success message**: Display kubeconfig path and next steps

### Script Structure

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"
KUBECONFIG_DIR="./demo-cluster"
KUBECONFIG_FILE="${KUBECONFIG_DIR}/kubeconfig"

# 1. Check Minikube installed
# 2. Check if cluster already running
# 3. Create kubeconfig directory
# 4. Start Minikube with proper config
# 5. Export isolated kubeconfig
# 6. Display success message with available scenarios
```

### Exit Codes

- 0: Success (started or already running)
- 1: Minikube not found

## Acceptance Criteria

- [ ] Directory `scripts/demo-cluster/` exists
- [ ] File `start.sh` is created and executable (`chmod +x`)
- [ ] Script checks for Minikube installation with helpful error message
- [ ] Script detects if cluster already running and shows appropriate message
- [ ] Minikube starts with profile "kube9-demo", 2 CPUs, 4GB RAM
- [ ] Isolated kubeconfig exported to `./demo-cluster/kubeconfig`
- [ ] Success message displays kubeconfig path and lists available scenarios
- [ ] Script exits with code 0 on success

## Testing

Run manually:
```bash
./scripts/demo-cluster/start.sh
# Verify cluster created: minikube status --profile=kube9-demo
# Verify kubeconfig exists: ls -l demo-cluster/kubeconfig
```

## Time Estimate

20-25 minutes
