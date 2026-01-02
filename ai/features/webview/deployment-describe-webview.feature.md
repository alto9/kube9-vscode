---
feature_id: deployment-describe-webview
name: Deployment Describe Webview
description: Detailed webview showing comprehensive deployment information including status, replicas, strategy, pod template, rollout history, and conditions
spec_id:
  - deployment-describe-webview-spec
---

# Deployment Describe Webview

```gherkin
Feature: Deployment Describe Webview displays comprehensive deployment information

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster
  And the cluster has one or more deployments

Scenario: Left-click on Deployment opens describe webview with overview
  Given a user views the Workloads section in the tree
  And the Deployments category lists one or more deployments (e.g., "nginx-deployment", "api-server")
  When the user left-clicks on a deployment (e.g., "nginx-deployment")
  Then a shared Describe webview should open or reveal
  And the webview title should show "Deployment / nginx-deployment"
  And the webview should display a Deployment Overview section with:
    | Field            | Description                                    |
    | Name             | Deployment name                                |
    | Namespace        | Namespace where deployment exists              |
    | Status           | Status indicator (Available, Progressing, Failed) with visual indicator |
    | Replicas         | Current/Desired/Ready/Available replica counts |
    | Strategy         | Deployment strategy (RollingUpdate, Recreate)  |
    | Max Surge        | Maximum additional pods during update          |
    | Max Unavailable  | Maximum unavailable pods during update         |
    | Creation Time    | Timestamp when deployment was created          |
    | Age              | Relative age (e.g., "5d", "2h", "30m")         |

Scenario: Deployment describe webview shows replica status with visual indicators
  Given the Deployment Describe webview is open for a deployment
  Then the webview should display a Replica Status section showing:
    | Status Type | Count | Description                                    |
    | Desired     | 3     | Target number of pods (spec.replicas)          |
    | Current     | 3     | Total number of pods (including old versions)  |
    | Ready       | 2     | Pods passing readiness checks                  |
    | Available   | 2     | Pods available for at least minReadySeconds    |
    | Up-to-date  | 3     | Pods at the current template version           |
  And each status should show a visual progress indicator comparing to desired
  And Ready count should be highlighted if less than Desired
  And Available count should be highlighted if less than Desired

Scenario: Deployment describe webview displays pod template specification
  Given the Deployment Describe webview is open for a deployment
  Then the webview should display a Pod Template section showing:
    | Field              | Description                                    |
    | Container Images   | List of container images with tags             |
    | Container Ports    | Exposed ports for each container               |
    | Environment Vars   | Count of environment variables per container   |
    | Volume Mounts      | Count of volume mounts per container           |
    | Resource Requests  | CPU and memory requests per container          |
    | Resource Limits    | CPU and memory limits per container            |
    | Liveness Probe     | Liveness probe configuration                   |
    | Readiness Probe    | Readiness probe configuration                  |
    | Startup Probe      | Startup probe configuration (if configured)    |
  And container images should be copyable
  And resource values should be displayed in human-readable format (millicores, Mi/Gi)

Scenario: Deployment describe webview shows rollout strategy details
  Given the Deployment Describe webview is open for a deployment
  And the deployment uses RollingUpdate strategy
  Then the webview should display a Rollout Strategy section showing:
    | Field           | Value     | Description                                    |
    | Strategy Type   | RollingUpdate | How pods are replaced during updates        |
    | Max Surge       | 1         | Additional pods allowed during rollout         |
    | Max Unavailable | 0         | Pods that can be unavailable during rollout    |
    | Revision History| 10        | Number of old ReplicaSets to retain            |
    | Progress Deadline | 600s    | Time before rollout is considered failed       |
  And if strategy is Recreate, show "All existing pods are killed before new ones are created"
  And Max Surge and Max Unavailable should explain their impact on rollout speed

Scenario: Deployment describe webview displays deployment conditions
  Given the Deployment Describe webview is open for a deployment
  Then the webview should display a Conditions section showing:
    | Condition   | Status  | Reason              | Message                               | Last Update |
    | Available   | True    | MinimumReplicasAvailable | Deployment has minimum availability | 2h ago      |
    | Progressing | True    | NewReplicaSetAvailable   | ReplicaSet has successfully progressed | 2h ago   |
  And each condition should have a visual status indicator (green for True, yellow/red for False)
  And relative timestamps should update based on current time (e.g., "2h ago", "5m ago")
  And Failed condition should be prominently displayed if present

Scenario: Deployment describe webview lists related replica sets
  Given the Deployment Describe webview is open for a deployment
  And the deployment has current and historical replica sets
  Then the webview should display a ReplicaSets section showing:
    | ReplicaSet Name        | Revision | Desired | Current | Ready | Age  |
    | nginx-deployment-abc123 | 3       | 3       | 3       | 3     | 2h   |
    | nginx-deployment-xyz789 | 2       | 0       | 0       | 0     | 5h   |
    | nginx-deployment-old456 | 1       | 0       | 0       | 0     | 1d   |
  And the current active ReplicaSet should be visually highlighted
  And clicking a ReplicaSet name should navigate to it in the tree view
  And the list should be sorted by revision (newest first)
  And old ReplicaSets with 0 replicas should be shown in a collapsed/secondary view

Scenario: Deployment describe webview shows selector and labels
  Given the Deployment Describe webview is open for a deployment
  Then the webview should display a Selectors & Labels section showing:
    | Type     | Key                          | Value                  |
    | Selector | app                          | nginx                  |
    | Selector | environment                  | production             |
    | Label    | app                          | nginx                  |
    | Label    | version                      | v1.0.0                 |
  And selectors should be visually distinguished from labels
  And each key-value pair should be copyable
  And labels should be displayed in alphabetical order by key

Scenario: Deployment describe webview displays events
  Given the Deployment Describe webview is open for a deployment
  And the deployment has recent events
  Then the webview should display an Events section showing:
    | Type    | Reason              | Age  | From                   | Message                                |
    | Normal  | ScalingReplicaSet   | 2m   | deployment-controller  | Scaled up replica set to 3             |
    | Warning | FailedCreate        | 1m   | deployment-controller  | Error creating pod: insufficient resources |
  And events should be sorted by time (most recent first)
  And Warning events should be visually highlighted
  And events should show relative timestamps
  And only events from the last hour should be shown by default

Scenario: Deployment describe webview shows annotations
  Given the Deployment Describe webview is open for a deployment
  And the deployment has annotations
  Then the webview should display an Annotations section showing:
    | Annotation Key                              | Annotation Value           |
    | deployment.kubernetes.io/revision           | 3                          |
    | kubectl.kubernetes.io/last-applied-configuration | (truncated JSON)      |
  And long annotation values should be truncated with expand/collapse functionality
  And system annotations should be visually distinguished from custom annotations
  And each annotation should be copyable

Scenario: Reusing the shared Describe webview across different deployments
  Given the Describe webview is already open for a deployment
  When the user triggers "Describe" on a different deployment
  Then the existing webview should update its title to the new deployment name
  And the webview content should update to show the new deployment's information
  And no additional Describe panels should be created
  And the previous deployment's data should be fully replaced

Scenario: Reusing the shared Describe webview across different resource types
  Given the Describe webview is already open for a Node
  When the user triggers "Describe" on a Deployment
  Then the existing webview should update its title to "Deployment / <deployment-name>"
  And the webview content should switch from Node view to Deployment view
  And the webview should adapt its layout for deployment-specific information
  And no additional Describe panels should be created

Scenario: Refresh button updates deployment information
  Given the Deployment Describe webview is open for a deployment
  When the user clicks the refresh button in the webview header
  Then the webview should fetch updated deployment information from kubectl
  And all sections should update with current data
  And replica counts should reflect current state
  And conditions and events should show any new changes
  And a loading indicator should display during the refresh

Scenario: Right-click Describe opens deployment webview
  Given a user right-clicks a deployment in the tree view
  When they select "Describe"
  Then the shared Describe webview should open showing deployment information
  And all deployment details should be displayed in the graphical format

Scenario: Right-click Describe (Raw) opens full kubectl describe output
  Given a user right-clicks a deployment in the tree view
  When they select "Describe (Raw)"
  Then a new read-only text editor tab should open
  And the tab title should include the deployment name and ".describe"
  And the editor should display the full raw kubectl describe output for that deployment
  And the editor should be read-only
  And the output should include all kubectl describe information

Scenario: Deployment with unhealthy status shows warning indicators
  Given the Deployment Describe webview is open for a deployment
  And the deployment has Ready replicas less than Desired replicas
  Then the webview should display prominent warning indicators in:
    | Section         | Warning Indicator                              |
    | Overview        | Status badge shows "Degraded" or "Unavailable" |
    | Replica Status  | Ready count highlighted in warning color       |
    | Conditions      | Failed or False conditions highlighted         |
  And the overview section should suggest troubleshooting actions
  And related events with warnings should be prominently displayed
```

