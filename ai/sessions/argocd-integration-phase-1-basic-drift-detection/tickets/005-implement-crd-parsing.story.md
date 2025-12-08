---
story_id: implement-crd-parsing
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view, argocd-application-webview]
spec_id: [argocd-service-spec, argocd-status-spec]
diagram_id: [argocd-data-flow]
status: pending
priority: high
estimated_minutes: 30
---

# Implement CRD Parsing and Transformation

## Objective

Add methods to parse raw Application CRD JSON into strongly-typed `ArgoCDApplication` interfaces with all nested data structures.

## Context

Application CRDs have complex nested structures. We need to extract and transform relevant fields into our TypeScript interfaces for consumption by tree view and webview.

## Implementation Steps

1. Open `src/services/ArgoCDService.ts`
2. Implement `parseApplication(crdData: any): ArgoCDApplication` method
3. Extract metadata fields: name, namespace, project, createdAt
4. Parse sync status from `status.sync`
5. Parse health status from `status.health`
6. Parse source from `spec.source`
7. Parse destination from `spec.destination`
8. Call `parseResources()` for resource-level status
9. Call `parseOperation()` for last operation state
10. Implement `parseResources(resources: any[]): ArgoCDResource[]`
11. Implement `parseOperation(operationState: any): OperationState`
12. Update `getApplications()` to call `parseApplication()` for each item
13. Update `getApplication()` to call `parseApplication()`

## Files Affected

- `src/services/ArgoCDService.ts` - Add parsing methods

## Acceptance Criteria

- [ ] `parseApplication()` extracts all required fields
- [ ] Sync and health status are correctly parsed
- [ ] Resource-level status array is properly parsed
- [ ] Last operation state is parsed if present
- [ ] Missing optional fields are handled gracefully
- [ ] Parsed data matches ArgoCDApplication interface
- [ ] `getApplications()` and `getApplication()` return typed data

## Dependencies

- 004-implement-application-querying (needs raw CRD data to parse)

