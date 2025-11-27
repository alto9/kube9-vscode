---
feature_id: tree-view-navigation
spec_id: [tree-view-spec, webview-spec]
model_id: [namespace-selection-state]
context_id: [kubernetes-cluster-management]
---

# Tree View Navigation Feature

```gherkin
Feature: Tree View Navigation

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file

Scenario: Viewing kube9 commands in VS Code
  Given a user has installed the kube9 VS Code extension
  When they open the VS Code command palette and search for "kube9"
  Then they should see kube9-related commands available

Scenario: Connecting to a cluster
  Given a user has a valid kubeconfig file
  When they run the "kube9: Connect to Cluster" command
  Then the extension should parse their kubeconfig file
  And display available clusters in the kube9 tree view

Scenario: Expanding a cluster shows resource categories
  Given a user has connected to a cluster
  When they expand a cluster in the tree view
  Then they should see 8 resource-type categories in this order:
    | Nodes             |
    | Namespaces        |
    | Workloads         |
    | Storage           |
    | Networking        |
    | Helm              |
    | Configuration     |
    | Custom Resources  |

Scenario: Viewing nodes in the cluster
  Given a user has expanded a cluster showing resource categories
  When they expand the "Nodes" category
  Then they should see a list of all nodes in the cluster
  And clicking on a node should not perform any action at this point

Scenario: Viewing and selecting namespaces
  Given a user has expanded a cluster showing resource categories
  When they expand the "Namespaces" category
  Then they should see a list of all namespaces in the cluster
  When they click on a specific namespace
  Then a webview panel should open for that namespace
  And the webview title should display the namespace name
  And the webview should show a "Set as Default Namespace" button
  And the webview should display a workloads section with horizontal pill selectors
  And the pill selectors should include: Deployments, StatefulSets, DaemonSets, and CronJobs
  And each workload should show health status and ready/desired counts

Scenario: Viewing workloads in namespace webview
  Given a user has opened a namespace webview
  When the workloads section is displayed
  Then the pill selectors should show: Deployments, StatefulSets, DaemonSets, CronJobs
  And the Deployments pill should be selected by default
  And the table should show columns: Name, Namespace, Health, Ready/Desired
  And the table should list only Deployments
  When the user clicks on the StatefulSets pill
  Then the table should update to list only StatefulSets
  And each workload should display health status derived from pod health checks
  And each workload should show ready replica count vs desired replica count
  And workload items should be non-interactive
  And hovering over workload rows should show visual feedback

Scenario: Expanding Workloads category
  Given a user has expanded a cluster showing resource categories
  When they expand the "Workloads" category
  Then they should see 4 subcategories:
    | Deployments   |
    | StatefulSets  |
    | DaemonSets    |
    | CronJobs      |

Scenario: Viewing Deployments and their pods
  Given a user has expanded the "Workloads" category
  When they expand "Deployments"
  Then they should see a list of all deployments
  And each deployment should be expandable to show its pods
  And clicking on a pod should not perform any action at this point

Scenario: Viewing StatefulSets and their pods
  Given a user has expanded the "Workloads" category
  When they expand "StatefulSets"
  Then they should see a list of all statefulsets
  And each statefulset should be expandable to show its pods
  And clicking on a pod should not perform any action at this point

Scenario: Viewing DaemonSets and their pods
  Given a user has expanded the "Workloads" category
  When they expand "DaemonSets"
  Then they should see a list of all daemonsets
  And each daemonset should be expandable to show its pods
  And clicking on a pod should not perform any action at this point

Scenario: Viewing CronJobs and their pods
  Given a user has expanded the "Workloads" category
  When they expand "CronJobs"
  Then they should see a list of all cronjobs
  And each cronjob should be expandable to show its pods
  And clicking on a pod should not perform any action at this point

Scenario: Expanding Storage category
  Given a user has expanded a cluster showing resource categories
  When they expand the "Storage" category
  Then they should see 3 subcategories:
    | Persistent Volumes        |
    | Persistent Volume Claims  |
    | Storage Classes           |

Scenario: Viewing Persistent Volumes
  Given a user has expanded the "Storage" category
  When they expand "Persistent Volumes"
  Then they should see a list of all persistent volumes
  And clicking on a persistent volume should not perform any action at this point

Scenario: Viewing Persistent Volume Claims
  Given a user has expanded the "Storage" category
  When they expand "Persistent Volume Claims"
  Then they should see a list of all persistent volume claims
  And clicking on a persistent volume claim should not perform any action at this point

Scenario: Viewing Storage Classes
  Given a user has expanded the "Storage" category
  When they expand "Storage Classes"
  Then they should see a list of all storage classes
  And clicking on a storage class should not perform any action at this point

Scenario: Viewing Helm releases
  Given a user has expanded a cluster showing resource categories
  When they expand the "Helm" category
  Then they should see a list of all installed helm releases
  And clicking on a helm release should not perform any action at this point

Scenario: Expanding Configuration category
  Given a user has expanded a cluster showing resource categories
  When they expand the "Configuration" category
  Then they should see 2 subcategories:
    | ConfigMaps |
    | Secrets    |

Scenario: Viewing ConfigMaps
  Given a user has expanded the "Configuration" category
  When they expand "ConfigMaps"
  Then they should see a list of all configmaps
  And clicking on a configmap should not perform any action at this point

Scenario: Viewing Secrets
  Given a user has expanded the "Configuration" category
  When they expand "Secrets"
  Then they should see a list of all secrets
  And clicking on a secret should not perform any action at this point

Scenario: Expanding Networking category
  Given a user has expanded a cluster showing resource categories
  When they expand the "Networking" category
  Then they should see 1 subcategory:
    | Services |

Scenario: Viewing Services
  Given a user has expanded the "Networking" category
  When they expand "Services"
  Then they should see a list of all services
  And each service should display in the format "namespace/name"
  And each service should show its service type (ClusterIP, NodePort, LoadBalancer, or ExternalName) in the description
  And each service should have a network icon

Scenario: Viewing service details in tooltip
  Given a user has expanded "Services" and sees a list of services
  When they hover over a service item
  Then the tooltip should display:
    | Service name        |
    | Namespace           |
    | Service type        |
    | Cluster IP          |
    | External IP (if applicable) |
    | Ports (port:targetPort/protocol) |
    | Selectors           |
    | Endpoints count     |

Scenario: Opening service YAML editor by double-click
  Given a user has expanded "Services" and sees a list of services
  When they double-click on a service named "api-service" in namespace "production"
  Then a YAML editor should open in a new tab
  And the editor should display the full service configuration
  And the editor title should show "api-service (Service) - production"

Scenario: Viewing service YAML from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service
  Then they should see "View YAML" in the context menu
  When they click "View YAML"
  Then a YAML editor should open in a new tab
  And the editor should display the full service configuration

Scenario: Editing service from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service
  Then they should see "Edit" in the context menu
  When they click "Edit"
  Then a YAML editor should open in edit mode
  And the user should be able to modify the service configuration
  And the user should be able to save changes

Scenario: Deleting service from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service named "api-service"
  Then they should see "Delete" in the context menu
  When they click "Delete"
  Then a confirmation dialog should appear
  And the dialog should show the service name and namespace
  When they confirm deletion
  Then the service should be deleted from the cluster
  And the tree view should refresh
  And the service should no longer appear in the list

Scenario: Describing service from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service
  Then they should see "Describe" in the context menu
  When they click "Describe"
  Then service details should be displayed
  And the details should include service type, IP addresses, ports, and selectors

Scenario: Copying service name from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service named "api-service"
  Then they should see "Copy Name" in the context menu
  When they click "Copy Name"
  Then "api-service" should be copied to the clipboard

Scenario: Copying service YAML from context menu
  Given a user has expanded "Services" and sees a list of services
  When they right-click on a service
  Then they should see "Copy YAML" in the context menu
  When they click "Copy YAML"
  Then the service YAML should be copied to the clipboard
  And the YAML should be in valid Kubernetes format

Scenario: Service type displayed in tree item
  Given a user has expanded "Services" and sees a list of services
  When they view a ClusterIP service
  Then the service description should show "ClusterIP"
  When they view a NodePort service
  Then the service description should show "NodePort"
  When they view a LoadBalancer service
  Then the service description should show "LoadBalancer"
  When they view an ExternalName service
  Then the service description should show "ExternalName"

Scenario: Services grouped by namespace
  Given a user has expanded "Services" and sees a list of services
  When services exist in multiple namespaces
  Then services should be displayed with namespace prefix
  And services should be grouped visually by namespace
  And the format should be "namespace/name"

Scenario: Switching between clusters
  Given a user has multiple clusters configured
  When they want to switch between clusters
  Then they should be able to select a different cluster from the tree view
  And the view should update to show the new cluster's resources

Scenario: Handling cluster connection failures
  Given a user is viewing a cluster in the tree view
  When the kubectl connection to the cluster fails
  Then the cluster should show a disconnected status
  And the extension should NOT automatically retry the connection
  And the user must manually trigger a refresh to reconnect

Scenario: Manually refreshing a disconnected cluster
  Given a user has a disconnected cluster
  When they trigger a manual refresh command
  Then the extension should attempt to reconnect using kubectl
  And update the cluster status based on the result
  And display an appropriate error message if kubectl cannot connect

Scenario: Setting active namespace from context menu
  Given a user has expanded a cluster showing namespaces
  When they right-click on a namespace in the tree view
  And select "Set as Active Namespace" from the context menu
  Then the extension should execute kubectl config set-context --current --namespace=<namespace>
  And the namespace should show an active indicator (checkmark icon)
  And the status bar should display the active namespace
  And subsequent kubectl commands should use this namespace by default

Scenario: Visual indication of active namespace in tree
  Given a user has set a namespace as active
  When they view the tree view
  Then the active namespace should display a checkmark icon
  And other namespaces should not show the checkmark
  And the status bar should show "Namespace: <namespace-name>"

Scenario: Clearing active namespace selection
  Given a user has set a namespace as active
  When they right-click on the active namespace
  And select "Clear Active Namespace" from the context menu
  Then the extension should execute kubectl config set-context --current --namespace=''
  And the checkmark indicator should be removed
  And the status bar should show "Namespace: All"
  And subsequent kubectl commands should show all namespaces

Scenario: Setting namespace from "All Namespaces" option
  Given a user has "All Namespaces" set as active
  When they right-click on a specific namespace
  And select "Set as Active Namespace"
  Then the kubectl context should be updated to that namespace
  And queries should be filtered to show only that namespace's resources

Scenario: Viewing resources with active namespace context
  Given a user has set "production" as the active namespace
  When they expand the "Workloads" category
  And expand "Deployments"
  Then they should see only deployments in the "production" namespace
  And deployments from other namespaces should not appear

Scenario: Cluster-scoped resources ignore namespace context
  Given a user has set "production" as the active namespace
  When they expand the "Nodes" category
  Then they should see all nodes in the cluster
  And the namespace context should not filter nodes

Scenario: Namespace context persists across sessions
  Given a user has set "staging" as the active namespace
  When they close and reopen VS Code
  Then the extension should read the kubectl context
  And "staging" should still be marked as the active namespace
  And the status bar should show "Namespace: staging"

Scenario: Detecting external namespace context changes
  Given a user has set "production" as the active namespace in VS Code
  When they change the namespace context externally using kubectl CLI
  Then the extension should detect the change on next refresh
  And update the tree view to show the new active namespace
  And update the status bar with the new namespace

Scenario: Handling invalid namespace in context
  Given a user has set a namespace that no longer exists
  When they try to query resources
  Then kubectl should return a "namespace not found" error
  And the extension should display the error to the user
  And suggest clearing the namespace selection

Scenario: Opening namespace webview shows namespace name as title
  Given a user has expanded a cluster showing namespaces
  When they click on the "production" namespace in the tree view
  Then a webview panel should open
  And the webview should display "production" as the title (h1)
  And the webview should show namespace resources

Scenario: Webview button enabled for non-active namespace
  Given a user has "staging" set as the active namespace in kubectl context
  When they click on the "production" namespace in the tree view
  Then the webview should open with "production" as the title
  And the "Set as Default Namespace" button should be enabled
  And the button should not show a checkmark icon

Scenario: Webview button disabled for active namespace
  Given a user has "production" set as the active namespace in kubectl context
  When they click on the "production" namespace in the tree view
  Then the webview should open with "production" as the title
  And the "Default Namespace" button should be disabled
  And the button should show a checkmark icon indicating it is selected

Scenario: Setting namespace as default from webview button
  Given a user has opened a webview for the "staging" namespace
  And the "Set as Default Namespace" button is enabled
  When they click the "Set as Default Namespace" button
  Then the extension should execute kubectl config set-context --current --namespace=staging
  And the button should change to disabled state with checkmark icon
  And the button text should change to "Default Namespace"
  And the tree view should update to show checkmark on "staging" namespace
  And the status bar should display "Namespace: staging"

Scenario: Button state updates when context changes externally
  Given a user has a webview open for "production" namespace
  And the button is enabled because "staging" is the active namespace
  When the namespace context is changed externally to "production" using kubectl CLI
  Then the extension should detect the change
  And the webview button should update to disabled/selected state
  And the button should show a checkmark icon
  And a notification should display "Namespace context changed externally to: production"

Scenario: Button state updates when different namespace becomes active
  Given a user has a webview open for "production" namespace
  And the button is disabled because "production" is the active namespace
  When the namespace context is changed externally to "staging" using kubectl CLI
  Then the extension should detect the change
  And the webview button should update to enabled state
  And the checkmark icon should be hidden
  And the button text should change to "Set as Default Namespace"

Scenario: Multiple webviews show correct button states
  Given a user has "production" set as the active namespace
  When they open a webview for "production"
  And they open a webview for "staging"
  Then the "production" webview button should be disabled with checkmark
  And the "staging" webview button should be enabled without checkmark
  When they click "Set as Default Namespace" in the "staging" webview
  Then both webviews should update their button states accordingly
  And "staging" button becomes disabled with checkmark
  And "production" button becomes enabled without checkmark

Scenario: Delete resource from context menu
  Given a user has expanded "Workloads" and then "Deployments"
  When they right-click on a deployment named "nginx-deployment"
  Then they should see a context menu with "Delete Resource" option
  When they click "Delete Resource"
  Then a confirmation dialog should appear

Scenario: Confirmation dialog shows resource details
  Given a user has triggered delete on a deployment "nginx-deployment" in namespace "production"
  When the confirmation dialog appears
  Then it should display the resource type "Deployment"
  And it should display the resource name "nginx-deployment"
  And it should display the namespace "production"
  And it should show a "Delete" confirmation button
  And it should show a "Cancel" button

Scenario: Confirmation dialog shows warning for managed pods
  Given a user has triggered delete on a deployment "nginx-deployment"
  When the confirmation dialog appears
  Then it should display a warning message
  And the warning should state "Deleting this Deployment will also delete its managed Pods"
  And the warning should state "Pods may be recreated if controlled by a ReplicaSet"

Scenario: Force delete checkbox for stuck resources
  Given a user has triggered delete on any resource
  When the confirmation dialog appears
  Then it should show a checkbox labeled "Force delete (removes finalizers)"
  And the checkbox should be unchecked by default
  And hovering over the checkbox should show a tooltip
  And the tooltip should explain "Use this for resources stuck in terminating state"

Scenario: Successfully deleting a resource
  Given a user has confirmed deletion of deployment "nginx-deployment"
  And the "Force delete" checkbox is unchecked
  When the deletion is initiated
  Then a progress indicator should appear with message "Deleting nginx-deployment..."
  And kubectl delete deployment nginx-deployment -n production should be executed
  And when kubectl completes successfully
  Then a success notification should display "Successfully deleted Deployment nginx-deployment"
  And the tree view should automatically refresh
  And the deleted deployment should no longer appear in the tree

Scenario: Force deleting a stuck resource
  Given a user has confirmed deletion of a pod "stuck-pod"
  And the "Force delete" checkbox is checked
  When the deletion is initiated
  Then kubectl delete pod stuck-pod -n production --grace-period=0 --force should be executed
  And a progress indicator should show "Force deleting stuck-pod..."
  And when kubectl completes successfully
  Then a success notification should display "Successfully force deleted Pod stuck-pod"
  And the tree view should automatically refresh

Scenario: Canceling resource deletion
  Given a user has triggered delete on a service "api-service"
  When the confirmation dialog appears
  And they click the "Cancel" button
  Then the dialog should close
  And no kubectl delete command should be executed
  And the resource should remain in the tree view unchanged

Scenario: Handling RBAC permission denied
  Given a user has confirmed deletion of deployment "protected-deployment"
  When kubectl delete is executed
  And kubectl returns an error "Error from server (Forbidden): User cannot delete deployments"
  Then the progress indicator should disappear
  And an error notification should display "Permission denied: You don't have permission to delete this Deployment"
  And the tree view should not refresh
  And the deployment should remain in the tree view

Scenario: Handling resource not found
  Given a user has confirmed deletion of pod "already-deleted-pod"
  When kubectl delete is executed
  And kubectl returns an error "Error from server (NotFound): pods 'already-deleted-pod' not found"
  Then the progress indicator should disappear
  And an info notification should display "Resource not found: Pod already-deleted-pod may have been deleted already"
  And the tree view should automatically refresh to sync current state

Scenario: Handling finalizer blocking deletion
  Given a user has confirmed deletion without force option
  When kubectl delete is executed
  And the resource has finalizers preventing deletion
  And kubectl command hangs or times out
  Then the progress indicator should show a timeout message
  And an error notification should display "Deletion blocked: Resource has finalizers. Try force delete option"
  And the tree view should refresh to show resource in "Terminating" state

Scenario: Handling kubectl command failure
  Given a user has confirmed deletion of any resource
  When kubectl delete is executed
  And kubectl fails with a network or cluster connectivity error
  Then the progress indicator should disappear
  And an error notification should display "Deletion failed: Unable to connect to cluster"
  And the tree view should not refresh
  And the user should be able to retry the operation

Scenario: Deleting different resource types
  Given a user has the tree view expanded
  When they delete a "Pod" resource
  Then the warning should mention "This Pod will be permanently deleted"
  When they delete a "Service" resource
  Then the warning should mention "This will remove the network endpoint for this Service"
  When they delete a "ConfigMap" resource
  Then the warning should mention "Pods using this ConfigMap may fail to start"
  When they delete a "Secret" resource
  Then the warning should mention "Applications using this Secret will lose access to credentials"

Scenario: Delete option available for all resource types
  Given a user has expanded any resource category
  When they right-click on any individual resource (Pod, Deployment, Service, ConfigMap, Secret, PVC, etc)
  Then they should see "Delete Resource" in the context menu
  And the delete option should be available regardless of resource type

Scenario: Tree view refresh after deletion shows updated state
  Given a user has successfully deleted deployment "test-deployment"
  When the tree view automatically refreshes
  Then the "Deployments" category should reload
  And "test-deployment" should not appear in the list
  And other deployments should remain visible and unchanged
  And the tree expansion state should be preserved
```
