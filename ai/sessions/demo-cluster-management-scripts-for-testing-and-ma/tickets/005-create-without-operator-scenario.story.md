---
story_id: 005-create-without-operator-scenario
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scenarios
status: completed
---

# Create without-operator.yaml Scenario

## Objective

Create the `without-operator.yaml` scenario file that represents a Free Tier cluster without the kube9-operator.

## Context

This scenario demonstrates Free Tier functionality where users manage clusters without the operator. It's simpler than with-operator and focuses on basic workload management.

## Files to Create/Modify

- `scripts/demo-cluster/scenarios/without-operator.yaml` (new file)

## Implementation Details

### Resources to Include

From `demo-cluster-scenarios` spec:

1. **default-app namespace** with demo-app Deployment + Service
2. **Additional workloads**: StatefulSet example, DaemonSet example
3. **ConfigMap and Secret** examples (with dummy data)

### Key Requirements

- All resources labeled with `scenario: without-operator`
- NO kube9-operator or kube9-system namespace
- Generic, non-sensitive names
- Conservative resource limits
- Simpler than with-operator scenario
- Includes comments

### Key Difference

This scenario should clearly demonstrate Free Tier by NOT including:
- kube9-system namespace
- kube9-operator deployment
- Pro Tier features

### Total Resources

Approximately 8-10 resources in 1-2 namespaces.

## Acceptance Criteria

- [ ] File `without-operator.yaml` created in scenarios/ directory
- [ ] default-app namespace created
- [ ] Sample demo-app deployment + service
- [ ] StatefulSet and DaemonSet examples included
- [ ] ConfigMap with dummy data included
- [ ] Secret with dummy data included (clearly marked as demo)
- [ ] All resources have `scenario: without-operator` label
- [ ] NO kube9-operator or kube9-system namespace
- [ ] Generic names used
- [ ] Resource limits fit in cluster constraints
- [ ] Comments explain purposes
- [ ] YAML syntax is valid
- [ ] Can be applied successfully

## Testing

Test with populate.sh:
```bash
./scripts/demo-cluster/populate.sh without-operator
kubectl get all --all-namespaces --kubeconfig=demo-cluster/kubeconfig
# Verify no kube9-system namespace
kubectl get namespace kube9-system --kubeconfig=demo-cluster/kubeconfig # Should fail
```

## Time Estimate

20-25 minutes
