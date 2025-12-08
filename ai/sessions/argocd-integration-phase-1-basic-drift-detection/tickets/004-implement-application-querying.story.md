---
story_id: implement-application-querying
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view]
spec_id: [argocd-service-spec, argocd-status-spec]
diagram_id: [argocd-data-flow]
status: pending
priority: high
estimated_minutes: 30
---

# Implement Application Querying in ArgoCDService

## Objective

Add methods to query ArgoCD Applications from CRDs and get single application details using kubectl commands.

## Context

The service needs to query Application CRDs using kubectl to get the list of applications and individual application details. This data feeds the tree view and webview.

## Implementation Steps

1. Open `src/services/ArgoCDService.ts`
2. Implement `getApplications(context: string, bypassCache?: boolean)` method
3. Execute kubectl: `get applications.argoproj.io -n <namespace> -o json`
4. Implement `getApplication(name: string, namespace: string, context: string)` method
5. Execute kubectl: `get application.argoproj.io/<name> -n <namespace> -o json`
6. Add 30-second caching for application lists
7. Handle errors: RBAC denied, not found, network errors
8. Return empty array on errors after checking cache

## Files Affected

- `src/services/ArgoCDService.ts` - Add application querying methods

## Acceptance Criteria

- [ ] `getApplications()` queries all applications in ArgoCD namespace
- [ ] `getApplication()` queries single application by name
- [ ] Application list is cached for 30 seconds
- [ ] Bypass cache flag works correctly
- [ ] RBAC errors are caught and handled gracefully
- [ ] Methods return raw CRD JSON (parsing in next story)

## Dependencies

- 003-implement-argocd-service-detection (needs ArgoCD namespace from detection)

