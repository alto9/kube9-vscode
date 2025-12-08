---
story_id: create-argocd-types-file
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-detection, argocd-tree-view, argocd-application-webview]
spec_id: [argocd-status-spec]
status: pending
priority: high
estimated_minutes: 25
---

# Create ArgoCD Types File with All Interfaces

## Objective

Create a central types file (`src/types/argocd.ts`) containing all TypeScript interfaces for ArgoCD integration, including installation status, application data, sync/health status, and resource types.

## Context

All ArgoCD features need strongly-typed interfaces for application data, status information, and UI display. This provides a single source of truth for all ArgoCD types.

## Implementation Steps

1. Create `src/types/argocd.ts` file
2. Add `ArgoCDInstallationStatus` interface
3. Add `ArgoCDApplication` interface with all nested types
4. Add `SyncStatus`, `SyncStatusCode`, `HealthStatus`, `HealthStatusCode` types
5. Add `ApplicationSource`, `ApplicationDestination` interfaces
6. Add `ArgoCDResource` interface for resource-level drift
7. Add `OperationState`, `OperationPhase` types
8. Add error types: `ArgoCDError`, `ArgoCDPermissionError`, `ArgoCDNotFoundError`
9. Add constants: `DEFAULT_ARGOCD_NAMESPACE`, `MIN_SUPPORTED_VERSION`, cache TTLs
10. Export all types from the file

## Files Affected

- `src/types/argocd.ts` - Create new file with all ArgoCD type definitions

## Acceptance Criteria

- [ ] All interfaces from argocd-status-spec are defined
- [ ] Types are properly exported
- [ ] Constants are defined and exported
- [ ] Error classes extend base Error properly
- [ ] TypeScript compilation succeeds
- [ ] No circular dependencies

## Dependencies

- 001-add-argocd-types-to-operator-status (needs ArgoCDStatus from operator types)

