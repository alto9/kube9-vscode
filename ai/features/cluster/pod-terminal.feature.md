---
feature_id: pod-terminal
spec_id:
  - pod-terminal-spec
context_id:
  - kubernetes-cluster-management
---
```gherkin
Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains running pods
```

```gherkin
Scenario: Open terminal in single-container pod from tree view
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "Pods" subcategory
  And a Pod named "nginx-pod" exists with 1 container in Running state
  When they right-click on "nginx-pod"
  Then they should see an "Open Terminal" option in the context menu
  When they click on the "Open Terminal" option
  Then a new VS Code integrated terminal should open immediately
  And the terminal name should be "Kube9: default/nginx-pod"
  And the terminal should execute "kubectl exec -it nginx-pod -n default --context current-context -- /bin/sh"
  And the terminal should be focused automatically
  And the user should see an interactive shell prompt from the pod
```

```gherkin
Scenario: Open terminal in multi-container pod with container selection
  Given a Pod named "app-pod" exists with 3 containers: "web", "sidecar", "init"
  And all containers are in Running state
  When a user right-clicks on "app-pod" and selects "Open Terminal"
  Then a quick pick dialog should appear
  And the dialog title should be "Select Container"
  And the dialog should list all containers:
  When they select "web" from the list
  Then a new terminal should open
  And the terminal name should be "Kube9: default/app-pod (web)"
  And the terminal should execute "kubectl exec -it app-pod -n default --context current-context -c web -- /bin/sh"
  And the terminal should connect to the "web" container
```

```gherkin
Scenario: Cancel container selection for multi-container pod
  Given a Pod named "app-pod" exists with multiple containers
  When a user right-clicks on "app-pod" and selects "Open Terminal"
  And the container selection dialog appears
  When they press Escape or click outside the dialog
  Then the dialog should close
  And no terminal should be opened
  And no kubectl command should be executed
```

```gherkin
Scenario: Open terminal with custom shell (bash)
  Given a Pod named "ubuntu-pod" exists with bash installed
  When a user opens a terminal in the pod
  Then the terminal should attempt to use "/bin/bash" if available
  And if bash is not available, fall back to "/bin/sh"
  And the terminal should display the appropriate shell prompt
```

```gherkin
Scenario: Terminal naming for different namespaces
  Given a Pod named "api-pod" exists in namespace "production"
  When a user opens a terminal in this pod
  Then the terminal name should be "Kube9: production/api-pod"
  Given another Pod named "api-pod" exists in namespace "staging"
  When a user opens a terminal in this pod
  Then the terminal name should be "Kube9: staging/api-pod"
  And both terminals should remain open and distinguishable
```

```gherkin
Scenario: Multiple terminal sessions to same pod
  Given a Pod named "debug-pod" exists
  When a user opens a terminal in the pod
  And the terminal is created successfully
  When they open another terminal in the same pod
  Then a second terminal should open
  And both terminals should be independent sessions
  And both should show in the VS Code terminal list
  And the terminal names should be "Kube9: default/debug-pod" for both
```

```gherkin
Scenario: Handle pod not in running state
  Given a Pod named "pending-pod" exists with status "Pending"
  When a user right-clicks on "pending-pod" and selects "Open Terminal"
  Then an error notification should appear
  And the message should say "Cannot open terminal: Pod 'pending-pod' is not in Running state (current: Pending)"
  And no terminal should be opened
```

```gherkin
Scenario: Handle pod not found error
  Given a user attempts to open a terminal in a pod
  When the pod has been deleted before the command executes
  Then an error notification should appear
  And the message should say "Pod 'pod-name' not found in namespace 'namespace-name'"
  And the tree view should refresh to show current state
```

```gherkin
Scenario: Handle RBAC permission denied
  Given a user has read access to pods but not exec permissions
  When they attempt to open a terminal in a pod
  Then the kubectl exec command should fail with permission denied
  And an error notification should appear
  And the message should say "Permission denied: Unable to exec into pod. Check your RBAC permissions for pod/exec resource."
  And the terminal should close or show the error
```

```gherkin
Scenario: Handle kubectl not found
  Given kubectl is not installed or not in PATH
  When a user attempts to open a terminal in a pod
  Then an error notification should appear
  And the message should say "kubectl not found. Please install kubectl to use this feature."
  And no terminal should be opened
```

```gherkin
Scenario: Handle connection errors gracefully
  Given a Pod named "network-pod" exists
  When a user opens a terminal in the pod
  But the cluster becomes unreachable during connection
  Then the terminal should show the connection error
  And the error message should include details about the connectivity issue
  And the terminal should remain open to show the error
```

```gherkin
Scenario: Terminal respects current kubectl context
  Given the current kubectl context is "prod-cluster"
  And a Pod named "app-pod" exists in "prod-cluster"
  When a user opens a terminal in the pod
  Then the kubectl exec command should use "--context prod-cluster"
  And the terminal should connect to the pod in the correct cluster
  Given the user switches context to "dev-cluster"
  And they open a terminal in a pod from "dev-cluster"
  Then the new terminal should use "--context dev-cluster"
```

```gherkin
Scenario: Terminal handles special characters in pod names
  Given a Pod named "my-app-pod-abc123-xyz" exists
  When a user opens a terminal in this pod
  Then the terminal should properly escape or handle the pod name
  And the kubectl command should execute successfully
  And the terminal name should display "Kube9: default/my-app-pod-abc123-xyz"
```

```gherkin
Scenario: Open Terminal context menu only appears for Pods
  Given a user has expanded the "Workloads" category
  When they right-click on a Pod
  Then they should see the "Open Terminal" option
  When they right-click on a Deployment
  Then they should NOT see the "Open Terminal" option
  When they right-click on a StatefulSet
  Then they should NOT see the "Open Terminal" option
  When they right-click on a Service
  Then they should NOT see the "Open Terminal" option
  When they right-click on a Namespace
  Then they should NOT see the "Open Terminal" option
```

```gherkin
Scenario: Terminal integration with VS Code terminal features
  Given a user has opened a terminal in a pod
  When they use VS Code terminal features like split terminal
  Then the terminal should work with split panes
  When they use the terminal history navigation
  Then command history should work as expected
  When they copy text from the terminal
  Then the clipboard should contain the selected text
```

```gherkin
Scenario: Query pod to get container list before showing selection
  Given a Pod named "multi-pod" exists with 3 containers
  When a user right-clicks on "multi-pod" and selects "Open Terminal"
  Then the extension should query the pod spec using kubectl
  And it should extract the container names from the spec
  And it should display them in the container selection quick pick
  And if the query fails, show an error notification
```

```gherkin
Scenario: Handle init containers separately from regular containers
  Given a Pod has 1 init container and 2 regular containers
  When a user opens a terminal in the pod
  Then the container selection should show regular containers only
  And init containers should not be included in the selection
  And if only init containers exist and are running, show them
```

```gherkin
Scenario: Terminal command uses correct flags
  Given a Pod named "test-pod" exists in namespace "dev"
  And the current context is "my-cluster"
  When a user opens a terminal in a single-container pod
  Then the kubectl command should include the "-it" flags for interactive TTY
  And the command should include "-n dev" for the namespace
  And the command should include "--context my-cluster" for the context
  And the command should include "-- /bin/sh" as the shell command
  And for multi-container pods, it should include "-c <container-name>"
```

```gherkin
Scenario: Terminal closes when pod is deleted
  Given a user has an open terminal connected to a pod
  When the pod is deleted from the cluster
  Then the terminal session should terminate
  And the terminal should show a connection closed message
  And the terminal should remain in the terminal list for review
```

```gherkin
Scenario: Terminal feedback during connection
  Given a user initiates opening a terminal in a pod
  When the kubectl exec command is being executed
  Then the terminal should show connection feedback
  And the terminal should display kubectl command being executed
  And once connected, the shell prompt should appear
```

```gherkin
Scenario: Works in Free and Pro tiers equally
  Given a cluster without the kube9-operator installed (Free Tier)
  When a user opens a terminal in a pod
  Then the terminal should work identically to Pro Tier
  And no operator integration is required
  And the feature uses only kubectl exec
  Given a cluster with the kube9-operator installed (Pro Tier)
  When a user opens a terminal in a pod
  Then the feature should work the same as Free Tier
  And no special operator features are used
```

```gherkin
Scenario: Terminal provides clear user experience
  Given a user is debugging a pod issue
  When they right-click on the pod
  And select "Open Terminal"
  Then they should get an interactive shell within seconds
  And they can execute commands directly in the pod
  And they can view real-time output
  And they can exit the shell by typing "exit"
  And the terminal remains available for review after exit
```
