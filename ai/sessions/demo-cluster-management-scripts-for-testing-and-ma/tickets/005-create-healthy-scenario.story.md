---
story_id: 005-create-healthy-scenario
session_id: demo-cluster-management-scripts-for-testing-and-ma
feature_id:
  - demo-cluster-management
spec_id:
  - demo-cluster-scenarios
status: pending
---

# Create healthy.yaml Scenario

## Objective

Create the `healthy.yaml` scenario file with all resources in healthy, running states.

## Context

This scenario is used for testing normal operations when everything is working correctly. All pods reach Running state, all probes pass, and replica counts match desired state.

## Files to Create/Modify

- `scripts/demo-cluster/scenarios/healthy.yaml` (new file)

## Implementation Details

### Resources to Include

From `demo-cluster-scenarios` spec:

1. **app-1 and app-2 namespaces**
2. **Healthy Deployments** with readiness/liveness probes that succeed
3. **Healthy StatefulSet** with proper service
4. **Services** that match pod selectors
5. **All resources in Running state**

### Key Requirements

- All resources labeled with `scenario: healthy`
- Use reliable images like `nginx:latest`
- Include readiness and liveness probes that pass
- Replica counts achievable (2-3 replicas)
- Services properly configured
- Conservative resource limits

### Healthy Characteristics

- Pods reach Running state quickly
- All readiness probes pass
- All liveness probes pass
- Services have endpoints
- Deployments reach desired replica count
- No error events generated

### Resource Template with Probes

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: healthy-deployment-1
  namespace: app-1
  labels:
    app: healthy-app-1
    scenario: healthy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: healthy-app-1
  template:
    metadata:
      labels:
        app: healthy-app-1
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
```

### Total Resources

Approximately 12-15 resources across 2 namespaces.

## Acceptance Criteria

- [ ] File `healthy.yaml` created in scenarios/ directory
- [ ] app-1 and app-2 namespaces created
- [ ] Healthy deployments with working probes
- [ ] Healthy StatefulSet included
- [ ] Services properly configured
- [ ] All resources have `scenario: healthy` label
- [ ] Replica counts are achievable
- [ ] Images are reliable (nginx, busybox with sleep command)
- [ ] Resource limits fit in cluster
- [ ] Comments explain purposes
- [ ] YAML syntax is valid
- [ ] When applied, all pods reach Running state
- [ ] All readiness probes pass

## Testing

Test with populate.sh:
```bash
./scripts/demo-cluster/populate.sh healthy
sleep 30 # Wait for pods to start
kubectl get pods --all-namespaces --kubeconfig=demo-cluster/kubeconfig
# Verify all pods in Running state
kubectl get deployments --all-namespaces --kubeconfig=demo-cluster/kubeconfig
# Verify desired replicas match available replicas
```

## Time Estimate

20-25 minutes
