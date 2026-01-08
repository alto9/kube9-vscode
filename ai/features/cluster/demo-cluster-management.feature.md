---
feature_id: demo-cluster-management
name: Demo Cluster Management
description: Manage isolated Minikube demo clusters for testing and marketing
spec_id:
  - demo-cluster-scripts
  - demo-cluster-scenarios
  - demo-cluster-vscode-integration
---

```gherkin
Background:
  Given Minikube is installed on the developer's machine
  And the developer is in the kube9-vscode project directory
  And the scripts/demo-cluster/ directory exists
```

```gherkin
Scenario: Start demo cluster for the first time
  Given no demo cluster is currently running
  When the developer runs "./scripts/demo-cluster/start.sh"
  Then Minikube should start a new cluster with profile "kube9-demo"
  And the cluster should be configured with adequate resources
  And an isolated kubeconfig file should be created at ./demo-cluster/kubeconfig
  And the script should output "Demo cluster started successfully"
  And the script should display the kubeconfig path
  And the script should display available scenarios
```

```gherkin
Scenario: Start demo cluster when already running
  Given a demo cluster is already running with profile "kube9-demo"
  When the developer runs "./scripts/demo-cluster/start.sh"
  Then the script should detect the existing cluster
  And the script should output "Demo cluster is already running"
  And the script should display the kubeconfig path
  And the script should not attempt to start a new cluster
```

```gherkin
Scenario: Stop demo cluster
  Given a demo cluster is running with profile "kube9-demo"
  When the developer runs "./scripts/demo-cluster/stop.sh"
  Then Minikube should stop the cluster
  And the cluster should be paused but not deleted
  And the script should output "Demo cluster stopped"
  And the kubeconfig file should remain in place for restart
```

```gherkin
Scenario: Stop demo cluster when not running
  Given no demo cluster is currently running
  When the developer runs "./scripts/demo-cluster/stop.sh"
  Then the script should output "Demo cluster is not running"
  And the script should exit successfully without error
```

```gherkin
Scenario: Reset demo cluster to clean state
  Given a demo cluster exists with profile "kube9-demo"
  And the cluster contains various workloads and resources
  When the developer runs "./scripts/demo-cluster/reset.sh"
  Then the script should prompt for confirmation
  And the developer confirms the reset
  Then Minikube should delete the "kube9-demo" cluster
  And Minikube should create a fresh "kube9-demo" cluster
  And an isolated kubeconfig file should be regenerated
  And the script should output "Demo cluster reset complete"
  And the cluster should be empty with no workloads
```

```gherkin
Scenario: Cancel demo cluster reset
  Given a demo cluster exists with profile "kube9-demo"
  When the developer runs "./scripts/demo-cluster/reset.sh"
  And the script prompts for confirmation
  And the developer cancels the operation
  Then the cluster should remain unchanged
  And the script should output "Reset cancelled"
  And no resources should be deleted
```

```gherkin
Scenario: Populate demo cluster with operator scenario
  Given a demo cluster is running
  And the cluster is empty
  When the developer runs "./scripts/demo-cluster/populate.sh with-operator"
  Then the script should apply scenarios/with-operator.yaml to the cluster
  And the kube9-operator should be deployed
  And sample workloads should be created
  And sample namespaces should be created
  And the script should output "Scenario 'with-operator' deployed successfully"
  And the script should list the created resources
```

```gherkin
Scenario: Populate demo cluster with healthy workloads scenario
  Given a demo cluster is running
  And the cluster is empty
  When the developer runs "./scripts/demo-cluster/populate.sh healthy"
  Then the script should apply scenarios/healthy.yaml to the cluster
  And multiple healthy Pods should be created
  And multiple healthy Deployments should be created
  And Services should be created in running state
  And all resources should report healthy status
  And the script should output "Scenario 'healthy' deployed successfully"
```

```gherkin
Scenario: Populate demo cluster with degraded workloads scenario
  Given a demo cluster is running
  When the developer runs "./scripts/demo-cluster/populate.sh degraded"
  Then the script should apply scenarios/degraded.yaml to the cluster
  And some Pods should be in Pending state
  And some Pods should be in CrashLoopBackOff state
  And some Deployments should have insufficient replicas
  And the script should output "Scenario 'degraded' deployed successfully"
  And the extension should show various error states when connected
```

```gherkin
Scenario: Populate demo cluster without operator scenario
  Given a demo cluster is running
  When the developer runs "./scripts/demo-cluster/populate.sh without-operator"
  Then the script should apply scenarios/without-operator.yaml to the cluster
  And the kube9-operator should NOT be deployed
  And sample workloads should be created without operator
  And the script should output "Scenario 'without-operator' deployed successfully"
  And the extension should operate in Free Tier mode
```

```gherkin
Scenario: Switch between scenarios
  Given a demo cluster is running with scenario "healthy"
  And the cluster contains resources from the healthy scenario
  When the developer runs "./scripts/demo-cluster/populate.sh degraded"
  Then the script should detect existing resources
  And the script should prompt to clear existing resources
  And the developer confirms
  Then all previous scenario resources should be deleted
  And the new scenario should be deployed
  And the script should output "Scenario 'degraded' deployed successfully"
```

```gherkin
Scenario: Launch VSCode debug with demo cluster
  Given a demo cluster is running at ./demo-cluster/kubeconfig
  And the developer opens VS Code in the kube9-vscode project
  When they select the debug configuration "Extension (Demo Cluster)"
  And they start debugging (F5)
  Then the Extension Development Host should launch
  And the KUBECONFIG environment variable should point to ./demo-cluster/kubeconfig
  And the extension should load the demo cluster automatically
  And only the demo cluster should be visible in the tree view
  And the developer can test features safely on the demo cluster
```

```gherkin
Scenario: Take marketing screenshots with demo cluster
  Given a demo cluster is running
  And the developer has deployed scenario "with-operator"
  And VS Code is running with the Extension Development Host
  When the developer navigates the tree view
  Then they can see realistic cluster data
  And they can take screenshots without exposing real clusters
  And all resource names are generic and safe for marketing
  And no sensitive information is visible
```

```gherkin
Scenario: List available scenarios
  Given the developer is in the project directory
  When they run "./scripts/demo-cluster/populate.sh" without arguments
  Then the script should display usage information
  And the script should list all available scenarios:
    | Scenario         | Description                          |
    | with-operator    | Cluster with kube9-operator deployed |
    | without-operator | Cluster without operator (Free Tier) |
    | healthy          | All workloads in healthy state       |
    | degraded         | Various workloads in error states    |
  And the script should show example usage
  And the script should exit with usage error code
```

```gherkin
Scenario: Handle invalid scenario name
  Given a demo cluster is running
  When the developer runs "./scripts/demo-cluster/populate.sh invalid-scenario"
  Then the script should output "Error: Scenario 'invalid-scenario' not found"
  And the script should list available scenarios
  And the script should exit with an error code
  And the cluster should remain unchanged
```

```gherkin
Scenario: Handle Minikube not installed
  Given Minikube is not installed on the developer's machine
  When the developer runs "./scripts/demo-cluster/start.sh"
  Then the script should detect Minikube is missing
  And the script should output "Error: Minikube not found"
  And the script should display installation instructions
  And the script should exit with an error code
```

```gherkin
Scenario: Demo cluster kubeconfig isolation
  Given the developer has multiple clusters in their main kubeconfig
  And a demo cluster is running
  When the developer views ./demo-cluster/kubeconfig
  Then the kubeconfig should contain ONLY the kube9-demo cluster
  And it should not include any real production clusters
  And it should not merge with ~/.kube/config
  And the kubeconfig should be safe to share for documentation purposes
```

```gherkin
Scenario: Clean demo environment
  Given a demo cluster is running
  And the developer is finished with testing
  When they run "./scripts/demo-cluster/stop.sh"
  Then the cluster resources are preserved but stopped
  When they run "./scripts/demo-cluster/reset.sh" at a later time
  Then all demo resources are completely removed
  And no traces remain in the main kubeconfig
  And the developer can restart fresh anytime
```

```gherkin
Scenario: Demo cluster resource configuration
  Given the developer runs "./scripts/demo-cluster/start.sh"
  Then the cluster should be configured with:
    | Setting  | Value           |
    | CPUs     | 2               |
    | Memory   | 4GB             |
    | Driver   | docker or kvm2  |
    | Profile  | kube9-demo      |
  And the configuration should be adequate for extension testing
  And the cluster should start within reasonable time (< 2 minutes)
```

```gherkin
Scenario: Scenario definitions are easily modifiable
  Given a developer wants to customize a scenario
  When they open scenarios/healthy.yaml
  Then they should see standard Kubernetes YAML manifests
  And they can add or modify resources
  And they can create new scenario files
  And custom scenarios work with populate.sh
  And the YAML files are well-documented with comments
```

```gherkin
Scenario: Demo cluster for QA regression testing
  Given a QA engineer needs to test a bug fix
  When they start the demo cluster
  And they populate it with a specific scenario
  Then they have a reproducible test environment
  And they can verify the fix works correctly
  And they can reset and retry as many times as needed
  And the environment matches the bug report conditions
```

```gherkin
Scenario: Demo cluster for presentation demos
  Given a developer is preparing a product demo
  When they start the demo cluster
  And they populate it with the "with-operator" scenario
  Then they have a reliable demo environment
  And they can practice the demo multiple times
  And they can reset if something goes wrong during the demo
  And the demo shows professional, realistic data
```

```gherkin
Scenario: Verify demo cluster isolation
  Given a developer has real clusters in their main kubeconfig
  And a demo cluster is running
  When they set KUBECONFIG to ./demo-cluster/kubeconfig
  And they run "kubectl config get-contexts"
  Then they should see ONLY the kube9-demo context
  And they should not see any real cluster contexts
  When they unset KUBECONFIG
  And they run "kubectl config get-contexts"
  Then they should see their real cluster contexts
  And the demo cluster should not appear in the list
```

```gherkin
Scenario: Stop and restart demo cluster preserves data
  Given a demo cluster is running with scenario "with-operator"
  And the cluster contains workloads and resources
  When the developer runs "./scripts/demo-cluster/stop.sh"
  And later runs "./scripts/demo-cluster/start.sh"
  Then the cluster should restart with the same profile
  And all previous workloads should still exist
  And the scenario state should be preserved
  And the developer can continue testing from where they left off
```

```gherkin
Scenario: Multiple developers use independent demo clusters
  Given developer A starts a demo cluster on their machine
  And developer B starts a demo cluster on their machine
  Then each cluster should use profile "kube9-demo" locally
  And each cluster should be completely independent
  And each developer can use different scenarios
  And there should be no conflict or interference between clusters
```

```gherkin
Scenario: Script provides helpful output
  Given a developer is new to the demo cluster system
  When they run any demo cluster script
  Then the script should display clear progress messages
  And the script should show what it's doing at each step
  And success messages should be encouraging
  And error messages should be actionable
  And the output should guide the developer on next steps
```
