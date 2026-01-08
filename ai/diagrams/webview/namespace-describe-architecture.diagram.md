---
diagram_id: namespace-describe-architecture
name: Namespace Describe Webview Architecture
description: Architecture for displaying Namespace describe information in the shared describe webview
type: components
spec_id:
  - namespace-describe-webview-spec
feature_id:
  - namespace-describe-webview
---

# Namespace Describe Webview Architecture

This diagram shows the complete architecture for the Namespace Describe Webview, following the shared describe webview pattern used for Pods, Deployments, and Nodes.

```json
{
  "nodes": [
    {
      "id": "namespace-tree-item",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "NamespaceTreeItem",
        "description": "Tree item for Namespace resources"
      }
    },
    {
      "id": "describe-webview",
      "type": "default",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "DescribeWebview",
        "description": "Shared webview manager"
      }
    },
    {
      "id": "namespace-describe-provider",
      "type": "default",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "NamespaceDescribeProvider",
        "description": "Fetches and formats Namespace data"
      }
    },
    {
      "id": "k8s-client",
      "type": "default",
      "position": { "x": 700, "y": 100 },
      "data": {
        "label": "Kubernetes Client",
        "description": "API client for Namespace queries"
      }
    },
    {
      "id": "webview-ui",
      "type": "default",
      "position": { "x": 300, "y": 300 },
      "data": {
        "label": "Namespace Describe UI",
        "description": "React webview interface"
      }
    },
    {
      "id": "overview-tab",
      "type": "default",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "Overview Tab",
        "description": "Name, status, phase, metadata"
      }
    },
    {
      "id": "resources-tab",
      "type": "default",
      "position": { "x": 200, "y": 450 },
      "data": {
        "label": "Resources Tab",
        "description": "Resource counts by type"
      }
    },
    {
      "id": "quotas-tab",
      "type": "default",
      "position": { "x": 350, "y": 450 },
      "data": {
        "label": "Quotas Tab",
        "description": "Resource quotas and usage"
      }
    },
    {
      "id": "limit-ranges-tab",
      "type": "default",
      "position": { "x": 500, "y": 450 },
      "data": {
        "label": "Limit Ranges Tab",
        "description": "Default limits and constraints"
      }
    },
    {
      "id": "events-tab",
      "type": "default",
      "position": { "x": 650, "y": 450 },
      "data": {
        "label": "Events Tab",
        "description": "Namespace events timeline"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "namespace-tree-item",
      "target": "describe-webview",
      "label": "left-click → describeNamespace",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "describe-webview",
      "target": "namespace-describe-provider",
      "label": "getNamespaceDetails()",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "namespace-describe-provider",
      "target": "k8s-client",
      "label": "readNamespace()",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "k8s-client",
      "target": "namespace-describe-provider",
      "label": "Namespace object",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e5",
      "source": "namespace-describe-provider",
      "target": "k8s-client",
      "label": "listNamespacedResourceQuota()",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "k8s-client",
      "target": "namespace-describe-provider",
      "label": "ResourceQuota[]",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e7",
      "source": "namespace-describe-provider",
      "target": "k8s-client",
      "label": "listNamespacedLimitRange()",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "k8s-client",
      "target": "namespace-describe-provider",
      "label": "LimitRange[]",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e9",
      "source": "namespace-describe-provider",
      "target": "k8s-client",
      "label": "countNamespacedResources()",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "k8s-client",
      "target": "namespace-describe-provider",
      "label": "Resource counts",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e11",
      "source": "namespace-describe-provider",
      "target": "k8s-client",
      "label": "listNamespacedEvent()",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "k8s-client",
      "target": "namespace-describe-provider",
      "label": "Event[]",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e13",
      "source": "namespace-describe-provider",
      "target": "describe-webview",
      "label": "NamespaceDescribeData",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e14",
      "source": "describe-webview",
      "target": "webview-ui",
      "label": "postMessage(namespaceData)",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e15",
      "source": "webview-ui",
      "target": "overview-tab",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "webview-ui",
      "target": "resources-tab",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "webview-ui",
      "target": "quotas-tab",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "webview-ui",
      "target": "limit-ranges-tab",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "webview-ui",
      "target": "events-tab",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "webview-ui",
      "target": "describe-webview",
      "label": "postMessage(actions)",
      "type": "smoothstep"
    }
  ]
}
```

## Architecture Overview

### Extension Host Layer

**NamespaceTreeItem**: Tree item representing a Namespace resource in the cluster tree view. When left-clicked, triggers the shared Describe webview to open.

**DescribeWebview**: Shared singleton webview manager that displays describe information. One instance per cluster context, reused across different resource selections (Pods, Deployments, Nodes, Namespaces).

**NamespaceDescribeProvider**: Data provider that fetches Namespace details from Kubernetes API and formats them for display. Handles Namespace objects, resource counts, resource quotas, limit ranges, and related events.

**Kubernetes Client**: API client using `@kubernetes/client-node` library for querying Namespace resources and related objects.

### Webview Layer

**Namespace Describe UI**: React-based webview interface that displays Namespace information in a structured, graphical format with tabbed views.

**Overview Tab**: Displays Namespace name, status, phase (Active/Terminating), age, labels, annotations, and metadata.

**Resources Tab**: Shows resource counts for all resource types in the namespace (Pods, Deployments, Services, ConfigMaps, Secrets, etc.) with visual indicators for health status.

**Quotas Tab**: Displays configured resource quotas with current usage vs limits, visual progress indicators, and warning indicators if approaching limits.

**Limit Ranges Tab**: Shows default requests/limits, min/max constraints, organized by resource type (Pod, Container, PVC).

**Events Tab**: Shows related Kubernetes events for the namespace in a timeline format with type, reason, and message.

## Data Flow

### Opening Describe Webview

1. User left-clicks Namespace in tree view
2. NamespaceTreeItem triggers command to open Describe webview
3. DescribeWebview shows or reveals shared webview panel for cluster
4. DescribeWebview title updates to "Namespace / {name}"
5. DescribeWebview requests Namespace details from NamespaceDescribeProvider
6. NamespaceDescribeProvider queries Kubernetes API for Namespace object
7. NamespaceDescribeProvider queries for Resource Quotas in namespace
8. NamespaceDescribeProvider queries for Limit Ranges in namespace
9. NamespaceDescribeProvider counts resources by type in namespace
10. NamespaceDescribeProvider queries for related Events
11. NamespaceDescribeProvider formats data into NamespaceDescribeData structure
12. DescribeWebview sends formatted data to webview via postMessage
13. Webview UI renders data in tabs

### Switching Between Resources

1. User clicks different Namespace or different resource type (Pod, Node, etc.)
2. Same shared webview panel is reused
3. Webview title updates to match resource type and name
4. Webview content updates to show new resource data
5. No new tabs or panels are created

## Component Responsibilities

### NamespaceTreeItem

- Represent Namespace resource in tree view
- Handle left-click command to open Describe webview
- Provide Namespace metadata (name, context)

### DescribeWebview

- Manage shared webview lifecycle (create, show, update, dispose)
- Maintain one webview instance per cluster context
- Handle message protocol between extension and webview
- Coordinate with resource-specific providers (Pod, Deployment, Node, Namespace)
- Update webview title based on resource type and name
- Execute VS Code commands (refresh, view YAML)

### NamespaceDescribeProvider

- Fetch Namespace object from Kubernetes API
- Query Resource Quotas for namespace
- Query Limit Ranges for namespace
- Count resources by type (Pods, Deployments, Services, ConfigMaps, Secrets, etc.)
- Query related Events for namespace
- Calculate resource usage against quotas
- Structure data for graphical display
- Handle errors and edge cases

### Namespace Describe UI

- Render tabbed interface (Overview, Resources, Quotas, Limit Ranges, Events)
- Display status indicators with color coding
- Format resource values (CPU, memory, pods)
- Show progress bars for quota usage
- Display resource counts with health indicators
- Show timeline for events
- Handle user interactions
- Send action messages to extension

## Shared Webview Pattern

- Each cluster context has ONE shared DescribeWebview instance
- Clicking any resource (Pod, Deployment, Node, Namespace) in the same cluster reuses the same webview tab
- Webview title updates to reflect current resource type and name
- Webview content updates to show resource-specific information
- No duplicate tabs are created
- Switching between clusters shows different webview instances

## Performance

- Cached Namespace data (configurable TTL)
- Efficient resource counting with pagination
- Lazy loading of resource quotas and limit ranges
- Debounced refresh actions
- Background updates for resource counts

## Security

- Webview uses Content Security Policy
- All operations validated in extension host
- Respects Kubernetes RBAC permissions
- No arbitrary code execution
- Sensitive data sanitized before display

