---
story_id: 002-implement-stop-script
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scripts
status: completed
---

# Implement stop.sh Script

## Objective

Create the `stop.sh` script that stops the demo cluster while preserving its state for later restart.

## Context

This script provides a way to pause the demo cluster without deleting data, allowing quick restarts. It's useful when developers finish testing but want to preserve cluster state.

## Files to Create/Modify

- `scripts/demo-cluster/stop.sh` (new file)

## Implementation Details

### Implement stop.sh

Key requirements from spec:
1. **Check Minikube installed**: Exit gracefully if not found
2. **Check cluster status**: Handle gracefully if not running
3. **Stop cluster**: Use `minikube stop --profile=kube9-demo`
4. **Show success message**: Indicate state preserved and how to restart

### Script Structure

```bash
#!/usr/bin/env bash
set -e

PROFILE="kube9-demo"

# 1. Check Minikube installed
# 2. Check if cluster is running
# 3. Stop the cluster
# 4. Display success message with restart instructions
```

### Exit Codes

- 0: Success (stopped or not running)
- 1: Minikube not found

## Acceptance Criteria

- [ ] File `stop.sh` is created and executable
- [ ] Script checks for Minikube installation
- [ ] Script handles case when cluster not running (no error)
- [ ] Cluster stops successfully with `minikube stop`
- [ ] Success message explains state is preserved
- [ ] Message includes restart instructions
- [ ] Script exits with code 0

## Testing

Run manually:
```bash
# After starting cluster with start.sh
./scripts/demo-cluster/stop.sh
# Verify cluster stopped: minikube status --profile=kube9-demo
# Restart and verify state preserved: ./scripts/demo-cluster/start.sh
```

## Time Estimate

10-15 minutes
