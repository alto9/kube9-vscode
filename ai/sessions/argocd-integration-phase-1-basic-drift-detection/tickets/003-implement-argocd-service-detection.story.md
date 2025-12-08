---
story_id: implement-argocd-service-detection
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-detection]
spec_id: [argocd-service-spec, argocd-status-spec]
diagram_id: [argocd-architecture]
status: completed
priority: high
estimated_minutes: 30
---

# Implement ArgoCD Detection in ArgoCDService

## Objective

Create the `ArgoCDService` class and implement the detection methods for both operated mode (reading operator status) and basic mode (direct CRD detection).

## Context

The service needs to detect ArgoCD presence in two ways: consuming operator status when available, or falling back to direct CRD queries. This is the core detection logic.

## Implementation Steps

1. Create `src/services/ArgoCDService.ts` file
2. Create `ArgoCDService` class with constructor accepting dependencies
3. Implement `isInstalled(context: string, bypassCache?: boolean)` method
4. Add operated mode detection: read operator status, extract argocd field
5. Add basic mode fallback: `directDetection(context)` method
6. Implement `checkCRDExists()` - query applications.argoproj.io CRD
7. Implement `findArgoCDServer()` - find argocd-server deployment for version
8. Add caching with 5-minute TTL
9. Handle errors gracefully (RBAC, network, not found)

## Files Affected

- `src/services/ArgoCDService.ts` - Create service with detection methods

## Acceptance Criteria

- [x] `isInstalled()` method works in operated mode
- [x] `isInstalled()` method falls back to direct detection
- [x] Direct CRD detection checks for applications.argoproj.io
- [x] ArgoCD server deployment search extracts namespace and version
- [x] Detection results are cached for 5 minutes
- [x] Errors are caught and logged appropriately
- [x] Method returns ArgoCDInstallationStatus type

## Dependencies

- 002-create-argocd-types-file (needs ArgoCDInstallationStatus type)

