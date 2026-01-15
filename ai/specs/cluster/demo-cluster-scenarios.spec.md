---
spec_id: demo-cluster-scenarios
name: Demo Cluster Scenario Definitions
description: Technical specification for YAML scenario definitions used to populate demo clusters
feature_id:
  - demo-cluster-management
---

# Demo Cluster Scenario Definitions Specification

## Overview

This specification defines the structure and content of YAML scenario files used to populate the demo cluster with different resource configurations. Each scenario represents a specific cluster state useful for testing, development, or marketing purposes.

## Scenario File Structure

### File Location

```
scripts/demo-cluster/scenarios/
├── with-operator.yaml       # Cluster with kube9-operator installed
├── without-operator.yaml    # Free tier cluster (no operator)
├── healthy.yaml             # All resources in healthy state
└── degraded.yaml            # Resources with various error states
```

### File Format

- Standard Kubernetes YAML manifests
- Multiple resources separated by `---`
- Comments to explain resource purpose
- Generic naming (no sensitive data)

### Standard Structure

```yaml
---
# Namespace definitions (if creating new namespaces)
apiVersion: v1
kind: Namespace
metadata:
  name: demo-namespace
  labels:
    purpose: demo
    scenario: <scenario-name>
---
# Resource definitions
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-name
  namespace: demo-namespace
  labels:
    app: app-name
    scenario: <scenario-name>
spec:
  # Resource specification
---
# Additional resources...
```

## Scenario: with-operator.yaml

### Purpose

Demonstrate kube9-vscode Pro Tier features with the kube9-operator deployed.

### Resources to Include

#### 1. Kube9-Operator Namespace

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube9-system
  labels:
    name: kube9-system
    scenario: with-operator
```

#### 2. Kube9-Operator Deployment

```yaml
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
  selector:
    matchLabels:
      app: kube9-operator
  template:
    metadata:
      labels:
        app: kube9-operator
    spec:
      containers:
      - name: operator
        image: nginx:latest  # Placeholder for demo purposes
        ports:
        - containerPort: 8080
        env:
        - name: OPERATOR_MODE
          value: "demo"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

**Note**: For actual functionality, this should reference the real kube9-operator image and configuration. For demo purposes, a placeholder image is acceptable.

#### 3. Application Namespaces

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    scenario: with-operator
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
    scenario: with-operator
---
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    environment: development
    scenario: with-operator
```

#### 4. Sample Applications

**Production Namespace**:
```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    tier: backend
    scenario: with-operator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        tier: backend
    spec:
      containers:
      - name: api
        image: nginx:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    scenario: with-operator
spec:
  selector:
    app: api-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

**Staging Namespace**:
```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: staging
  labels:
    app: web-app
    tier: frontend
    scenario: with-operator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        tier: frontend
    spec:
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: staging
  labels:
    app: web-app
    scenario: with-operator
spec:
  selector:
    app: web-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: NodePort
```

**Development Namespace**:
```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-service
  namespace: development
  labels:
    app: test-service
    scenario: with-operator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-service
  template:
    metadata:
      labels:
        app: test-service
    spec:
      containers:
      - name: test
        image: busybox:latest
        command: ["sleep", "3600"]
```

#### 5. Additional Resources

- **ConfigMaps**: For demonstrating configuration management
- **Secrets**: For demonstrating secret handling (with dummy data)
- **PersistentVolumeClaims**: For demonstrating storage
- **Jobs/CronJobs**: For demonstrating batch workloads

**Total Resources**: ~15-20 resources across multiple namespaces

## Scenario: without-operator.yaml

### Purpose

Demonstrate kube9-vscode Free Tier features without the kube9-operator.

### Resources to Include

#### 1. Application Namespace

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: default-app
  labels:
    scenario: without-operator
```

#### 2. Sample Application

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: default-app
  labels:
    app: demo-app
    scenario: without-operator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  namespace: default-app
  labels:
    app: demo-app
    scenario: without-operator
spec:
  selector:
    app: demo-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

#### 3. Additional Workloads

- StatefulSet example
- DaemonSet example
- Simple ConfigMap
- Simple Secret (dummy data)

**Key Difference**: No kube9-operator namespace or deployment

**Total Resources**: ~8-10 resources

## Scenario: healthy.yaml

### Purpose

All resources in healthy, running state for testing normal operations.

### Resources to Include

#### 1. Multiple Namespaces

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-1
  labels:
    scenario: healthy
---
apiVersion: v1
kind: Namespace
metadata:
  name: app-2
  labels:
    scenario: healthy
```

#### 2. Healthy Deployments

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
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
```

#### 3. Healthy StatefulSet

```yaml
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: healthy-statefulset
  namespace: app-2
  labels:
    app: healthy-stateful
    scenario: healthy
spec:
  serviceName: healthy-stateful
  replicas: 2
  selector:
    matchLabels:
      app: healthy-stateful
  template:
    metadata:
      labels:
        app: healthy-stateful
    spec:
      containers:
      - name: stateful
        image: nginx:latest
        ports:
        - containerPort: 80
```

#### 4. Services

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: healthy-service-1
  namespace: app-1
  labels:
    scenario: healthy
spec:
  selector:
    app: healthy-app-1
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

**Characteristics**:
- All Pods reach Running state
- All readiness/liveness probes pass
- Replica counts match desired state
- No error events

**Total Resources**: ~12-15 resources

## Scenario: degraded.yaml

### Purpose

Various resources in error states for testing troubleshooting features.

### Resources to Include

#### 1. Namespace

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: broken-apps
  labels:
    scenario: degraded
```

#### 2. CrashLooping Pod

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crashloop-deployment
  namespace: broken-apps
  labels:
    app: crashloop-app
    scenario: degraded
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crashloop-app
  template:
    metadata:
      labels:
        app: crashloop-app
    spec:
      containers:
      - name: app
        image: busybox:latest
        command: ["sh", "-c", "exit 1"]  # Immediately exits with error
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
```

#### 3. ImagePullBackOff Pod

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imagepull-deployment
  namespace: broken-apps
  labels:
    app: imagepull-app
    scenario: degraded
spec:
  replicas: 1
  selector:
    matchLabels:
      app: imagepull-app
  template:
    metadata:
      labels:
        app: imagepull-app
    spec:
      containers:
      - name: app
        image: nonexistent-registry.io/fake-image:latest  # Image doesn't exist
        ports:
        - containerPort: 80
```

#### 4. Pending Pod (Insufficient Resources)

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pending-deployment
  namespace: broken-apps
  labels:
    app: pending-app
    scenario: degraded
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pending-app
  template:
    metadata:
      labels:
        app: pending-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        resources:
          requests:
            memory: "10Gi"  # More than cluster has available
            cpu: "8"
```

#### 5. Failed Readiness Probe

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readiness-fail-deployment
  namespace: broken-apps
  labels:
    app: readiness-fail-app
    scenario: degraded
spec:
  replicas: 2
  selector:
    matchLabels:
      app: readiness-fail-app
  template:
    metadata:
      labels:
        app: readiness-fail-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
        readinessProbe:
          httpGet:
            path: /nonexistent-endpoint  # Endpoint doesn't exist
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
```

#### 6. Insufficient Replicas (Partial Availability)

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: partial-deployment
  namespace: broken-apps
  labels:
    app: partial-app
    scenario: degraded
spec:
  replicas: 5  # Request 5 replicas
  selector:
    matchLabels:
      app: partial-app
  template:
    metadata:
      labels:
        app: partial-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        resources:
          requests:
            memory: "2Gi"  # Only 1-2 can fit in cluster
            cpu: "1"
```

#### 7. Service with No Endpoints

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: no-endpoints-service
  namespace: broken-apps
  labels:
    scenario: degraded
spec:
  selector:
    app: nonexistent-app  # No pods match this selector
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

#### 8. Failed Job

```yaml
---
apiVersion: batch/v1
kind: Job
metadata:
  name: failed-job
  namespace: broken-apps
  labels:
    scenario: degraded
spec:
  template:
    spec:
      containers:
      - name: job
        image: busybox:latest
        command: ["sh", "-c", "exit 1"]  # Job fails
      restartPolicy: Never
  backoffLimit: 3
```

**Characteristics**:
- Multiple error states visible simultaneously
- Realistic troubleshooting scenarios
- Mix of resource and configuration issues
- Generates error events

**Total Resources**: ~10-12 resources with various error states

## Labeling Strategy

### Scenario Label

All resources in a scenario should include:
```yaml
metadata:
  labels:
    scenario: <scenario-name>
```

**Purpose**: Makes it easy to clean up or filter resources by scenario

**Usage**:
```bash
# Delete all resources from a scenario
kubectl delete all -l scenario=healthy --all-namespaces

# List resources from a scenario
kubectl get all -l scenario=with-operator --all-namespaces
```

### Additional Labels

- `app`: Application name
- `tier`: Application tier (frontend, backend, database)
- `environment`: Environment type (production, staging, development)
- `component`: Component type (api, web, worker)

**Example**:
```yaml
labels:
  app: api-service
  tier: backend
  environment: production
  scenario: with-operator
```

## Resource Naming Conventions

### Generic Names

Use non-sensitive, generic names suitable for marketing:
- `api-service`, `web-app`, `database`
- `app-1`, `app-2`, `service-a`
- `demo-deployment`, `test-service`

**Avoid**:
- Real company names
- Real product names
- Internal codenames
- Customer names

### Namespace Names

- `production`, `staging`, `development` (environments)
- `app-1`, `app-2` (generic applications)
- `demo-namespace`, `test-namespace` (testing)
- `kube9-system` (operator namespace)

**Avoid**:
- Real customer namespaces
- Internal project names

## Resource Limits and Requests

### Conservative Resource Allocation

Ensure all resources fit within:
- **Total Memory**: < 3GB (leaves headroom in 4GB cluster)
- **Total CPU**: < 1.5 CPUs (leaves headroom in 2 CPU cluster)

### Typical Values

**Small Containers**:
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"
```

**Medium Containers**:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

**Large Containers** (operator, database):
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Configuration Best Practices

### Comments in YAML

Add comments explaining resource purpose:
```yaml
---
# This deployment intentionally fails to demonstrate CrashLoopBackOff state
apiVersion: apps/v1
kind: Deployment
# ...
```

### Realistic Configurations

- Include readiness/liveness probes where appropriate
- Use proper service types (ClusterIP, NodePort, LoadBalancer)
- Include ConfigMaps and Secrets (with dummy data)
- Use proper label selectors

### Safe Dummy Data

For Secrets and ConfigMaps:
```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: demo-secret
  namespace: production
type: Opaque
data:
  # Base64 encoded "demo-password"
  password: ZGVtby1wYXNzd29yZA==
```

**Note**: Clearly dummy data, not real credentials

## Validation and Testing

### YAML Validation

```bash
# Validate YAML syntax
yamllint scenarios/*.yaml

# Validate Kubernetes schema
kubectl apply --dry-run=client -f scenarios/healthy.yaml
```

### Resource Limits Check

```bash
# Calculate total resource requests
kubectl top nodes --context kube9-demo

# Verify all pods can be scheduled
kubectl get pods --all-namespaces --context kube9-demo
```

### Scenario Testing Checklist

For each scenario:
- [ ] YAML syntax is valid
- [ ] All resources have `scenario` label
- [ ] Resource names are generic (no sensitive data)
- [ ] Total resources fit in 4GB/2CPU cluster
- [ ] `kubectl apply` succeeds
- [ ] Expected resources are created
- [ ] Resources reach expected states
- [ ] Extension displays resources correctly
- [ ] Scenario can be cleaned up with label selector

## Cleanup Strategy

### Label-Based Cleanup

```bash
# Delete all resources from a scenario (except namespaces)
kubectl delete all -l scenario=healthy --all-namespaces

# Delete namespaces from a scenario
kubectl delete namespace -l scenario=healthy
```

### Complete Cleanup

```bash
# Delete everything except system namespaces
kubectl delete namespace --field-selector metadata.name!=kube-system,metadata.name!=kube-public,metadata.name!=kube-node-lease,metadata.name!=default
```

### Reset to Empty Cluster

Use `reset.sh` script to delete and recreate cluster.

## Extensibility

### Adding New Scenarios

1. Create new YAML file: `scripts/demo-cluster/scenarios/<name>.yaml`
2. Include `scenario: <name>` label on all resources
3. Add comments explaining resource purpose
4. Test with `populate.sh <name>`
5. Document in README

### Custom Scenarios

Developers can create custom scenarios for specific testing needs:
- Copy existing scenario as template
- Modify resources as needed
- Use same labeling convention
- Share with team via Git

## Example Complete Scenario File

### Example: minimal.yaml

```yaml
---
# Minimal scenario for quick testing
# Contains just a single namespace and deployment

apiVersion: v1
kind: Namespace
metadata:
  name: minimal
  labels:
    scenario: minimal
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minimal-app
  namespace: minimal
  labels:
    app: minimal-app
    scenario: minimal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minimal-app
  template:
    metadata:
      labels:
        app: minimal-app
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: minimal-app
  namespace: minimal
  labels:
    scenario: minimal
spec:
  selector:
    app: minimal-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

## Implementation Checklist

- [ ] Create scenarios/ directory
- [ ] Create with-operator.yaml with kube9-operator and multi-namespace apps
- [ ] Create without-operator.yaml with simple apps (Free Tier)
- [ ] Create healthy.yaml with all resources in good state
- [ ] Create degraded.yaml with various error states
- [ ] Add scenario labels to all resources
- [ ] Use generic, non-sensitive names
- [ ] Ensure resources fit in 4GB/2CPU cluster
- [ ] Add comments explaining resource purposes
- [ ] Validate YAML syntax
- [ ] Test each scenario with populate.sh
- [ ] Verify extension displays resources correctly
- [ ] Document scenarios in README
- [ ] Consider creating additional scenarios (minimal, stress-test, etc.)
