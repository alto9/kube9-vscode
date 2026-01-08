---
story_id: 005-create-with-operator-scenario
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scenarios
status: pending
---

# Create with-operator.yaml Scenario

## Objective

Create the `with-operator.yaml` scenario file that represents a Pro Tier cluster with kube9-operator deployed across multiple namespaces.

## Context

This scenario demonstrates Pro Tier features with the operator and realistic multi-namespace applications. It's used for testing operator integration and taking marketing screenshots.

## Files to Create/Modify

- `scripts/demo-cluster/scenarios/with-operator.yaml` (new file)

## Implementation Details

### Resources to Include

From `demo-cluster-scenarios` spec:

1. **kube9-system namespace** with kube9-operator Deployment (placeholder image: nginx)
2. **production namespace** with api-service Deployment + Service
3. **staging namespace** with web-app Deployment + Service
4. **development namespace** with test-service Deployment

### Key Requirements

- All resources labeled with `scenario: with-operator`
- Generic, non-sensitive names (api-service, web-app, etc.)
- Conservative resource limits (fits in 4GB RAM / 2 CPU cluster)
- Includes comments explaining purpose
- Multiple resources separated by `---`

### Resource Template

```yaml
---
# Comments explaining resource
apiVersion: v1
kind: Namespace
metadata:
  name: kube9-system
  labels:
    scenario: with-operator
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube9-operator
  namespace: kube9-system
  labels:
    app: kube9-operator
    scenario: with-operator
spec:
  replicas: 1
  # ... (see spec for complete details)
```

### Resource Limits

Each container should use conservative limits:
- Small: 64Mi-128Mi memory, 50m-100m CPU
- Medium: 128Mi-256Mi memory, 100m-200m CPU

### Total Resources

Approximately 15-20 resources across 4 namespaces.

## Acceptance Criteria

- [ ] File `with-operator.yaml` created in scenarios/ directory
- [ ] kube9-system namespace with operator deployment
- [ ] production, staging, development namespaces created
- [ ] Sample applications in each namespace
- [ ] All resources have `scenario: with-operator` label
- [ ] Generic names used (no sensitive data)
- [ ] Resource limits fit in cluster constraints
- [ ] Comments explain resource purposes
- [ ] YAML syntax is valid
- [ ] Can be applied successfully: `kubectl apply -f with-operator.yaml`

## Testing

Test with populate.sh:
```bash
./scripts/demo-cluster/start.sh
./scripts/demo-cluster/populate.sh with-operator
kubectl get all --all-namespaces --kubeconfig=demo-cluster/kubeconfig | grep with-operator
```

## Time Estimate

25-30 minutes
