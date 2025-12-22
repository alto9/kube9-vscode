---
task_id: 030-operator-configmap-namespace-field
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: task
status: completed
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Task: Update Operator to Include Namespace in Status ConfigMap

## Objective

Update kube9-operator to include its own namespace in the status ConfigMap for dynamic namespace discovery.

## Context

For optimal namespace discovery, the operator should self-report its namespace in the status ConfigMap.

## Requirements

- [x] Operator deployment should detect its own namespace (from environment or downward API)
- [x] Status ConfigMap should include `namespace` field in data
- [x] ConfigMap structure:
  ```yaml
  data:
    namespace: ${OPERATOR_NAMESPACE}
    status: enabled
    version: ...
  ```
- [ ] Deploy updated operator to test environments
- [ ] Verify namespace field is populated correctly

## Files Affected

**Repository**: `kube9-operator`

- Operator deployment manifest (add namespace env var)
- Operator code that writes status ConfigMap

## Implementation Notes

**Detect Namespace**: Use Kubernetes downward API to inject namespace:
```yaml
env:
  - name: OPERATOR_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
```

**Write to ConfigMap**: Include namespace field when creating/updating status ConfigMap.

**Backward Compatibility**: Extension falls back to settings/default if namespace field missing.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Assignment

This task should be completed by the operator team or as a separate work item in the operator repository.

## Estimated Time

20 minutes (operator changes)

