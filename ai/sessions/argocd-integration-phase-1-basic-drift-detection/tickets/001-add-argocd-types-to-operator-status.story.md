---
story_id: add-argocd-types-to-operator-status
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-detection]
spec_id: [argocd-status-spec, operator-status-api-spec]
status: pending
priority: high
estimated_minutes: 15
---

# Add ArgoCDStatus Interface to Operator Status Types

## Objective

Add the `ArgoCDStatus` interface to `OperatorStatusTypes.ts` and update the `OperatorStatus` interface to include ArgoCD detection information.

## Context

The kube9-operator already detects ArgoCD and exposes this information in the operator status ConfigMap. The extension needs to consume this data by adding the appropriate TypeScript interfaces.

## Implementation Steps

1. Open `src/kubernetes/OperatorStatusTypes.ts`
2. Add `ArgoCDStatus` interface with fields: `detected`, `namespace`, `version`, `lastChecked`
3. Add `argocd?: ArgoCDStatus` field to the `OperatorStatus` interface
4. Ensure types are exported properly

## Files Affected

- `src/kubernetes/OperatorStatusTypes.ts` - Add ArgoCDStatus interface and update OperatorStatus

## Acceptance Criteria

- [ ] `ArgoCDStatus` interface defined with all required fields
- [ ] `OperatorStatus` interface includes optional `argocd` field
- [ ] TypeScript compilation succeeds without errors
- [ ] Interface matches the spec definition in argocd-status-spec

## Dependencies

None - This is the foundation for all other ArgoCD work

