---
story_id: add-status-icon-mapping
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view]
spec_id: [argocd-status-spec]
status: pending
priority: medium
estimated_minutes: 20
---

# Add Status Icon Mapping Utility

## Objective

Create a utility module that maps ArgoCD sync and health status combinations to appropriate VS Code ThemeIcon names and colors.

## Context

Different combinations of sync/health status need different icons in tree view. A utility function should determine the correct icon based on status.

## Implementation Steps

1. Create `src/utils/argoCDIcons.ts` file
2. Create `getApplicationIcon(syncStatus, healthStatus)` function
3. Map status combinations to VS Code ThemeIcon names
4. Synced + Healthy → "check" with green
5. OutOfSync + Degraded → "warning" with orange
6. OutOfSync + Healthy → "warning" with yellow
7. Synced + Progressing → "sync" with blue
8. Missing → "error" with red
9. Suspended → "debug-pause" with gray
10. Unknown → "question" with gray
11. Export icon mapping constants

## Files Affected

- `src/utils/argoCDIcons.ts` - Create icon mapping utility

## Acceptance Criteria

- [ ] Function returns correct icon for each status combination
- [ ] Icons use VS Code ThemeIcon identifiers
- [ ] All status combinations from spec are handled
- [ ] Default case returns question icon
- [ ] Function is exported for use in tree view
- [ ] Icons visually distinguish healthy from problematic states

## Dependencies

- 002-create-argocd-types-file (needs status types)

