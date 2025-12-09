---
feature_id: workload-restart
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
context_id: [kubernetes-cluster-management]
---

# Workload Restart Feature

```gherkin
Feature: Restart Workloads via Rollout Restart

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains workload resources

Scenario: Restart Deployment from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "Deployments" subcategory
  And a Deployment named "nginx-deployment" exists with 3 running pods
  When they right-click on "nginx-deployment"
  Then they should see a "Restart" option in the context menu
  When they click on the "Restart" option
  Then a confirmation dialog should appear
  And the dialog title should be "Restart nginx-deployment"
  And the dialog should explain "This will trigger a rolling restart of all pods"
  And the dialog should show a checkbox labeled "Wait for rollout to complete"
  And the checkbox should be unchecked by default
  When they click "Restart" to confirm
  Then a progress notification should appear saying "Restarting nginx-deployment..."
  And the extension should add the restart annotation to the pod template
  And the annotation should be "kubectl.kubernetes.io/restartedAt" with current timestamp
  And the extension should use PATCH on the Deployment spec.template.metadata.annotations
  And if "Wait for rollout" was checked, the extension should watch rollout status
  And the tree view should refresh automatically
  And a success notification should appear saying "Restarted nginx-deployment successfully"
  And new pods should appear in the tree view with new creation timestamps

Scenario: Restart StatefulSet from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "StatefulSets" subcategory
  And a StatefulSet named "redis-statefulset" exists with 3 running pods
  When they right-click on "redis-statefulset"
  And they click on the "Restart" option
  Then a confirmation dialog should appear
  And the dialog should explain "This will trigger a rolling restart of all pods"
  When they confirm the action
  Then the StatefulSet pods should be restarted one by one
  And a success notification should appear saying "Restarted redis-statefulset successfully"

Scenario: Restart DaemonSet from tree view context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "DaemonSets" subcategory
  And a DaemonSet named "logging-agent" exists running on all nodes
  When they right-click on "logging-agent"
  And they click on the "Restart" option
  Then a confirmation dialog should appear
  When they confirm the action
  Then all DaemonSet pods should be restarted
  And a success notification should appear saying "Restarted logging-agent successfully"

Scenario: Wait for rollout completion during restart
  Given a user has initiated a restart for a Deployment
  And they checked the "Wait for rollout to complete" checkbox
  When the restart is triggered
  Then the progress notification should show "Restarting nginx-deployment..."
  And the extension should watch the rollout status
  And the notification should update with rollout progress
  And once all new pods are running and old pods are terminated
  Then the success notification should appear
  And the progress notification should disappear

Scenario: Restart without waiting for rollout completion
  Given a user has initiated a restart for a Deployment
  And they left the "Wait for rollout to complete" checkbox unchecked
  When the restart is triggered
  Then the progress notification should show briefly "Restarting nginx-deployment..."
  And the extension should NOT watch rollout status
  And the success notification should appear immediately after the annotation is applied
  And the tree view should refresh to show the restart in progress

Scenario: Cancel restart operation
  Given a user has opened the restart confirmation dialog
  When they click Cancel or press Escape
  Then the dialog should close
  And no restart operation should be performed
  And no notifications should appear

Scenario: Restart shows progress with pod updates
  Given a user has restarted a Deployment with 5 replicas
  And they chose to wait for rollout completion
  When the rollout is in progress
  Then the progress notification should show rollout status
  And the tree view should update as new pods are created
  And the tree view should show old pods terminating
  And the user should see the pod list gradually update
  And once complete, all pods should have recent creation timestamps

Scenario: Handle restart errors gracefully
  Given a user has confirmed a restart operation
  When the Kubernetes API returns an error
  Then a progress notification should appear briefly
  And an error notification should appear with the error message
  And the error notification should include details from the Kubernetes API
  And the tree view should refresh to show the actual current state
  And no changes should be made to the workload

Scenario: Confirmation dialog explains the operation
  Given a user has right-clicked on a Deployment named "api-server"
  When they select the "Restart" option
  Then a confirmation dialog should appear
  And the dialog title should be "Restart api-server"
  And the dialog should show descriptive text explaining:
    """
    This will trigger a rolling restart of all pods.
    
    The restart annotation will be added to the pod template,
    causing the controller to recreate all pods gradually.
    """
  And the dialog should show a checkbox "Wait for rollout to complete"
  And the dialog should show "Restart" and "Cancel" buttons

Scenario: Tree view refresh after successful restart
  Given a user has successfully restarted a Deployment
  When the success notification appears
  Then the tree view should refresh automatically
  And the Deployment node should reflect the restart in progress
  And if a namespace webview is open showing this Deployment
  Then the webview should also refresh to show the restarting status
  And pod ages should reset to show new creation times

Scenario: Show restart status in tree view
  Given a Deployment has been restarted
  And the rollout is in progress
  When the tree view displays the Deployment
  Then the Deployment should show a status indicator
  And the tree view tooltip should show "Rollout in progress"
  And pod status should show old pods terminating and new pods starting

Scenario: Restart context menu only appears for restartable workloads
  Given a user has expanded the "Workloads" category
  When they right-click on a Deployment
  Then they should see the "Restart" option
  When they right-click on a StatefulSet
  Then they should see the "Restart" option
  When they right-click on a DaemonSet
  Then they should see the "Restart" option
  When they right-click on a ReplicaSet
  Then they should NOT see the "Restart" option
  When they right-click on a CronJob
  Then they should NOT see the "Restart" option
  When they right-click on a Pod
  Then they should NOT see the "Restart" option

Scenario: Restart annotation triggers controller reconciliation
  Given a Deployment exists with running pods
  When a restart is triggered
  Then the extension should PATCH the Deployment at spec.template.metadata.annotations
  And it should add or update "kubectl.kubernetes.io/restartedAt" with ISO 8601 timestamp
  And the Kubernetes Deployment controller should detect the pod template change
  And the controller should begin a rolling update
  And old pods should be terminated gradually
  And new pods should be created with the same spec but new creation timestamps

Scenario: Multiple restarts update the same annotation
  Given a Deployment has been restarted previously
  And it has the annotation "kubectl.kubernetes.io/restartedAt" = "2024-01-01T10:00:00Z"
  When a user restarts it again
  Then the extension should update the existing annotation
  And the new value should be the current timestamp
  And the controller should trigger a new rolling restart

Scenario: Restart preserves all other workload configuration
  Given a Deployment has specific replica count, environment variables, and volume mounts
  When a user restarts the Deployment
  Then only the restart annotation should be added/updated
  And the replica count should remain unchanged
  And all environment variables should remain unchanged
  And all volume mounts should remain unchanged
  And all other configuration should remain unchanged
```

