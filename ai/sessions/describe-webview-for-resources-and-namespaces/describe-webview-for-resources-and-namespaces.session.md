---
session_id: describe-webview-for-resources-and-namespaces
start_time: '2025-12-05T20:18:51.075Z'
status: completed
problem_statement: Describe webview for resources and namespaces
changed_files:
  - path: ai/features/webview/describe-webview.feature.md
    change_type: added
    scenarios_added:
      - Opening Describe (formatted) shows stub content in a shared webview
      - Opening Describe (Raw) shows read-only editor with stub content
      - Reusing the shared Describe webview across resources
      - Left-click Describe opens stub webview
      - Right-click Describe opens stub webview
      - Right-click Describe (Raw) opens full describe in read-only editor
    scenarios_removed:
      - Opening Describe (formatted) shows stub content in a shared webview
      - Opening Describe (Raw) shows read-only editor with stub content
start_commit: 09e827279b40249ef4fa824d72efd1052b245424
end_time: '2025-12-05T21:34:47.741Z'
---
## Problem Statement

Describe webview for resources and namespaces

## Goals

- Provide a single reusable Describe webview for formatted describe output to prevent tab sprawl.
- Support right-click context actions for both Describe (formatted) and Describe (Raw) flows.
- Ensure namespaces render in the Describe webview using the existing namespace view even though kubectl describe namespace is not available.
- Enable in-webview navigation between related resources (e.g., pods from a deployment) without spawning new panels.
- Preserve usability basics: refresh, copy/export, and readable formatting/syntax highlighting.

## Approach

- Reuse a single Describe webview panel (retain context; reveal if already created) for all formatted describe operations. Left-click on a describable tree item opens/reveals this panel.
- Add context menu options: Describe → formatted webview; Describe (Raw) → open YAML/JSON in a text editor (or raw tab if centralized).
- Build a message contract: `{cluster, namespace, kind, name, apiVersion, mode}`; extension fetches describe-equivalent data (metadata, spec/status, conditions, events, pod extras) and posts payload to the webview.
- For namespaces, load the existing namespace view inside the Describe webview to keep behavior consistent despite no native `kubectl describe namespace`.
- Allow related-resource links in the webview to post back navigation requests that reload the target object in the same panel; optionally add Back/Forward and breadcrumbs.
- Add refresh action and lightweight caching (LRU) to reduce API churn while allowing explicit refresh bypass.

## Key Decisions

- Single shared Describe panel (formatted) is the default target for left-click describe actions to avoid tab explosion.
- Keep both formatted and raw entry points: formatted in the Describe webview; raw in a standard text editor for simplicity.
- Namespaces are treated as describable: render the existing namespace view within the Describe webview instead of raw describe output.
- Navigation stays within the Describe panel; no additional panels for related resources.

## Notes

- Ensure syntax highlighting/readability for both formatted and raw views; maintain copy/export controls.
- Include events (last N) and pod-specific fields (container status, restart count, node name) in the formatted payload where applicable.
- Refresh should respect cache bypass; handle errors clearly (not found vs connectivity).
- Kubectl “describe” registry (GroupKind → describer) is hardcoded in `kubectl/pkg/describe/describe.go`; use it as reference for what data to show per kind:
  - Pod: metadata, node/hostIP/podIP, service account, tolerations, volumes, containers (image, state, restarts, last state, env, mounts), conditions, QoS, events.
  - Deployment/ReplicaSet/StatefulSet/DaemonSet: selector, replicas (desired/current/updated/available), strategy, pod template (labels/annotations/containers), conditions, related RS/Pods via selector, events.
  - Job/CronJob: completions/parallelism, start/completion times, active/succeeded/failed, pod statuses via selector, schedule/suspend/history limits, events.
  - Service: type, ClusterIP/ExternalIP/LB ingress, ports/targetPorts/nodePorts, selectors, session affinity, endpoints/slices, events.
  - Ingress: hosts/rules/paths/backends, TLS, addresses, events.
  - Node: roles, labels/taints, addresses, capacity/allocatable, system info, conditions, pods on node (`fieldSelector=spec.nodeName`), allocated resources, events.
  - PVC/PV: status/phase, capacity/access modes/storage class, volume binding, conditions, events.
  - ConfigMap/Secret: keys summary (no secret values), events.
  - RBAC (Role/ClusterRole/Bindings): rules/subjects, events if any.
  - HPA: current/target metrics, min/max replicas, conditions, last scale time, events.
  - NetworkPolicy: pod selector and policy types/ingress/egress rules, events.
  - EndpointSlice/Endpoints: addresses/ports readiness, events.
  - Namespace: no kubectl describe; we render our existing namespace view inside the Describe panel.
