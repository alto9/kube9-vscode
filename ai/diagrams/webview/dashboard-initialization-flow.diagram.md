---
diagram_id: dashboard-initialization-flow
name: Dashboard Webview Initialization Flow
description: Shows correct and incorrect initialization sequences for dashboard webview, highlighting the race condition
type: flows
spec_id:
  - dashboard-webview-spec
  - free-nonoperated-dashboard-spec
  - free-operated-dashboard-spec
feature_id:
  - free-dashboard
  - operated-dashboard
---

# Dashboard Webview Initialization Flow

This diagram illustrates the correct initialization sequence for dashboard webviews and shows how the race condition occurs when the order is incorrect.

## Incorrect Flow - Race Condition

```json
{
  "nodes": [
    {
      "id": "user-click",
      "type": "input",
      "position": { "x": 100, "y": 50 },
      "data": { 
        "label": "User Clicks Dashboard",
        "description": "User initiates dashboard opening"
      }
    },
    {
      "id": "create-panel-wrong",
      "type": "default",
      "position": { "x": 100, "y": 150 },
      "data": { 
        "label": "Create Webview Panel",
        "description": "VSCode creates webview panel"
      }
    },
    {
      "id": "set-html-wrong",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": { 
        "label": "❌ Set HTML FIRST",
        "description": "panel.webview.html = getDashboardHtml()"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    },
    {
      "id": "html-loads-wrong",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": { 
        "label": "HTML Loads Immediately",
        "description": "JavaScript executes in webview"
      }
    },
    {
      "id": "request-sent-wrong",
      "type": "default",
      "position": { "x": 100, "y": 450 },
      "data": { 
        "label": "Send requestData Message",
        "description": "vscode.postMessage({ type: 'requestData' })"
      }
    },
    {
      "id": "message-lost",
      "type": "default",
      "position": { "x": 400, "y": 450 },
      "data": { 
        "label": "❌ MESSAGE LOST",
        "description": "Handler not registered yet"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    },
    {
      "id": "register-handler-wrong",
      "type": "default",
      "position": { "x": 100, "y": 550 },
      "data": { 
        "label": "❌ Register Handler TOO LATE",
        "description": "panel.webview.onDidReceiveMessage(...)"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    },
    {
      "id": "shows-zeros",
      "type": "output",
      "position": { "x": 100, "y": 650 },
      "data": { 
        "label": "Dashboard Shows Zeros",
        "description": "No data received - all metrics show 0"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user-click",
      "target": "create-panel-wrong",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e2",
      "source": "create-panel-wrong",
      "target": "set-html-wrong",
      "label": "WRONG ORDER",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#ff6b6b" }
    },
    {
      "id": "e3",
      "source": "set-html-wrong",
      "target": "html-loads-wrong",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e4",
      "source": "html-loads-wrong",
      "target": "request-sent-wrong",
      "label": "Immediate",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e5",
      "source": "request-sent-wrong",
      "target": "message-lost",
      "label": "Race condition",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#ff6b6b" }
    },
    {
      "id": "e6",
      "source": "request-sent-wrong",
      "target": "register-handler-wrong",
      "label": "Handler not ready",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#ff6b6b" }
    },
    {
      "id": "e7",
      "source": "register-handler-wrong",
      "target": "shows-zeros",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Correct Flow - No Race Condition

```json
{
  "nodes": [
    {
      "id": "user-click-correct",
      "type": "input",
      "position": { "x": 100, "y": 50 },
      "data": { 
        "label": "User Clicks Dashboard",
        "description": "User initiates dashboard opening"
      }
    },
    {
      "id": "create-panel-correct",
      "type": "default",
      "position": { "x": 100, "y": 150 },
      "data": { 
        "label": "Create Webview Panel",
        "description": "VSCode creates webview panel"
      }
    },
    {
      "id": "register-handler-correct",
      "type": "default",
      "position": { "x": 100, "y": 250 },
      "data": { 
        "label": "✅ Register Handler FIRST",
        "description": "panel.webview.onDidReceiveMessage(...)"
      },
      "style": { "background": "#51cf66", "color": "white" }
    },
    {
      "id": "set-html-correct",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": { 
        "label": "✅ Set HTML SECOND",
        "description": "panel.webview.html = getDashboardHtml()"
      },
      "style": { "background": "#51cf66", "color": "white" }
    },
    {
      "id": "html-loads-correct",
      "type": "default",
      "position": { "x": 100, "y": 450 },
      "data": { 
        "label": "HTML Loads",
        "description": "JavaScript executes in webview"
      }
    },
    {
      "id": "proactive-send",
      "type": "default",
      "position": { "x": 100, "y": 550 },
      "data": { 
        "label": "✅ Proactively Send Data",
        "description": "await sendInitialDashboardData()"
      },
      "style": { "background": "#51cf66", "color": "white" }
    },
    {
      "id": "fetch-data",
      "type": "default",
      "position": { "x": 400, "y": 550 },
      "data": { 
        "label": "Fetch Cluster Data",
        "description": "Query kubectl or operator"
      }
    },
    {
      "id": "send-update",
      "type": "default",
      "position": { "x": 100, "y": 650 },
      "data": { 
        "label": "Send updateData Message",
        "description": "panel.webview.postMessage({ type: 'updateData' })"
      }
    },
    {
      "id": "message-received",
      "type": "default",
      "position": { "x": 400, "y": 650 },
      "data": { 
        "label": "✅ Message Received",
        "description": "Handler processes data"
      },
      "style": { "background": "#51cf66", "color": "white" }
    },
    {
      "id": "shows-data",
      "type": "output",
      "position": { "x": 100, "y": 750 },
      "data": { 
        "label": "Dashboard Shows Data",
        "description": "All metrics display correctly"
      },
      "style": { "background": "#51cf66", "color": "white" }
    }
  ],
  "edges": [
    {
      "id": "ec1",
      "source": "user-click-correct",
      "target": "create-panel-correct",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "ec2",
      "source": "create-panel-correct",
      "target": "register-handler-correct",
      "label": "CORRECT ORDER",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "ec3",
      "source": "register-handler-correct",
      "target": "set-html-correct",
      "label": "Handler ready",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "ec4",
      "source": "set-html-correct",
      "target": "html-loads-correct",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "ec5",
      "source": "html-loads-correct",
      "target": "proactive-send",
      "label": "Don't wait for request",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "ec6",
      "source": "proactive-send",
      "target": "fetch-data",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "ec7",
      "source": "fetch-data",
      "target": "send-update",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "ec8",
      "source": "send-update",
      "target": "message-received",
      "label": "Handler captures message",
      "type": "smoothstep",
      "animated": true,
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "ec9",
      "source": "message-received",
      "target": "shows-data",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Timing Comparison

```json
{
  "nodes": [
    {
      "id": "timeline-start",
      "type": "input",
      "position": { "x": 50, "y": 100 },
      "data": { 
        "label": "T=0ms",
        "description": "User clicks dashboard"
      }
    },
    {
      "id": "t-100",
      "type": "default",
      "position": { "x": 250, "y": 100 },
      "data": { 
        "label": "T=100ms",
        "description": "Handler registered"
      }
    },
    {
      "id": "t-200",
      "type": "default",
      "position": { "x": 450, "y": 100 },
      "data": { 
        "label": "T=200ms",
        "description": "HTML set"
      }
    },
    {
      "id": "t-300",
      "type": "default",
      "position": { "x": 650, "y": 100 },
      "data": { 
        "label": "T=300ms",
        "description": "HTML loaded"
      }
    },
    {
      "id": "t-5000",
      "type": "output",
      "position": { "x": 850, "y": 100 },
      "data": { 
        "label": "T<5000ms",
        "description": "Data displayed"
      }
    },
    {
      "id": "wrong-timeline",
      "type": "default",
      "position": { "x": 250, "y": 250 },
      "data": { 
        "label": "WRONG: HTML at T=100ms",
        "description": "Race condition window"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    },
    {
      "id": "wrong-handler",
      "type": "default",
      "position": { "x": 450, "y": 250 },
      "data": { 
        "label": "Handler at T=200ms",
        "description": "Too late - message lost"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    },
    {
      "id": "wrong-result",
      "type": "default",
      "position": { "x": 850, "y": 250 },
      "data": { 
        "label": "Shows zeros forever",
        "description": "Until manual refresh"
      },
      "style": { "background": "#ff6b6b", "color": "white" }
    }
  ],
  "edges": [
    {
      "id": "et1",
      "source": "timeline-start",
      "target": "t-100",
      "label": "Correct",
      "type": "smoothstep",
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "et2",
      "source": "t-100",
      "target": "t-200",
      "label": "Correct",
      "type": "smoothstep",
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "et3",
      "source": "t-200",
      "target": "t-300",
      "type": "smoothstep",
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "et4",
      "source": "t-300",
      "target": "t-5000",
      "label": "Data fetched",
      "type": "smoothstep",
      "style": { "stroke": "#51cf66" }
    },
    {
      "id": "ew1",
      "source": "timeline-start",
      "target": "wrong-timeline",
      "label": "Wrong order",
      "type": "smoothstep",
      "style": { "stroke": "#ff6b6b" }
    },
    {
      "id": "ew2",
      "source": "wrong-timeline",
      "target": "wrong-handler",
      "label": "Race window",
      "type": "smoothstep",
      "style": { "stroke": "#ff6b6b" }
    },
    {
      "id": "ew3",
      "source": "wrong-handler",
      "target": "wrong-result",
      "type": "smoothstep",
      "style": { "stroke": "#ff6b6b" }
    }
  ]
}
```

## Key Insights

### Race Condition Window

The race condition occurs in the ~100-200ms window between:
1. HTML being set (immediately starts loading)
2. Message handler being registered (happens after HTML set)

During this window, the webview JavaScript executes and sends `requestData`, but no handler exists to receive it.

### Solution Requirements

1. **Handler First**: Register `onDidReceiveMessage` before setting HTML
2. **Proactive Sending**: Don't rely on webview requests - proactively send data
3. **Guaranteed Order**: Use `await` or synchronous operations to enforce sequence
4. **Fast Registration**: Keep handler registration under 100ms

### Implementation Notes

Both `FreeDashboardPanel.ts` and `OperatedDashboardPanel.ts` must follow this pattern:

```typescript
// ✅ CORRECT ORDER
// 1. Register handler
panel.webview.onDidReceiveMessage(...);

// 2. Set HTML
panel.webview.html = getHtml();

// 3. Send initial data
await sendInitialData();
```

Never reverse steps 1 and 2, as this creates the race condition.
