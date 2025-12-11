---
diagram_id: context-aware-namespace-flow
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
diagram_type: flow
---

# Context-Aware Namespace Management Flow

This diagram illustrates the flow when a user sets a namespace on a specific cluster context (not the current context) in the tree view.

```json
{
  "nodes": [
    {
      "id": "user-action",
      "type": "default",
      "position": { "x": 250, "y": 50 },
      "data": {
        "label": "User Action",
        "description": "User right-clicks namespace under 'minikube' cluster\nCurrent context: prod-cluster"
      }
    },
    {
      "id": "tree-item",
      "type": "default",
      "position": { "x": 250, "y": 150 },
      "data": {
        "label": "ClusterTreeItem",
        "description": "item.label = 'default'\nitem.resourceData.context.name = 'minikube'"
      }
    },
    {
      "id": "command-handler",
      "type": "default",
      "position": { "x": 250, "y": 250 },
      "data": {
        "label": "setActiveNamespaceCommand()",
        "description": "Extract:\n- namespaceName = 'default'\n- contextName = 'minikube'"
      }
    },
    {
      "id": "validate",
      "type": "decision",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "Valid Data?",
        "description": "namespaceName && contextName present?"
      }
    },
    {
      "id": "error-missing",
      "type": "default",
      "position": { "x": 450, "y": 350 },
      "data": {
        "label": "Error",
        "description": "Show error: missing data",
        "style": "error"
      }
    },
    {
      "id": "set-namespace",
      "type": "default",
      "position": { "x": 250, "y": 450 },
      "data": {
        "label": "setNamespace()",
        "description": "setNamespace('default', 'minikube')"
      }
    },
    {
      "id": "build-command",
      "type": "default",
      "position": { "x": 250, "y": 550 },
      "data": {
        "label": "Build kubectl Command",
        "description": "args = ['config', 'set-context', 'minikube', '--namespace=default']"
      }
    },
    {
      "id": "execute-kubectl",
      "type": "default",
      "position": { "x": 250, "y": 650 },
      "data": {
        "label": "Execute kubectl",
        "description": "kubectl config set-context minikube --namespace=default"
      }
    },
    {
      "id": "kubectl-success",
      "type": "decision",
      "position": { "x": 250, "y": 750 },
      "data": {
        "label": "Success?",
        "description": "kubectl exit code 0?"
      }
    },
    {
      "id": "error-kubectl",
      "type": "default",
      "position": { "x": 450, "y": 750 },
      "data": {
        "label": "Error",
        "description": "Log error and return false",
        "style": "error"
      }
    },
    {
      "id": "invalidate-cache",
      "type": "default",
      "position": { "x": 250, "y": 850 },
      "data": {
        "label": "Invalidate Cache",
        "description": "namespaceCache.invalidateCache()"
      }
    },
    {
      "id": "return-success",
      "type": "default",
      "position": { "x": 250, "y": 950 },
      "data": {
        "label": "Return Success",
        "description": "return true"
      }
    },
    {
      "id": "update-ui",
      "type": "default",
      "position": { "x": 250, "y": 1050 },
      "data": {
        "label": "Update UI",
        "description": "- Show success notification\n- Refresh tree view\n- Add checkmark to 'default' under 'minikube'\n- Update status bar"
      }
    },
    {
      "id": "current-context",
      "type": "default",
      "position": { "x": 250, "y": 1150 },
      "data": {
        "label": "Current Context",
        "description": "kubectl current context STILL 'prod-cluster'\n(No context switching occurred)",
        "style": "success"
      }
    },
    {
      "id": "bug-flow",
      "type": "default",
      "position": { "x": 650, "y": 550 },
      "data": {
        "label": "BUG: Old Behavior",
        "description": "args = ['config', 'set-context', '--current', '--namespace=default']\n\nSets namespace on 'prod-cluster' instead of 'minikube'!",
        "style": "error"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user-action",
      "target": "tree-item",
      "label": "Select 'Set as Active Namespace'"
    },
    {
      "id": "e2",
      "source": "tree-item",
      "target": "command-handler",
      "label": "Pass tree item"
    },
    {
      "id": "e3",
      "source": "command-handler",
      "target": "validate",
      "label": "Extract data"
    },
    {
      "id": "e4",
      "source": "validate",
      "target": "error-missing",
      "label": "No"
    },
    {
      "id": "e5",
      "source": "validate",
      "target": "set-namespace",
      "label": "Yes"
    },
    {
      "id": "e6",
      "source": "set-namespace",
      "target": "build-command",
      "label": "Call with context"
    },
    {
      "id": "e7",
      "source": "build-command",
      "target": "execute-kubectl",
      "label": "Command ready"
    },
    {
      "id": "e8",
      "source": "execute-kubectl",
      "target": "kubectl-success",
      "label": "Check result"
    },
    {
      "id": "e9",
      "source": "kubectl-success",
      "target": "error-kubectl",
      "label": "No"
    },
    {
      "id": "e10",
      "source": "kubectl-success",
      "target": "invalidate-cache",
      "label": "Yes"
    },
    {
      "id": "e11",
      "source": "invalidate-cache",
      "target": "return-success",
      "label": ""
    },
    {
      "id": "e12",
      "source": "return-success",
      "target": "update-ui",
      "label": ""
    },
    {
      "id": "e13",
      "source": "update-ui",
      "target": "current-context",
      "label": "Complete"
    },
    {
      "id": "e-bug",
      "source": "build-command",
      "target": "bug-flow",
      "label": "BUG",
      "style": "dashed",
      "animated": true
    }
  ]
}
```

## Key Points

### Correct Behavior (Left Flow)
1. **Context Extraction**: Command handler extracts `contextName` from tree item's `resourceData.context.name`
2. **Specific Targeting**: kubectl command targets the specific context: `kubectl config set-context minikube --namespace=default`
3. **No Context Switching**: The current kubectl context remains unchanged (`prod-cluster`)
4. **Correct Updates**: Namespace is set on the clicked cluster's context (`minikube`), not the current context

### Bug Behavior (Right Path - Dashed Line)
1. **Missing Context**: Old code doesn't extract or use `contextName`
2. **Wrong Target**: kubectl always uses `--current` flag: `kubectl config set-context --current --namespace=default`
3. **Wrong Context Modified**: Namespace gets set on `prod-cluster` (current context) instead of `minikube` (clicked cluster)
4. **User Confusion**: The namespace from one cluster is applied to a completely different cluster

## Multi-Context Scenario

```
┌─────────────────────────────────────────────────────┐
│ kubectl contexts in kubeconfig:                     │
│                                                      │
│ Context: minikube                                    │
│   cluster: minikube                                  │
│   namespace: <not set>                              │
│                                                      │
│ Context: prod-cluster (CURRENT)                     │
│   cluster: production                                │
│   namespace: production                              │
└─────────────────────────────────────────────────────┘

User clicks: "minikube" → "Namespaces" → "default" → "Set as Active Namespace"

┌─────────── CORRECT BEHAVIOR ───────────┐
│ kubectl config set-context minikube    │
│         --namespace=default            │
│                                        │
│ Result:                                │
│   minikube namespace: default   ✓      │
│   prod-cluster namespace: production   │
│   current context: prod-cluster        │
└────────────────────────────────────────┘

┌─────────── BUG BEHAVIOR ───────────────┐
│ kubectl config set-context --current   │
│         --namespace=default            │
│                                        │
│ Result:                                │
│   minikube namespace: <not set>        │
│   prod-cluster namespace: default  ✗   │
│   current context: prod-cluster        │
│                                        │
│ WRONG! Set namespace on wrong cluster  │
└────────────────────────────────────────┘
```

