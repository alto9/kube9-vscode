---
session_id: argocd-integration-phase-1-basic-drift-detection
start_time: '2025-12-08T01:00:28.315Z'
status: completed
problem_statement: 'ArgoCD Integration Phase 1: Basic Drift Detection'
changed_files:
  - path: ai/features/argocd/argocd-detection.feature.md
    change_type: added
    scenarios_added:
      - Extension checks for ArgoCD presence on cluster connection
      - Extension consumes ArgoCD status from operator (Operated mode)
      - Operator status indicates ArgoCD is detected
      - Operator status indicates ArgoCD is not detected
      - Extension falls back to direct CRD detection (Basic mode)
      - Direct CRD detection finds ArgoCD installed
      - Direct CRD detection finds ArgoCD not installed
      - Extension finds ArgoCD server deployment for version info
      - Extension handles ArgoCD in custom namespace
      - Extension handles operator status without ArgoCD field
      - Extension refreshes ArgoCD status on manual refresh
      - Extension handles ArgoCD detection failures gracefully
      - Extension handles CRD query failures gracefully
      - Extension maintains ArgoCD status awareness across all clusters
      - Extension handles stale operator ArgoCD status
      - Extension prioritizes operator status over direct detection
      - Extension detects when ArgoCD is newly installed
      - Extension detects when ArgoCD is uninstalled
      - Extension handles multiple ArgoCD namespaces (unsupported)
      - Extension validates ArgoCD version compatibility
      - Extension caches ArgoCD status per cluster context
      - Extension handles ArgoCD status in disconnected cluster
  - path: ai/features/argocd/argocd-tree-view.feature.md
    change_type: added
    scenarios_added:
      - Extension shows ArgoCD Applications category when ArgoCD detected
      - Extension hides ArgoCD Applications category when ArgoCD not detected
      - Extension displays application count badge on ArgoCD category
      - Extension displays zero applications badge
      - Extension queries ArgoCD Applications when category expanded
      - Extension displays application with Synced and Healthy status
      - Extension displays application with OutOfSync and Degraded status
      - Extension displays application with Synced and Progressing status
      - Extension displays application with Unknown status
      - Extension sorts applications alphabetically
      - Extension displays application tooltip with details
      - Extension shows context menu on right-click
      - User opens application details from tree item click
      - User opens application details from context menu
      - User triggers sync from context menu
      - User triggers refresh from context menu
      - User triggers hard refresh from context menu
      - User copies application name from context menu
      - User copies application namespace from context menu
      - Extension refreshes tree after sync operation
      - Extension shows sync progress in tree item
      - Extension handles application query failures gracefully
      - Extension handles RBAC permission denied for applications
      - Extension caches application list for performance
      - Extension bypasses cache on manual refresh
      - Extension shows applications from custom ArgoCD namespace
      - Extension handles application in terminating state
      - Extension shows suspended application status
      - Extension shows missing application status
      - Extension displays multi-namespace applications count correctly
      - Extension handles no applications found scenario
      - Extension preserves tree expansion state after sync
  - path: ai/features/argocd/argocd-application-webview.feature.md
    change_type: added
    scenarios_added:
      - User opens application webview from tree view
      - Webview Overview tab displays application metadata
      - Webview Overview tab displays sync status information
      - Webview Overview tab displays OutOfSync status
      - Webview Overview tab displays health status information
      - Webview Overview tab displays Degraded health status
      - Webview Overview tab displays Progressing health status
      - Webview Overview tab displays Git source information
      - User clicks repository URL to open in browser
      - User clicks to copy full Git revision SHA
      - Webview displays action buttons in Overview tab
      - User triggers sync from Overview tab
      - User triggers refresh from Overview tab
      - User triggers hard refresh from Overview tab
      - User clicks "View in Tree" to navigate to tree view
      - User switches to Drift Details tab
      - Drift Details tab displays resource-level sync status
      - Drift Details tab shows all resources synced
      - Drift Details tab highlights out-of-sync resources
      - Drift Details tab displays out-of-sync summary
      - Drift Details tab shows resource sync message
      - User expands resource to see sync details
      - User navigates to Kubernetes resource from drift table
      - Drift Details tab shows no resources message
      - Drift Details tab filters to show only out-of-sync resources
      - Webview updates when application status changes
      - Webview shows loading state while fetching data
      - Webview displays error when application not found
      - Webview displays error when fetch fails
      - Webview handles RBAC permission errors
      - Webview persists tab selection across reopens
      - Webview respects VS Code theme
      - Webview displays sync operation progress
      - Webview shows last sync operation details
      - Webview shows sync operation failure details
  - path: ai/features/argocd/argocd-actions.feature.md
    change_type: added
    scenarios_added:
      - User executes sync action on out-of-sync application
      - Sync action patches Application CRD with operation annotation
      - Sync operation completes successfully
      - Sync operation fails with error
      - User executes sync action on already-synced application
      - User executes refresh action
      - Refresh action updates application state without sync
      - User executes hard refresh action
      - User confirms hard refresh
      - User cancels hard refresh
      - Hard refresh completes successfully
      - Extension tracks sync operation progress
      - Sync operation phases are displayed to user
      - Extension handles kubectl patch failure for sync
      - Extension handles RBAC permission denied for sync
      - Extension handles application not found during sync
      - Multiple sync operations on different applications
      - User cancels ongoing sync operation
      - Extension handles sync timeout
      - Sync action available from tree view context menu
      - Refresh action available from tree view context menu
      - Hard refresh action available from tree view context menu
      - Sync button available in application webview
      - Refresh button available in application webview
      - Hard refresh button available in application webview
      - Webview buttons disabled during active operation
      - Tree view shows syncing indicator during operation
      - Extension handles concurrent sync and refresh gracefully
      - Extension handles ArgoCD not responding during operation
      - Extension cleans up operation annotations after completion
      - Extension validates application state before sync
      - Extension logs all operation commands for debugging
start_commit: 2125a8ca4aec40b5834d7eb079379e08ecc9ae8e
end_time: '2025-12-08T01:20:29.149Z'
---
## Problem Statement

Implement basic ArgoCD integration in kube9-vscode to enable drift detection and application monitoring directly from VS Code. ArgoCD users currently need to context-switch to separate UIs to monitor GitOps deployments and detect configuration drift, which breaks the developer workflow.

**Important Discovery**: The kube9-operator already detects ArgoCD and exposes this information in the operator status ConfigMap (`argocd: ArgoCDStatus`). The extension just needs to consume this data and query ArgoCD Applications using kubectl.

## Goals

1. **Consume ArgoCD status** from operator (if installed) or detect directly (if operator not installed)
2. **Display ArgoCD Applications** in the cluster tree view with application count badge
3. **Show sync and health status** with visual indicators (Synced/OutOfSync, Healthy/Degraded/Progressing)
4. **Provide drift visibility** at the application and resource level
5. **Enable basic ArgoCD actions** (sync, refresh, hard refresh)
6. **Create webview panel** showing application details and drift information
7. **Integrate seamlessly** with existing tree view architecture

**Success Metrics**:
- Users can see ArgoCD application status without leaving VS Code
- Drift detection is as fast as native ArgoCD UI (<2 seconds to load)
- 90% of users who have ArgoCD installed engage with the feature
- Reduces context switching for ArgoCD users

## Approach

### 1. Update Extension Interfaces
- Add `ArgoCDStatus` interface to `src/kubernetes/OperatorStatusTypes.ts`
- Include fields: `detected`, `namespace`, `version`, `lastChecked`
- Update `OperatorStatus` interface to include `argocd: ArgoCDStatus` field

### 2. Detection Strategy
**When Operator is Installed (Operated/Enabled mode)**:
- Read ArgoCD status from operator's ConfigMap
- Use `operatorStatus.argocd.detected` and `operatorStatus.argocd.namespace`
- Operator re-checks every 6 hours automatically

**When Operator is NOT Installed (Basic mode)**:
- Fall back to direct CRD detection
- Check for `applications.argoproj.io` CRD
- Find ArgoCD server deployment for version info

### 3. Data Source: Direct CRD Queries
Use kubectl to query ArgoCD Application CRDs directly (no ArgoCD API or authentication needed):
```bash
kubectl get applications.argoproj.io -n argocd -o json
```

**Key Data Available**:
- `status.sync.status` - Synced | OutOfSync
- `status.health.status` - Healthy | Degraded | Progressing | Suspended | Missing
- `status.sync.revision` - Currently deployed Git SHA
- `spec.source.targetRevision` - Target Git branch/tag
- `status.operationState.syncResult.resources[]` - Resource-level sync status
- `status.conditions[]` - Error messages and conditions

### 4. Tree View Integration
Add "ArgoCD Applications" node under clusters where ArgoCD is detected:
```
📦 my-cluster (docker-desktop) [Operated] ⚙️
  ├── 🚀 ArgoCD Applications (5)
  │   ├── ✅ guestbook (Synced, Healthy)
  │   ├── ⚠️  api-service (OutOfSync, Degraded)
  │   ├── ✅ frontend (Synced, Healthy)
```

### 5. Webview Panel
Create detailed application view with:
- **Overview Tab**: Application metadata, sync/health status, Git info, last sync details
- **Drift Details Tab**: Resource-level sync status, out-of-sync resources, status messages
- **Actions**: Sync, Hard Refresh, View in Tree, Copy Git SHA

### 6. Service Architecture
Create `ArgoCDService` in `src/services/`:
- `isInstalled()` - Check ArgoCD presence
- `getApplications()` - List all applications
- `getApplication()` - Get single application details
- `syncApplication()` - Trigger sync
- `refreshApplication()` - Refresh application state

## Key Decisions

1. **Leverage Operator Detection**: The kube9-operator already detects ArgoCD - extension consumes this data rather than duplicating detection logic

2. **Use Direct CRD Queries**: Query ArgoCD Application CRDs using kubectl instead of ArgoCD API
   - **Why**: No authentication needed, simpler implementation, works in all scenarios
   - **Benefit**: Free Tier users get full functionality without ArgoCD API access

3. **Phase 1 Scope - Free Tier Only**: Focus on basic drift detection and sync actions
   - **In Scope**: Detection, tree view, status display, basic actions (sync/refresh)
   - **Out of Scope**: Historical analysis (Phase 3), AI insights (Phase 4), app creation/deletion

4. **Graceful Degradation**: Works in both Operated and Basic modes
   - Operated mode: Use operator's ArgoCD status (better support for custom namespaces)
   - Basic mode: Fall back to direct CRD detection

5. **Tree View Architecture**: Extend existing `BaseCategory` pattern for consistency
   - Create `ArgoCDCategory` class
   - Add to `ClusterTreeProvider` alongside existing categories
   - Show only when ArgoCD is detected

6. **Resource-Level Drift**: Display which specific resources are out of sync
   - Parse `status.operationState.syncResult.resources[]` from CRD
   - Highlight out-of-sync resources in webview
   - Provide navigation to related Kubernetes resources in tree

## Implementation Tasks

### Task 1: Update Extension Interfaces
- Add `ArgoCDStatus` interface to `OperatorStatusTypes.ts`
- Add `argocd` field to `OperatorStatus` interface
- Update type validators in `OperatorStatusClient`

### Task 2: ArgoCD Detection Service
- Create `ArgoCDService` class
- Implement direct detection for Free Tier (CRD check)
- Implement operator status consumption
- Add error handling for missing/inaccessible ArgoCD

### Task 3: Application Data Service
- Implement `getApplications()` using kubectl CRD queries
- Implement `getApplication()` for single app details
- Parse CRD status into typed interfaces
- Add caching for application lists

### Task 4: Tree View Integration
- Create `ArgoCDCategory` class extending `BaseCategory`
- Add "ArgoCD Applications" node to `ClusterTreeProvider`
- Implement application list items with status icons
- Add context menu actions (Sync, Refresh, View Details)
- Show application count badge
- Handle refresh on sync operations

### Task 5: Webview Panel
- Create `ArgoCDApplicationWebview` component
- Design overview tab with sync/health status
- Design drift details tab with resource list
- Implement sync action button
- Add navigation to related Kubernetes resources
- Handle loading states and errors

### Task 6: Commands
- `kube9.argocd.sync` - Sync application
- `kube9.argocd.refresh` - Refresh application
- `kube9.argocd.hardRefresh` - Hard refresh application
- `kube9.argocd.viewDetails` - Open application webview

### Task 7: Documentation & Testing
- Update README with ArgoCD features
- Add ArgoCD setup guide
- Document supported ArgoCD versions (2.5+)
- Write unit tests for `ArgoCDService`
- Write integration tests with sample applications

## Notes

### Tier Strategy
This feature provides smooth upgrade path across tiers:

| Tier            | Detection Method | Data Source                              |
|-----------------|------------------|------------------------------------------|
| Free (Basic)    | Direct CRD check | kubectl get crd applications.argoproj.io |
| Free (Operated) | Operator status  | operatorStatus.argocd.detected           |
| Pro (Enabled)   | Operator status  | operatorStatus.argocd.detected           |

### Future Phases (Out of Scope)
- **Phase 2**: ArgoCD CLI integration for richer diff output
- **Phase 3**: Historical drift analysis via kube9-operator (Pro Tier)
- **Phase 4**: AI-powered insights for drift patterns (Pro Tier)
- Application creation/management
- Multi-source application support
- ApplicationSet support

### Technical Considerations
- ArgoCD namespace defaults to `argocd` but can be custom
- Operator detection handles custom namespaces automatically
- CRD queries work regardless of ArgoCD namespace (cluster-scoped)
- Sync operations use kubectl patch on Application CRD
- Support ArgoCD versions 2.5+ (standard Application CRD schema)

### Dependencies
- Existing kubectl integration in kube9-vscode
- ArgoCD installed in target cluster
- Application CRD (`applications.argoproj.io/v1alpha1`)
- kube9-operator provides enhanced detection (optional)

### User Experience Priorities
1. **Zero Configuration**: Works immediately if ArgoCD is installed
2. **Fast Performance**: <2 seconds to load application list
3. **Clear Visual Indicators**: Obvious sync/health status at a glance
4. **Actionable Information**: Easy to trigger syncs and view drift details
5. **Consistent UX**: Matches existing kube9-vscode patterns and interactions
