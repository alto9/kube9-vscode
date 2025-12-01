---
story_id: 003-implement-restart-annotation-logic
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: high
estimated_minutes: 30
---

# Implement Restart Annotation Logic

## Objective
Implement the core logic to apply the restart annotation (`kubectl.kubernetes.io/restartedAt`) to workload resources using Kubernetes API PATCH.

## Context
The restart mechanism works by adding/updating an annotation on the pod template. This causes the Kubernetes controller to detect a change and trigger a rolling update. The annotation key contains a forward slash which must be escaped in JSON Patch paths.

## Implementation Steps

1. Create function `applyRestartAnnotation(name, namespace, kind)`
2. Generate ISO 8601 timestamp: `new Date().toISOString()`
3. Create annotation key: `kubectl.kubernetes.io/restartedAt`
4. Escape forward slash for JSON Patch path: `kubectl.kubernetes.io~1restartedAt`
5. First, check if `spec.template.metadata.annotations` exists:
   - If not, create empty annotations object with PATCH
   - Use path `/spec/template/metadata/annotations` with value `{}`
6. Then apply restart annotation with PATCH:
   - Use operation `add` (works for both create and update)
   - Path: `/spec/template/metadata/annotations/${escapedKey}`
   - Value: ISO timestamp
7. Use JSON Patch content type: `application/json-patch+json`
8. Support all three workload types (Deployment, StatefulSet, DaemonSet)
9. Integrate with existing kubectl client or Kubernetes API client
10. Add progress notification while applying annotation

## Files Affected
- `src/commands/restartWorkload.ts` - Add annotation logic
- `src/kubernetes/client.ts` - Ensure PATCH support exists

## Acceptance Criteria
- [ ] Function generates valid ISO 8601 timestamp
- [ ] Forward slash in annotation key is properly escaped
- [ ] Creates annotations object if it doesn't exist
- [ ] Applies restart annotation successfully
- [ ] Works for Deployments, StatefulSets, and DaemonSets
- [ ] Uses correct Kubernetes API endpoints for each workload type
- [ ] Progress notification shows "Applying restart annotation..."
- [ ] Annotation value is the current timestamp
- [ ] Multiple restarts update the same annotation (not create duplicates)

## Dependencies
- 002-implement-confirmation-dialog (needs dialog result to proceed)

