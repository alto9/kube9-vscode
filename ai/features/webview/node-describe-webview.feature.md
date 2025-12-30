---
feature_id: node-describe-webview
name: Node Describe Webview
description: Detailed webview showing comprehensive node information including status, capacity, resources, conditions, and running pods
spec_id:
  - node-describe-webview-spec
---

# Node Describe Webview

```gherkin
Feature: Node Describe Webview displays comprehensive node information

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster
  And the cluster has one or more nodes

Scenario: Left-click on Node opens describe webview with overview
  Given a user views the Nodes category in the tree
  And the Nodes category lists one or more nodes (e.g., "control-plane", "worker-1")
  When the user left-clicks on a node (e.g., "control-plane")
  Then a shared Describe webview should open or reveal
  And the webview title should show "Node / control-plane"
  And the webview should display a Node Overview section with:
    | Field            | Description                                    |
    | Name             | Node name                                      |
    | Status           | Ready, NotReady, Unknown (with visual indicator) |
    | Roles            | Comma-separated list of roles (e.g., control-plane, master, worker) |
    | Creation Time    | Timestamp when node was added to cluster       |
    | Kubernetes Version | kubelet version running on the node          |
    | Container Runtime | Runtime and version (e.g., containerd://1.6.0) |
    | OS Image         | Operating system image (e.g., Ubuntu 22.04)    |
    | Kernel Version   | OS kernel version                              |
    | Architecture     | CPU architecture (e.g., amd64, arm64)          |

Scenario: Node describe webview shows capacity and allocatable resources
  Given the Node Describe webview is open for a node
  Then the webview should display a Resources section showing:
    | Resource Type | Capacity           | Allocatable        | Used               | Available          |
    | CPU           | Total CPU cores    | Schedulable CPU    | Currently used     | Remaining CPU      |
    | Memory        | Total memory (GB)  | Schedulable memory | Currently used     | Remaining memory   |
    | Pods          | Max pod capacity   | Schedulable pods   | Current pod count  | Available pod slots|
    | Ephemeral Storage | Total disk space | Schedulable storage | Currently used   | Remaining storage  |
  And each resource should show a visual progress bar indicating usage percentage
  And CPU and memory should display in human-readable format (cores, GiB)

Scenario: Node describe webview displays node conditions
  Given the Node Describe webview is open for a node
  Then the webview should display a Conditions section showing:
    | Condition         | Status  | Reason          | Message                               | Last Transition |
    | Ready             | True    | KubeletReady    | kubelet is posting ready status       | 2h ago          |
    | MemoryPressure    | False   | KubeletHasSufficientMemory | kubelet has sufficient memory | 2h ago |
    | DiskPressure      | False   | KubeletHasNoDiskPressure   | kubelet has no disk pressure  | 2h ago |
    | PIDPressure       | False   | KubeletHasSufficientPID    | kubelet has sufficient PID    | 2h ago |
    | NetworkUnavailable| False   | RouteCreated    | Network routes created                | 2h ago          |
  And each condition should have a visual status indicator (green checkmark for False/negative conditions, red warning for True/negative conditions)
  And "Ready" condition should use inverse logic (green for True, red for False)
  And relative timestamps should update based on current time (e.g., "2h ago", "5m ago")

Scenario: Node describe webview lists running pods
  Given the Node Describe webview is open for a node
  And the node has pods running on it
  Then the webview should display a Pods section showing:
    | Pod Name          | Namespace     | Status    | CPU Request | Memory Request | Restarts |
    | nginx-deployment-abc123 | production | Running | 100m | 128Mi | 0 |
    | api-server-xyz789 | default | Running | 500m | 512Mi | 2 |
  And the table should be sortable by each column
  And clicking a pod name should navigate to the pod in the tree view
  And the section should show total resource requests used by all pods on this node
  And if no pods are running, display message: "No pods currently running on this node"

Scenario: Node describe webview shows node addresses
  Given the Node Describe webview is open for a node
  Then the webview should display an Addresses section showing:
    | Address Type  | Address                     |
    | Hostname      | node-hostname.example.com   |
    | InternalIP    | 10.0.0.5                    |
    | ExternalIP    | 203.0.113.10 (if available) |
  And each address type should be labeled clearly
  And addresses should be copyable with a click-to-copy icon

Scenario: Node describe webview displays node labels
  Given the Node Describe webview is open for a node
  And the node has labels applied
  Then the webview should display a Labels section showing:
    | Label Key                        | Label Value       |
    | kubernetes.io/hostname           | worker-1          |
    | node.kubernetes.io/instance-type | t3.medium         |
    | topology.kubernetes.io/zone      | us-east-1a        |
  And labels should be displayed in alphabetical order by key
  And each label should be copyable
  And if there are no custom labels, show only system labels

Scenario: Node describe webview shows node taints
  Given the Node Describe webview is open for a node
  And the node has taints applied
  Then the webview should display a Taints section showing:
    | Taint Key              | Taint Value | Effect          |
    | node-role.kubernetes.io/control-plane | (empty) | NoSchedule |
    | special-hardware       | gpu         | NoExecute       |
  And if the node has no taints, display message: "No taints applied to this node"
  And each effect type should have a visual indicator explaining its impact

Scenario: Node describe webview shows allocated resources breakdown
  Given the Node Describe webview is open for a node
  And the node has pods consuming resources
  Then the webview should display a Resource Allocation section showing:
    | Metric          | Requests      | Limits        | % of Allocatable (Requests) | % of Allocatable (Limits) |
    | CPU             | 2 cores       | 4 cores       | 50%                          | 100%                      |
    | Memory          | 4 GiB         | 8 GiB         | 40%                          | 80%                       |
  And visual progress bars should show the percentage of allocatable resources consumed
  And requests and limits should be differentiated visually

Scenario: Reusing the shared Describe webview across different nodes
  Given the Describe webview is already open for a node
  When the user triggers "Describe" on a different node
  Then the existing webview should update its title to the new node name
  And the webview content should update to show the new node's information
  And no additional Describe panels should be created
  And the previous node's data should be fully replaced

Scenario: Refresh button updates node information
  Given the Node Describe webview is open for a node
  When the user clicks the refresh button in the webview header
  Then the webview should fetch updated node information from kubectl
  And all sections should update with current data
  And resource usage percentages should reflect current state
  And pod list should show any new or terminated pods
  And a loading indicator should display during the refresh

Scenario: Right-click Describe (Raw) opens full kubectl describe output
  Given a user right-clicks a node in the tree view
  When they select "Describe (Raw)"
  Then a new read-only text editor tab should open
  And the tab title should include the node name and ".describe"
  And the editor should display the full raw kubectl describe output for that node
  And the editor should be read-only
  And the output should include all kubectl describe information
```

