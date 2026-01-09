---
story_id: 005-create-degraded-scenario
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scenarios
status: completed
---

# Create degraded.yaml Scenario

## Objective

Create the `degraded.yaml` scenario file with various resources in error states for testing troubleshooting features.

## Context

This scenario intentionally creates various error conditions to test the extension's ability to display and handle degraded cluster states. It's used for testing error handling and troubleshooting workflows.

## Files to Create/Modify

- `scripts/demo-cluster/scenarios/degraded.yaml` (new file)

## Implementation Details

### Resources to Include

From `demo-cluster-scenarios` spec:

1. **broken-apps namespace**
2. **CrashLoopBackOff deployment** - container exits immediately with error
3. **ImagePullBackOff deployment** - nonexistent image
4. **Pending deployment** - requests too many resources
5. **Failed readiness probe deployment** - probes to nonexistent endpoint
6. **Insufficient replicas deployment** - can't fit all replicas
7. **Service with no endpoints** - selector matches nothing
8. **Failed job** - job that exits with error

### Error State Examples

**CrashLoopBackOff:**
```yaml
containers:
- name: app
  image: busybox:latest
  command: ["sh", "-c", "exit 1"]  # Immediately exits
```

**ImagePullBackOff:**
```yaml
containers:
- name: app
  image: nonexistent-registry.io/fake-image:latest
```

**Pending (Insufficient Resources):**
```yaml
resources:
  requests:
    memory: "10Gi"  # More than cluster has
    cpu: "8"
```

**Failed Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /nonexistent-endpoint
    port: 80
```

### Key Requirements

- All resources labeled with `scenario: degraded`
- Mix of different error types
- Realistic error conditions
- Conservative enough to not crash cluster
- Includes comments explaining each error

### Total Resources

Approximately 10-12 resources with various error states.

## Acceptance Criteria

- [ ] File `degraded.yaml` created in scenarios/ directory
- [ ] broken-apps namespace created
- [ ] CrashLoopBackOff deployment included
- [ ] ImagePullBackOff deployment included
- [ ] Pending deployment included (insufficient resources)
- [ ] Failed readiness probe deployment included
- [ ] Insufficient replicas deployment included
- [ ] Service with no endpoints included
- [ ] Failed job included
- [ ] All resources have `scenario: degraded` label
- [ ] Comments explain each error condition
- [ ] YAML syntax is valid
- [ ] When applied, resources reach expected error states
- [ ] Error states are realistic and useful for testing

## Testing

Test with populate.sh:
```bash
./scripts/demo-cluster/populate.sh degraded
sleep 60 # Wait for error states to manifest
kubectl get pods --all-namespaces --kubeconfig=demo-cluster/kubeconfig
# Should see various error states: CrashLoopBackOff, ImagePullBackOff, Pending, etc.
kubectl describe pods -n broken-apps --kubeconfig=demo-cluster/kubeconfig
# Should see error events
```

## Time Estimate

25-30 minutes
