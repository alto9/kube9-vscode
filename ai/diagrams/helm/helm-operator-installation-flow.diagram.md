---
diagram_id: helm-operator-installation-flow
name: Helm Operator 1-Click Installation Flow
description: Special workflow for 1-click Kube9 Operator installation from featured charts
type: flows
spec_id:
  - helm-operator-installation
feature_id:
  - helm-operator-quick-install
---

# Helm Operator 1-Click Installation Flow

This diagram shows the streamlined workflow for installing the Kube9 Operator with pre-configured defaults and optional API key entry.

```json
{
  "nodes": [
    {
      "id": "featured-section",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { 
        "label": "Featured Charts Section",
        "description": "Kube9 Operator prominently displayed"
      }
    },
    {
      "id": "check-installed",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": { 
        "label": "Check If Installed",
        "description": "Query installed releases"
      }
    },
    {
      "id": "show-status",
      "type": "default",
      "position": { "x": 100, "y": 300 },
      "data": { 
        "label": "Show Install/Upgrade Status",
        "description": "Button reflects current state"
      }
    },
    {
      "id": "install-click",
      "type": "default",
      "position": { "x": 400, "y": 300 },
      "data": { 
        "label": "User Clicks Install Now",
        "description": "1-click installation trigger"
      }
    },
    {
      "id": "install-modal",
      "type": "default",
      "position": { "x": 400, "y": 400 },
      "data": { 
        "label": "Operator Install Modal",
        "description": "Pre-filled form with defaults"
      }
    },
    {
      "id": "prefilled-values",
      "type": "default",
      "position": { "x": 700, "y": 350 },
      "data": { 
        "label": "Pre-filled Values",
        "description": "namespace: kube9-system"
      }
    },
    {
      "id": "api-key-optional",
      "type": "default",
      "position": { "x": 700, "y": 450 },
      "data": { 
        "label": "API Key (Optional)",
        "description": "Input for Pro tier"
      }
    },
    {
      "id": "confirm-install",
      "type": "default",
      "position": { "x": 400, "y": 550 },
      "data": { 
        "label": "User Confirms Install",
        "description": "Clicks Install button"
      }
    },
    {
      "id": "helm-install-op",
      "type": "default",
      "position": { "x": 400, "y": 650 },
      "data": { 
        "label": "Execute helm install",
        "description": "Install kube9-operator chart"
      }
    },
    {
      "id": "show-progress",
      "type": "default",
      "position": { "x": 400, "y": 750 },
      "data": { 
        "label": "Show Installation Progress",
        "description": "Progress indicator"
      }
    },
    {
      "id": "detect-operator",
      "type": "default",
      "position": { "x": 400, "y": 850 },
      "data": { 
        "label": "Extension Detects Operator",
        "description": "Operator health check"
      }
    },
    {
      "id": "enable-features",
      "type": "default",
      "position": { "x": 100, "y": 850 },
      "data": { 
        "label": "Enable Pro Features",
        "description": "Activate advanced capabilities"
      }
    },
    {
      "id": "update-ui",
      "type": "default",
      "position": { "x": 700, "y": 850 },
      "data": { 
        "label": "Update UI",
        "description": "Show operator in releases"
      }
    },
    {
      "id": "show-success",
      "type": "default",
      "position": { "x": 400, "y": 950 },
      "data": { 
        "label": "Show Success Message",
        "description": "Installation complete notification"
      }
    },
    {
      "id": "upgrade-click",
      "type": "default",
      "position": { "x": 1000, "y": 300 },
      "data": { 
        "label": "User Clicks Upgrade",
        "description": "If already installed"
      }
    },
    {
      "id": "upgrade-modal",
      "type": "default",
      "position": { "x": 1000, "y": 400 },
      "data": { 
        "label": "Upgrade Modal",
        "description": "New version with reuse-values"
      }
    },
    {
      "id": "helm-upgrade-op",
      "type": "default",
      "position": { "x": 1000, "y": 500 },
      "data": { 
        "label": "Execute helm upgrade",
        "description": "Upgrade with --reuse-values"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "featured-section",
      "target": "check-installed",
      "label": "on load",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "check-installed",
      "target": "show-status",
      "label": "display state",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "show-status",
      "target": "install-click",
      "label": "not installed",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "install-click",
      "target": "install-modal",
      "label": "open modal",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "install-modal",
      "target": "prefilled-values",
      "label": "defaults loaded",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "install-modal",
      "target": "api-key-optional",
      "label": "show field",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "install-modal",
      "target": "confirm-install",
      "label": "user submits",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "confirm-install",
      "target": "helm-install-op",
      "label": "execute",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "helm-install-op",
      "target": "show-progress",
      "label": "installing",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "show-progress",
      "target": "detect-operator",
      "label": "complete",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "detect-operator",
      "target": "enable-features",
      "label": "operator healthy",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "detect-operator",
      "target": "update-ui",
      "label": "update state",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "enable-features",
      "target": "show-success",
      "label": "activated",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "update-ui",
      "target": "show-success",
      "label": "refreshed",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "show-status",
      "target": "upgrade-click",
      "label": "update available",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "upgrade-click",
      "target": "upgrade-modal",
      "label": "open modal",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "upgrade-modal",
      "target": "helm-upgrade-op",
      "label": "confirm",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "helm-upgrade-op",
      "target": "show-progress",
      "label": "upgrading",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Steps

### Featured Display

1. Package manager loads and displays Featured Charts section
2. Kube9 Operator is prominently displayed at the top
3. Extension checks if operator is already installed
4. Button displays appropriate state:
   - "Install Now" if not installed
   - "Upgrade" (🟡 badge) if update available
   - "Installed" (🟢 checkmark) if current version

### 1-Click Installation

5. User clicks "Install Now" button
6. Operator install modal opens with pre-filled defaults:
   - Release name: `kube9-operator`
   - Namespace: `kube9-system` (with create-namespace flag)
   - Recommended resource values
7. Optional API key field displayed for Pro tier
8. User optionally enters API key
9. User clicks "Install" button
10. Extension executes:
    ```bash
    helm install kube9-operator kube9/kube9-operator \
      --namespace kube9-system \
      --create-namespace \
      --set apiKey=<key-if-provided>
    ```
11. Progress indicator shows installation status
12. Installation completes

### Post-Installation

13. Extension performs operator health check
14. Operator detected and status confirmed
15. Extension enables Pro features (if API key provided)
16. UI updates:
    - Operator appears in Installed Releases
    - Featured section shows "Installed" status
    - Tree view may show new operator-enabled features
17. Success notification displayed with next steps

### Upgrade Flow

- If operator is installed and update available:
  - Badge indicator (🟡) shows on featured section
  - "Upgrade" button replaces "Install Now"
  - Clicking opens upgrade modal with:
    - Current version vs new version comparison
    - Existing values preserved (--reuse-values)
  - User confirms upgrade
  - Extension executes upgrade
  - Operator updated and features remain active

## Pre-configured Defaults

The operator installation uses these optimized defaults:
- Namespace: `kube9-system`
- Create namespace: `true`
- Resource requests/limits: As defined in chart
- Default values from chart's `values.yaml`
- API key: Empty (free tier) or user-provided (pro tier)

