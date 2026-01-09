---
diagram_id: helm-repository-management-flow
name: Helm Repository Management Flow
description: User workflow for managing Helm repositories (add, update, remove)
type: flows
spec_id:
  - helm-repository-operations
feature_id:
  - helm-repository-management
---

# Helm Repository Management Flow

This diagram shows the complete workflow for managing Helm repositories, including adding, updating, and removing repositories.

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { 
        "label": "User Opens Package Manager",
        "description": "Clicks Helm tree item"
      }
    },
    {
      "id": "view-repos",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": { 
        "label": "View Repository List",
        "description": "Shows configured repositories"
      }
    },
    {
      "id": "add-repo",
      "type": "default",
      "position": { "x": 300, "y": 300 },
      "data": { 
        "label": "Add Repository",
        "description": "User clicks + Add Repository"
      }
    },
    {
      "id": "add-modal",
      "type": "default",
      "position": { "x": 300, "y": 400 },
      "data": { 
        "label": "Add Repository Modal",
        "description": "Form with name and URL fields"
      }
    },
    {
      "id": "validate-add",
      "type": "default",
      "position": { "x": 300, "y": 500 },
      "data": { 
        "label": "Validate Input",
        "description": "Check name and URL format"
      }
    },
    {
      "id": "helm-add",
      "type": "default",
      "position": { "x": 300, "y": 600 },
      "data": { 
        "label": "Execute helm repo add",
        "description": "Add repository via CLI"
      }
    },
    {
      "id": "update-repo",
      "type": "default",
      "position": { "x": 600, "y": 300 },
      "data": { 
        "label": "Update Repository",
        "description": "User clicks update button"
      }
    },
    {
      "id": "helm-update",
      "type": "default",
      "position": { "x": 600, "y": 400 },
      "data": { 
        "label": "Execute helm repo update",
        "description": "Refresh repository index"
      }
    },
    {
      "id": "remove-repo",
      "type": "default",
      "position": { "x": 900, "y": 300 },
      "data": { 
        "label": "Remove Repository",
        "description": "User clicks remove button"
      }
    },
    {
      "id": "confirm-remove",
      "type": "default",
      "position": { "x": 900, "y": 400 },
      "data": { 
        "label": "Confirm Removal",
        "description": "Show confirmation dialog"
      }
    },
    {
      "id": "helm-remove",
      "type": "default",
      "position": { "x": 900, "y": 500 },
      "data": { 
        "label": "Execute helm repo remove",
        "description": "Remove repository via CLI"
      }
    },
    {
      "id": "refresh-list",
      "type": "default",
      "position": { "x": 600, "y": 700 },
      "data": { 
        "label": "Refresh Repository List",
        "description": "Update UI with current repos"
      }
    },
    {
      "id": "show-feedback",
      "type": "default",
      "position": { "x": 600, "y": 800 },
      "data": { 
        "label": "Show Success/Error",
        "description": "Display notification"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "view-repos",
      "label": "load",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "view-repos",
      "target": "add-repo",
      "label": "add action",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "add-repo",
      "target": "add-modal",
      "label": "open modal",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "add-modal",
      "target": "validate-add",
      "label": "submit",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "validate-add",
      "target": "helm-add",
      "label": "valid",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "view-repos",
      "target": "update-repo",
      "label": "update action",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "update-repo",
      "target": "helm-update",
      "label": "execute",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "view-repos",
      "target": "remove-repo",
      "label": "remove action",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "remove-repo",
      "target": "confirm-remove",
      "label": "open dialog",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "confirm-remove",
      "target": "helm-remove",
      "label": "confirmed",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "helm-add",
      "target": "refresh-list",
      "label": "success",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "helm-update",
      "target": "refresh-list",
      "label": "success",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "helm-remove",
      "target": "refresh-list",
      "label": "success",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "refresh-list",
      "target": "show-feedback",
      "label": "complete",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Steps

### Add Repository Flow

1. User views repository list in package manager
2. Clicks "+ Add Repository" button
3. Modal opens with form fields (name, URL)
4. User enters repository name and URL
5. Form validates input (required fields, URL format)
6. Extension executes `helm repo add <name> <url>`
7. Repository is added to Helm configuration
8. Repository list refreshes in UI
9. Success notification displayed

### Update Repository Flow

1. User clicks update button for a repository
2. Extension executes `helm repo update <name>`
3. Repository index is refreshed
4. Chart count updates in UI
5. Success notification displayed

### Remove Repository Flow

1. User clicks remove button for a repository
2. Confirmation dialog appears
3. User confirms removal
4. Extension executes `helm repo remove <name>`
5. Repository is removed from Helm configuration
6. Repository list refreshes in UI
7. Success notification displayed

