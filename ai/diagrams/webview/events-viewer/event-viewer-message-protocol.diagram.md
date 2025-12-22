---
diagram_id: event-viewer-message-protocol
name: Event Viewer Message Protocol
description: Message flow between EventViewerPanel extension and React webview
type: flows
spec_id:
  - event-viewer-protocol-spec
  - event-viewer-panel-spec
feature_id:
  - event-viewer-panel
  - event-viewer-actions
---

# Diagram

```json
{
  "nodes": [
    {
      "id": "webview",
      "type": "default",
      "position": {
        "x": 160.78593561083494,
        "y": 194.42442762328682
      },
      "data": {
        "label": "Webview (React)",
        "description": "EventViewerApp component"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 160.78593561083494,
        "y": 194.42442762328682
      },
      "dragging": false
    },
    {
      "id": "panel",
      "type": "default",
      "position": {
        "x": 738.3448527898527,
        "y": 173.62923912484337
      },
      "data": {
        "label": "Extension (Panel)",
        "description": "EventViewerPanel class"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 738.3448527898527,
        "y": 173.62923912484337
      },
      "dragging": false
    },
    {
      "id": "ready-msg",
      "type": "default",
      "position": {
        "x": 272.3948183829391,
        "y": -10.37446203020015
      },
      "data": {
        "label": "ready",
        "description": "Webview initialization"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 272.3948183829391,
        "y": -10.37446203020015
      },
      "dragging": false
    },
    {
      "id": "initial-state-msg",
      "type": "default",
      "position": {
        "x": 472.3948183829391,
        "y": -13.16224821855674
      },
      "data": {
        "label": "initialState",
        "description": "cluster, filters, autoRefresh"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 472.3948183829391,
        "y": -13.16224821855674
      },
      "dragging": false
    },
    {
      "id": "load-msg",
      "type": "default",
      "position": {
        "x": 70.8414529364868,
        "y": -11.15114475342638
      },
      "data": {
        "label": "load/refresh/filter",
        "description": "Request events"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 70.8414529364868,
        "y": -11.15114475342638
      },
      "dragging": false
    },
    {
      "id": "loading-msg",
      "type": "default",
      "position": {
        "x": 779.523756206105,
        "y": 305.9870459573479
      },
      "data": {
        "label": "loading",
        "description": "Show spinner"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 779.523756206105,
        "y": 305.9870459573479
      },
      "dragging": false
    },
    {
      "id": "events-msg",
      "type": "default",
      "position": {
        "x": 605.1640987960786,
        "y": 307.99814942247826
      },
      "data": {
        "label": "events",
        "description": "KubernetesEvent[]"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 605.1640987960786,
        "y": 307.99814942247826
      },
      "dragging": false
    },
    {
      "id": "action-msg",
      "type": "default",
      "position": {
        "x": 18.053666748130127,
        "y": 308.8210965837477
      },
      "data": {
        "label": "export/copy/navigate",
        "description": "User actions"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 18.053666748130127,
        "y": 308.8210965837477
      },
      "dragging": false
    },
    {
      "id": "error-msg",
      "type": "default",
      "position": {
        "x": 736.333749324722,
        "y": -12.293036619244091
      },
      "data": {
        "label": "error",
        "description": "Error state"
      },
      "width": 150,
      "height": 39,
      "selected": false,
      "positionAbsolute": {
        "x": 736.333749324722,
        "y": -12.293036619244091
      },
      "dragging": false
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "webview",
      "target": "ready-msg",
      "label": "on mount",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e2",
      "source": "ready-msg",
      "target": "panel",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e3",
      "source": "panel",
      "target": "initial-state-msg",
      "label": "respond",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e4",
      "source": "initial-state-msg",
      "target": "webview",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e5",
      "source": "webview",
      "target": "load-msg",
      "label": "user action",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e6",
      "source": "load-msg",
      "target": "panel",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e7",
      "source": "panel",
      "target": "loading-msg",
      "label": "before fetch",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e8",
      "source": "loading-msg",
      "target": "webview",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e9",
      "source": "panel",
      "target": "events-msg",
      "label": "after fetch",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e10",
      "source": "events-msg",
      "target": "webview",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e11",
      "source": "webview",
      "target": "action-msg",
      "label": "user action",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e12",
      "source": "action-msg",
      "target": "panel",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    },
    {
      "id": "e13",
      "source": "panel",
      "target": "error-msg",
      "label": "on error",
      "type": "smoothstep",
      "selected": false
    },
    {
      "id": "e14",
      "source": "error-msg",
      "target": "webview",
      "label": "postMessage",
      "type": "smoothstep",
      "animated": true,
      "selected": false
    }
  ]
}
```
