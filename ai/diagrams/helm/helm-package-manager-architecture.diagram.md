---
diagram_id: helm-package-manager-architecture
name: Helm Package Manager Architecture
description: Overall architecture of the Helm Package Manager webview and its integration with the VS Code extension
type: components
spec_id:
  - helm-webview-architecture
  - helm-cli-integration
feature_id:
  - helm-package-manager-access
---

# Helm Package Manager Architecture

This diagram shows the complete architecture of the Helm Package Manager, including the webview components, extension integration, and Helm CLI interaction.

```json
{
  "nodes": [
    {
      "id": "tree-item",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": { 
        "label": "Helm Package Manager Tree Item",
        "description": "Single tree item in Kube9 sidebar"
      }
    },
    {
      "id": "webview-panel",
      "type": "default",
      "position": { "x": 400, "y": 100 },
      "data": { 
        "label": "Webview Panel",
        "description": "VS Code webview hosting React app"
      }
    },
    {
      "id": "react-app",
      "type": "default",
      "position": { "x": 700, "y": 50 },
      "data": { 
        "label": "React Application",
        "description": "Package manager UI components"
      }
    },
    {
      "id": "featured-section",
      "type": "default",
      "position": { "x": 1000, "y": 20 },
      "data": { 
        "label": "Featured Charts Section",
        "description": "Kube9 Operator promotion"
      }
    },
    {
      "id": "repos-section",
      "type": "default",
      "position": { "x": 1000, "y": 120 },
      "data": { 
        "label": "Repositories Section",
        "description": "Repository list and management"
      }
    },
    {
      "id": "releases-section",
      "type": "default",
      "position": { "x": 1000, "y": 220 },
      "data": { 
        "label": "Installed Releases Section",
        "description": "Release list and status"
      }
    },
    {
      "id": "discovery-section",
      "type": "default",
      "position": { "x": 1000, "y": 320 },
      "data": { 
        "label": "Discover Charts Section",
        "description": "Chart search and browsing"
      }
    },
    {
      "id": "extension-host",
      "type": "default",
      "position": { "x": 400, "y": 300 },
      "data": { 
        "label": "Extension Host",
        "description": "Command handlers and business logic"
      }
    },
    {
      "id": "helm-service",
      "type": "default",
      "position": { "x": 100, "y": 400 },
      "data": { 
        "label": "Helm Service",
        "description": "Helm CLI wrapper and parser"
      }
    },
    {
      "id": "helm-cli",
      "type": "default",
      "position": { "x": 100, "y": 550 },
      "data": { 
        "label": "Helm CLI",
        "description": "Helm 3.x command line tool"
      }
    },
    {
      "id": "state-manager",
      "type": "default",
      "position": { "x": 400, "y": 450 },
      "data": { 
        "label": "State Manager",
        "description": "Workspace state and cache"
      }
    },
    {
      "id": "kubernetes",
      "type": "default",
      "position": { "x": 100, "y": 700 },
      "data": { 
        "label": "Kubernetes Cluster",
        "description": "Target cluster for releases"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "tree-item",
      "target": "webview-panel",
      "label": "onClick",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "webview-panel",
      "target": "react-app",
      "label": "hosts",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "react-app",
      "target": "featured-section",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "react-app",
      "target": "repos-section",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "react-app",
      "target": "releases-section",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "react-app",
      "target": "discovery-section",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "react-app",
      "target": "extension-host",
      "label": "postMessage",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "extension-host",
      "target": "react-app",
      "label": "postMessage",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "extension-host",
      "target": "helm-service",
      "label": "delegates to",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "helm-service",
      "target": "helm-cli",
      "label": "spawns",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "helm-cli",
      "target": "kubernetes",
      "label": "deploys to",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "extension-host",
      "target": "state-manager",
      "label": "reads/writes",
      "type": "smoothstep"
    }
  ]
}
```

## Architecture Notes

### Component Layers

1. **Presentation Layer**: React application with sections for different package manager features
2. **Communication Layer**: Message passing between webview and extension host
3. **Business Logic Layer**: Extension host command handlers coordinating operations
4. **Service Layer**: Helm service wrapping CLI operations and parsing outputs
5. **CLI Layer**: Helm 3.x executable for actual Helm operations
6. **Storage Layer**: State manager for configuration and caching

### Key Interactions

- User clicks tree item → webview opens with React app
- React app posts messages to extension for Helm operations
- Extension delegates to Helm service which spawns CLI processes
- Helm CLI interacts with Kubernetes cluster and local repositories
- State manager persists repository configuration and UI preferences
- Extension posts messages back to webview with operation results

