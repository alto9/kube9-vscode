---
diagram_id: node-describe-flow
name: Node Describe Webview Flow
description: Architecture and data flow for the Node Describe Webview showing how node information is fetched, transformed, and displayed
type: flows
spec_id:
  - node-describe-webview-spec
feature_id:
  - node-describe-webview
---

# Node Describe Webview Flow

This diagram shows the complete flow of data from user interaction to webview display for the Node Describe feature.

```json
{
  "nodes": [
    {
      "id": "user",
      "type": "default",
      "position": { "x": 50, "y": 100 },
      "data": {
        "label": "User",
        "description": "User interacts with node in tree view"
      }
    },
    {
      "id": "tree-view",
      "type": "default",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Tree View",
        "description": "Displays nodes category with node items"
      }
    },
    {
      "id": "node-describe-webview",
      "type": "default",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "NodeDescribeWebview",
        "description": "Manages webview panel and message passing"
      }
    },
    {
      "id": "node-commands",
      "type": "default",
      "position": { "x": 750, "y": 50 },
      "data": {
        "label": "NodeCommands",
        "description": "Fetches node details via kubectl"
      }
    },
    {
      "id": "pod-commands",
      "type": "default",
      "position": { "x": 750, "y": 150 },
      "data": {
        "label": "PodCommands",
        "description": "Fetches pods running on node"
      }
    },
    {
      "id": "kubectl",
      "type": "default",
      "position": { "x": 1000, "y": 100 },
      "data": {
        "label": "kubectl",
        "description": "Kubernetes CLI"
      }
    },
    {
      "id": "data-transformer",
      "type": "default",
      "position": { "x": 500, "y": 300 },
      "data": {
        "label": "Data Transformer",
        "description": "Transforms V1Node and V1Pod[] to NodeDescribeData"
      }
    },
    {
      "id": "webview-ui",
      "type": "default",
      "position": { "x": 250, "y": 300 },
      "data": {
        "label": "Webview UI",
        "description": "Renders node information in HTML"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user",
      "target": "tree-view",
      "label": "Left-click node",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "tree-view",
      "target": "node-describe-webview",
      "label": "showNode(nodeName)",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "node-describe-webview",
      "target": "node-commands",
      "label": "getNodeDetails()",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "node-describe-webview",
      "target": "pod-commands",
      "label": "getPodsOnNode()",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "node-commands",
      "target": "kubectl",
      "label": "kubectl get node <name> -o json",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "pod-commands",
      "target": "kubectl",
      "label": "kubectl get pods --field-selector",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "kubectl",
      "target": "node-commands",
      "label": "V1Node JSON",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "kubectl",
      "target": "pod-commands",
      "label": "V1PodList JSON",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "node-commands",
      "target": "data-transformer",
      "label": "NodeDetailsResult",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "pod-commands",
      "target": "data-transformer",
      "label": "PodsOnNodeResult",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "data-transformer",
      "target": "node-describe-webview",
      "label": "NodeDescribeData",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "node-describe-webview",
      "target": "webview-ui",
      "label": "postMessage(updateNodeData)",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "webview-ui",
      "target": "user",
      "label": "Display node information",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "webview-ui",
      "target": "node-describe-webview",
      "label": "postMessage(refresh)",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e15",
      "source": "webview-ui",
      "target": "node-describe-webview",
      "label": "postMessage(navigateToPod)",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Diagram Notes

### Key Components

1. **User**: Initiates node describe action by clicking a node in the tree view
2. **Tree View**: Displays nodes and forwards clicks to the webview controller
3. **NodeDescribeWebview**: Central controller managing webview lifecycle and data flow
4. **NodeCommands**: Executes kubectl commands to fetch node details
5. **PodCommands**: Executes kubectl commands to fetch pods running on the node
6. **kubectl**: Kubernetes CLI that communicates with cluster API
7. **Data Transformer**: Transforms raw Kubernetes API data into display-ready format
8. **Webview UI**: Renders HTML interface with node information

### Data Flow Phases

#### Phase 1: User Interaction
- User left-clicks a node in the tree view
- Tree view calls `NodeDescribeWebview.showNode(nodeName)`

#### Phase 2: Data Fetching
- NodeDescribeWebview calls NodeCommands.getNodeDetails()
- NodeDescribeWebview calls PodCommands.getPodsOnNode()
- Both commands execute kubectl CLI commands
- kubectl returns V1Node and V1PodList data

#### Phase 3: Data Transformation
- Raw Kubernetes API data is transformed to NodeDescribeData
- Resource metrics are calculated (capacity, allocatable, used, available)
- Pod resource requests and limits are aggregated
- Conditions are enriched with relative timestamps
- Labels, taints, and addresses are extracted

#### Phase 4: Webview Update
- Transformed data is sent to webview via postMessage
- Webview UI receives updateNodeData message
- HTML is rendered with all node information sections

#### Phase 5: User Interactions (Ongoing)
- User clicks refresh → webview posts 'refresh' message → cycle repeats from Phase 2
- User clicks pod name → webview posts 'navigateToPod' message → tree view highlights pod
- User copies value → webview posts 'copyValue' message → value copied to clipboard

### Message Protocol

**Extension → Webview**:
- `updateNodeData`: Complete node information for display
- `refreshComplete`: Refresh operation completed
- `error`: Error occurred during data fetching

**Webview → Extension**:
- `refresh`: User requested data refresh
- `navigateToPod`: User clicked pod name, navigate to pod in tree
- `copyValue`: User clicked copy, copy value to clipboard

### Performance Notes

- Node details and pod list are fetched in parallel
- Data is cached for 30 seconds to reduce kubectl calls
- Webview reuses single panel, updating content instead of creating new panels
- Large pod lists (>100 pods) use virtual scrolling for performance

