# User Stories

## Core Stories

- As a developer, I can browse cluster resources from a tree without leaving VS Code.
- As an operator, I can inspect supported built-in resources and custom resources with structured describe, YAML, logs where applicable, and events to troubleshoot quickly.
- As a platform engineer, I can switch contexts and namespaces and keep actions scoped correctly.
- As a user, I can edit YAML safely with conflict detection and permission-aware behavior.
- As a GitOps user, I can view and act on ArgoCD applications from the same extension.
- As a service developer, I can create and manage port forwards from resource context menus.

## ArgoCD Application Resource Graph

- As a GitOps engineer, when I open an ArgoCD Application from the cluster tree, **Graph** is the **default tab** and **Details** is my **secondary tab** for metadata, app-level controls, and tabular drift review; the graph shows the Application as the root and arranges managed resources by dependency relationships when the topology source supports them.
- As a GitOps engineer, when **resource-tree** topology is unavailable, I still get a **limited topology** graph from Application CR data with clear indication that dependency edges may be incomplete.
- As a GitOps engineer, I can read **sync status** and **health status** on every graph tile at a glance, using the same status semantics as elsewhere in the extension's ArgoCD surfaces.
- As a GitOps engineer, I can pan and zoom the graph and fit the view so I can explore large applications without losing context.
- As a GitOps engineer, I can see every returned managed resource for the Application represented in the graph experience, even when large-application grouping or limited topology affects how relationships are displayed.
- As a GitOps engineer, I can select a graph resource tile and keep that selection across refreshes while the same resource still exists.
- As a GitOps engineer, I can open a three-dot actions menu on each eligible resource tile and only see actions that are valid for that resource kind and permission state.
- As a GitOps engineer, I can run **application-level sync, refresh, and hard refresh** from the Application root node using the same flows already available for ArgoCD applications.
- As a GitOps engineer, I can **restart rollout** on a Deployment node from the graph when I need to recycle pods without leaving the application detail panel.
- As a GitOps engineer, I can **navigate to resource in tree** from a managed-resource graph tile to reveal the corresponding Kubernetes tree workload (including destination-namespace resources) where the extension can map that resource identity.
- As a GitOps engineer in an operated cluster, I can see **full topology** (pods, replica sets, parent/child edges) when kube9-operator or extension REST resource-tree enrichment succeeds, without configuring a personal bearer token when the operator path is active.
- As a GitOps engineer, I can **filter the graph** by resource name, kind, and sync status from the graph toolbar without mutating cluster state or losing the underlying complete resource inventory on refresh.
- As a GitOps engineer, after I sync or refresh an application, the graph **updates in place** with refreshed sync and health on affected nodes without requiring me to close and reopen the panel.
- As a GitOps engineer working on a large application, I can still use the graph when node count is high because the experience avoids unusable clutter through progressive disclosure or grouping rather than failing silently.

## Enhancement Stories

- As a user with kube9-operator installed, I get richer status/reporting surfaces.
- As a platform engineer preparing clusters for AI workloads, I can open a Kubernetes AI Conformance readiness report in VS Code so I can see requirement rollups, failed or warning rows, and remediation-style notes without leaving my editor.
- As a compliance or platform reviewer, I can distinguish observed readiness checks from items that require external evidence so the report does not overstate cluster conformance.
- As a Helm user, I can manage chart repositories and releases in the extension.
