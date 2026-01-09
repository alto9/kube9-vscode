---
diagram_id: helm-release-management-flow
name: Helm Release Management Flow
description: User workflow for managing installed Helm releases (upgrade, rollback, uninstall)
type: flows
spec_id:
  - helm-release-operations
feature_id:
  - helm-release-management
  - helm-release-upgrade
  - helm-release-rollback
---

# Helm Release Management Flow

This diagram shows the complete workflow for managing installed Helm releases, including upgrade, rollback, and uninstall operations.

```json
{
  "nodes": [
    {
      "id": "view-releases",
      "type": "default",
      "position": { "x": 400, "y": 100 },
      "data": { 
        "label": "View Installed Releases",
        "description": "Display all releases with status"
      }
    },
    {
      "id": "upgrade-action",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": { 
        "label": "Upgrade Release",
        "description": "User clicks Upgrade button"
      }
    },
    {
      "id": "upgrade-modal",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": { 
        "label": "Upgrade Modal",
        "description": "Current vs new version, values"
      }
    },
    {
      "id": "helm-upgrade",
      "type": "default",
      "position": { "x": 100, "y": 450 },
      "data": { 
        "label": "Execute helm upgrade",
        "description": "Upgrade with new values"
      }
    },
    {
      "id": "details-action",
      "type": "default",
      "position": { "x": 400, "y": 250 },
      "data": { 
        "label": "View Details",
        "description": "User clicks View Details"
      }
    },
    {
      "id": "details-modal",
      "type": "default",
      "position": { "x": 400, "y": 350 },
      "data": { 
        "label": "Release Details Modal",
        "description": "Status, manifest, values, history"
      }
    },
    {
      "id": "rollback-action",
      "type": "default",
      "position": { "x": 700, "y": 250 },
      "data": { 
        "label": "Rollback Release",
        "description": "User clicks Rollback on revision"
      }
    },
    {
      "id": "confirm-rollback",
      "type": "default",
      "position": { "x": 700, "y": 350 },
      "data": { 
        "label": "Confirm Rollback",
        "description": "Confirmation dialog"
      }
    },
    {
      "id": "helm-rollback",
      "type": "default",
      "position": { "x": 700, "y": 450 },
      "data": { 
        "label": "Execute helm rollback",
        "description": "Rollback to revision"
      }
    },
    {
      "id": "uninstall-action",
      "type": "default",
      "position": { "x": 1000, "y": 250 },
      "data": { 
        "label": "Uninstall Release",
        "description": "User clicks Uninstall button"
      }
    },
    {
      "id": "confirm-uninstall",
      "type": "default",
      "position": { "x": 1000, "y": 350 },
      "data": { 
        "label": "Confirm Uninstall",
        "description": "Confirmation dialog with warning"
      }
    },
    {
      "id": "helm-uninstall",
      "type": "default",
      "position": { "x": 1000, "y": 450 },
      "data": { 
        "label": "Execute helm uninstall",
        "description": "Remove release from cluster"
      }
    },
    {
      "id": "show-progress",
      "type": "default",
      "position": { "x": 550, "y": 550 },
      "data": { 
        "label": "Show Progress",
        "description": "Operation progress indicator"
      }
    },
    {
      "id": "refresh-releases",
      "type": "default",
      "position": { "x": 550, "y": 650 },
      "data": { 
        "label": "Refresh Releases List",
        "description": "Update release status and list"
      }
    },
    {
      "id": "show-feedback",
      "type": "default",
      "position": { "x": 550, "y": 750 },
      "data": { 
        "label": "Show Success/Error",
        "description": "Operation result notification"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "view-releases",
      "target": "upgrade-action",
      "label": "upgrade",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "upgrade-action",
      "target": "upgrade-modal",
      "label": "open modal",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "upgrade-modal",
      "target": "helm-upgrade",
      "label": "confirm",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "view-releases",
      "target": "details-action",
      "label": "view details",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "details-action",
      "target": "details-modal",
      "label": "open modal",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "details-modal",
      "target": "rollback-action",
      "label": "rollback action",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "rollback-action",
      "target": "confirm-rollback",
      "label": "open dialog",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "confirm-rollback",
      "target": "helm-rollback",
      "label": "confirmed",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "view-releases",
      "target": "uninstall-action",
      "label": "uninstall",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "uninstall-action",
      "target": "confirm-uninstall",
      "label": "open dialog",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "confirm-uninstall",
      "target": "helm-uninstall",
      "label": "confirmed",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "helm-upgrade",
      "target": "show-progress",
      "label": "executing",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "helm-rollback",
      "target": "show-progress",
      "label": "executing",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "helm-uninstall",
      "target": "show-progress",
      "label": "executing",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "show-progress",
      "target": "refresh-releases",
      "label": "complete",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "refresh-releases",
      "target": "show-feedback",
      "label": "notify",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Steps

### View Releases

1. Package manager displays all installed releases
2. Each release shows:
   - Release name and namespace
   - Chart name and version
   - Status indicator (🟢 healthy, 🟡 upgrade available, 🔴 failed)
   - Current revision number
3. Releases can be filtered by namespace and status

### Upgrade Release

1. User clicks "Upgrade" button on a release
2. Modal opens showing:
   - Current version vs available versions
   - Current values (with ability to modify)
   - Option to reuse existing values
3. User selects new version and reviews/modifies values
4. User confirms upgrade
5. Extension executes `helm upgrade <release> <chart> --reuse-values`
6. Progress indicator shows upgrade status
7. Releases list refreshes with new version
8. Success notification displayed

### View Release Details

1. User clicks "View Details" on a release
2. Modal opens with tabs:
   - **Info**: Status, chart, version, namespace, revision
   - **Manifest**: Deployed Kubernetes resources (YAML)
   - **Values**: Current chart values (YAML)
   - **History**: Revision history with timestamps and status
3. From history, user can rollback to any previous revision

### Rollback Release

1. User views release history in details modal
2. Clicks "Rollback" on a previous revision
3. Confirmation dialog shows target revision details
4. User confirms rollback
5. Extension executes `helm rollback <release> <revision>`
6. Progress indicator shows rollback status
7. Releases list refreshes with restored revision
8. Success notification displayed

### Uninstall Release

1. User clicks "Uninstall" button on a release
2. Confirmation dialog appears with warning
3. User confirms uninstall
4. Extension executes `helm uninstall <release> --namespace <ns>`
5. Progress indicator shows uninstall status
6. Release removed from releases list
7. Success notification displayed

