---
feature_id: workload-scaling
spec_id: [workload-scaling-spec, tree-view-spec]
context_id: [kubernetes-cluster-management]
---

# Workload Scaling Feature

```gherkin
Feature: Quick Scale Workloads

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains workload resources

Scenario: Scale Deployment from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "Deployments" subcategory
  And a Deployment named "nginx-deployment" exists with 2 replicas
  When they right-click on "nginx-deployment"
  Then they should see a "Scale" option in the context menu
  When they click on the "Scale" option
  Then an input dialog should appear
  And the dialog title should be "Scale nginx-deployment"
  And the dialog should show placeholder text "Current: 2 replicas"
  And the input field should accept numeric input only
  When they enter "5" in the input field
  And they press Enter or click OK
  Then a progress notification should appear saying "Scaling nginx-deployment..."
  And the extension should call the Kubernetes API to scale the Deployment
  And the extension should use PATCH on the scale subresource
  And the tree view should refresh automatically
  And a success notification should appear saying "Scaled nginx-deployment to 5 replicas"
  And the Deployment should now show 5 desired replicas

Scenario: Scale StatefulSet from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "StatefulSets" subcategory
  And a StatefulSet named "redis-statefulset" exists with 3 replicas
  When they right-click on "redis-statefulset"
  And they click on the "Scale" option
  Then an input dialog should appear showing "Current: 3 replicas" as placeholder
  When they enter "1" in the input field
  And they confirm the action
  Then the StatefulSet should be scaled to 1 replica
  And a success notification should appear saying "Scaled redis-statefulset to 1 replica"

Scenario: Scale ReplicaSet from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And a ReplicaSet named "app-replicaset" exists with 4 replicas
  When they right-click on "app-replicaset" and select "Scale"
  Then an input dialog should appear showing "Current: 4 replicas" as placeholder
  When they enter "8" in the input field
  And they confirm the action
  Then the ReplicaSet should be scaled to 8 replicas
  And a success notification should appear saying "Scaled app-replicaset to 8 replicas"

Scenario: Scale to zero replicas
  Given a Deployment named "nginx-deployment" exists with 3 replicas
  When a user right-clicks on the Deployment and selects "Scale"
  And they enter "0" in the input field
  And they confirm the action
  Then the Deployment should be scaled to 0 replicas
  And a success notification should appear saying "Scaled nginx-deployment to 0 replicas"
  And the Deployment should show 0 desired replicas in the tree view

Scenario: Input validation prevents negative values
  Given a user has opened the scale dialog for a Deployment
  When they enter "-5" in the input field
  Then the input should be rejected
  And an error message should appear saying "Replica count must be a positive number"
  And the scaling operation should not be performed

Scenario: Input validation prevents non-numeric values
  Given a user has opened the scale dialog for a Deployment
  When they enter "abc" in the input field
  Then the input should be rejected
  And an error message should appear saying "Replica count must be a number"
  And the scaling operation should not be performed

Scenario: Input validation prevents excessively large values
  Given a user has opened the scale dialog for a Deployment
  When they enter "10000" in the input field
  Then the input should be rejected
  And an error message should appear saying "Replica count must not exceed 1000"
  And the scaling operation should not be performed

Scenario: Handle scaling errors gracefully
  Given a user has opened the scale dialog for a Deployment
  When they enter "5" and confirm
  But the Kubernetes API returns an error due to insufficient cluster resources
  Then a progress notification should appear saying "Scaling..."
  And an error notification should appear with the error message
  And the error notification should include details from the Kubernetes API
  And the tree view should refresh to show the actual current state

Scenario: Cancel scaling operation
  Given a user has opened the scale dialog for a Deployment
  When they click Cancel or press Escape
  Then the dialog should close
  And no scaling operation should be performed
  And no notifications should appear

Scenario: Tree view refresh after successful scaling
  Given a user has successfully scaled a Deployment to 5 replicas
  When the success notification appears
  Then the tree view should refresh automatically
  And the Deployment node should show the updated replica count
  And if a namespace webview is open showing this Deployment
  Then the webview should also refresh to show the updated replica count

Scenario: Show current and desired replica counts in tree view
  Given a Deployment has been scaled to 5 replicas
  And only 3 replicas are currently ready
  When the tree view displays the Deployment
  Then the Deployment should show the desired count (5)
  And the tree view tooltip should show "Ready: 3/5"
  And the health indicator should show degraded status

Scenario: Scaling context menu only appears for scalable workloads
  Given a user has expanded the "Workloads" category
  When they right-click on a Deployment
  Then they should see the "Scale" option
  When they right-click on a StatefulSet
  Then they should see the "Scale" option
  When they right-click on a DaemonSet
  Then they should NOT see the "Scale" option
  When they right-click on a CronJob
  Then they should NOT see the "Scale" option
  When they right-click on a Pod
  Then they should NOT see the "Scale" option
```

