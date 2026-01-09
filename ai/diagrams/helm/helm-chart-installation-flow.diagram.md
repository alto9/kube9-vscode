---
diagram_id: helm-chart-installation-flow
name: Helm Chart Installation Flow
description: User workflow for discovering and installing Helm charts
type: flows
spec_id:
  - helm-chart-operations
feature_id:
  - helm-chart-discovery
  - helm-chart-installation
---

# Helm Chart Installation Flow

This diagram shows the complete workflow for discovering, reviewing, and installing Helm charts.

```json
{
  "nodes": [
    {
      "id": "search-start",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { 
        "label": "User Searches Charts",
        "description": "Enters search term in discovery section"
      }
    },
    {
      "id": "search-exec",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": { 
        "label": "Execute helm search repo",
        "description": "Search across all repositories"
      }
    },
    {
      "id": "show-results",
      "type": "default",
      "position": { "x": 100, "y": 300 },
      "data": { 
        "label": "Display Search Results",
        "description": "Show matching charts"
      }
    },
    {
      "id": "select-chart",
      "type": "default",
      "position": { "x": 100, "y": 400 },
      "data": { 
        "label": "User Selects Chart",
        "description": "Clicks chart for details"
      }
    },
    {
      "id": "fetch-details",
      "type": "default",
      "position": { "x": 400, "y": 400 },
      "data": { 
        "label": "Fetch Chart Details",
        "description": "Get README and values"
      }
    },
    {
      "id": "show-modal",
      "type": "default",
      "position": { "x": 700, "y": 400 },
      "data": { 
        "label": "Show Chart Detail Modal",
        "description": "Display README, values, versions"
      }
    },
    {
      "id": "install-click",
      "type": "default",
      "position": { "x": 700, "y": 500 },
      "data": { 
        "label": "User Clicks Install",
        "description": "Opens installation form"
      }
    },
    {
      "id": "install-form",
      "type": "default",
      "position": { "x": 700, "y": 600 },
      "data": { 
        "label": "Installation Form",
        "description": "Release name, namespace, values"
      }
    },
    {
      "id": "edit-values",
      "type": "default",
      "position": { "x": 1000, "y": 600 },
      "data": { 
        "label": "Edit Values",
        "description": "YAML or form-based editor"
      }
    },
    {
      "id": "dry-run",
      "type": "default",
      "position": { "x": 850, "y": 700 },
      "data": { 
        "label": "Dry Run (Optional)",
        "description": "Preview what will be installed"
      }
    },
    {
      "id": "validate",
      "type": "default",
      "position": { "x": 700, "y": 800 },
      "data": { 
        "label": "Validate Input",
        "description": "Check required fields"
      }
    },
    {
      "id": "helm-install",
      "type": "default",
      "position": { "x": 700, "y": 900 },
      "data": { 
        "label": "Execute helm install",
        "description": "Install chart with values"
      }
    },
    {
      "id": "show-progress",
      "type": "default",
      "position": { "x": 700, "y": 1000 },
      "data": { 
        "label": "Show Progress",
        "description": "Installation progress indicator"
      }
    },
    {
      "id": "update-releases",
      "type": "default",
      "position": { "x": 400, "y": 1000 },
      "data": { 
        "label": "Update Releases List",
        "description": "Add new release to list"
      }
    },
    {
      "id": "show-success",
      "type": "default",
      "position": { "x": 400, "y": 1100 },
      "data": { 
        "label": "Show Success Message",
        "description": "Installation complete notification"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "search-start",
      "target": "search-exec",
      "label": "submit",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "search-exec",
      "target": "show-results",
      "label": "results",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "show-results",
      "target": "select-chart",
      "label": "click",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "select-chart",
      "target": "fetch-details",
      "label": "request",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "fetch-details",
      "target": "show-modal",
      "label": "display",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "show-modal",
      "target": "install-click",
      "label": "user action",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "install-click",
      "target": "install-form",
      "label": "open form",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "install-form",
      "target": "edit-values",
      "label": "customize",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "edit-values",
      "target": "install-form",
      "label": "save",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "install-form",
      "target": "dry-run",
      "label": "preview (optional)",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "install-form",
      "target": "validate",
      "label": "submit",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "validate",
      "target": "helm-install",
      "label": "valid",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "helm-install",
      "target": "show-progress",
      "label": "installing",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "show-progress",
      "target": "update-releases",
      "label": "complete",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "update-releases",
      "target": "show-success",
      "label": "notify",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Steps

### Chart Discovery

1. User enters search term in Discover Charts section
2. Extension executes `helm search repo <term>`
3. Search results display matching charts from all repositories
4. Each result shows chart name, version, description, repository

### Chart Detail Review

5. User clicks a chart to view details
6. Extension fetches chart README and values schema
7. Modal opens displaying:
   - Full README content
   - Default values with descriptions
   - Available versions dropdown
   - Install button

### Chart Installation

8. User clicks "Install" button in detail modal
9. Installation form opens with fields:
   - Release name (auto-generated or custom)
   - Namespace selector (existing or create new)
   - Values editor (YAML or form-based)
10. User customizes values in editor
11. User optionally runs dry-run to preview installation
12. Form validates required fields
13. Extension executes `helm install <release> <chart> --namespace <ns> --values <values>`
14. Progress indicator shows installation status
15. Releases list updates with new release
16. Success notification displayed

### Value Editing Modes

- **YAML Mode**: Direct YAML editing with syntax highlighting
- **Form Mode**: Structured form based on values schema
- Users can switch between modes during configuration

