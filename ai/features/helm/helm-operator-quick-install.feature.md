---
feature_id: helm-operator-quick-install
name: Helm Operator 1-Click Installation
description: Users can quickly install the Kube9 Operator from the Featured Charts section with pre-configured defaults
spec_id:
  - helm-operator-installation
---

# Helm Operator 1-Click Installation

```gherkin
Scenario: View Kube9 Operator in featured section
  Given the Helm Package Manager is open
  When the Featured Charts section loads
  Then the Kube9 Operator is displayed prominently at the top
  And the operator card shows:
    - Kube9 logo icon
    - "Kube9 Operator" title
    - Description: "Advanced Kubernetes management for VS Code"
    - Current version available
    - Installation status badge
  And the operator card has an "Install Now" button
  And the operator card has links to Documentation and Values
```

```gherkin
Scenario: Operator not installed - show install button
  Given the Kube9 Operator is not installed in the cluster
  When the Featured Charts section loads
  Then the operator status badge shows "Not Installed"
  And the primary action button shows "Install Now"
  And the button is prominently styled
```

```gherkin
Scenario: 1-click operator installation with defaults
  Given the Kube9 Operator is not installed
  When the user clicks "Install Now"
  Then an operator install modal opens
  And the modal shows pre-filled values:
    - Release name: "kube9-operator" (read-only)
    - Namespace: "kube9-system" (editable)
    - Create namespace: checked
  And the modal has an optional "API Key" section (collapsed)
  And the modal has an "Install" button
  When the user clicks "Install"
  Then the kube9 repository is added (if not present)
  And the repository is updated
  And the Helm CLI executes:
    """
    helm install kube9-operator kube9/kube9-operator \
      --namespace kube9-system \
      --create-namespace \
      --wait \
      --timeout 5m
    """
  And a progress indicator shows installation steps
  And the operator is installed in the cluster
```

```gherkin
Scenario: Install operator with API key for Pro tier
  Given the operator install modal is open
  When the user expands the "Pro Tier" section
  Then an API key input field is displayed
  And a link to "Get API key" points to portal.kube9.dev
  And Pro tier benefits are listed
  When the user enters API key "kdy_prod_abc123"
  And clicks "Install"
  Then the operator is installed with the API key
  And the Helm CLI includes: --set apiKey=kdy_prod_abc123
  And Pro features are enabled after installation
```

```gherkin
Scenario: Install operator with custom namespace
  Given the operator install modal is open
  When the user changes namespace to "kube9-prod"
  And clicks "Install"
  Then the operator is installed in "kube9-prod" namespace
  And the namespace is created if it doesn't exist
```

```gherkin
Scenario: Installation progress feedback
  Given the user clicks "Install" in the operator modal
  When the installation is executing
  Then a progress notification displays:
    - 10%: "Adding kube9 repository..."
    - 20%: "Updating repository..."
    - 30%: "Installing chart..."
    - 80%: "Verifying installation..."
    - 100%: "Installation complete!"
  And each step shows current status
```

```gherkin
Scenario: Wait for operator to be ready
  Given the operator installation is in progress
  When the chart is installed
  Then the extension monitors operator pod status
  And waits for the pod to reach "Running" phase
  And waits for container to be ready
  And times out after 5 minutes if not ready
  When the operator becomes ready
  Then the extension detects the operator
  And Pro features are enabled (if API key provided)
```

```gherkin
Scenario: Installation success notification
  Given the operator installation completes successfully
  When the operator is verified as running
  Then a success notification is displayed
  And the message shows "Kube9 Operator installed successfully!"
  And the operator appears in Installed Releases section
  And the Featured section shows "Installed" status
```

```gherkin
Scenario: Installation with Pro tier shows enhanced success
  Given the operator was installed with an API key
  When installation completes
  Then the success message includes "Pro features enabled!"
  And a button offers to "Open Dashboard"
  When the user clicks "Open Dashboard"
  Then the Kube9 Dashboard opens showing Pro features
```

```gherkin
Scenario: Installation without API key suggests upgrade
  Given the operator was installed without an API key
  When installation completes
  Then the success message includes "Add an API key to enable Pro features"
  And an "Add API Key" button is shown
  When the user clicks "Add API Key"
  Then the extension opens API key configuration
```

```gherkin
Scenario: Operator already installed - show installed status
  Given the Kube9 Operator is installed
  And the operator is at version "1.5.0"
  When the Featured Charts section loads
  Then the operator status badge shows "Installed v1.5.0" with green checkmark
  And the primary action button shows "Installed" (disabled/styled differently)
  And a "Configure" button is available
```

```gherkin
Scenario: Operator upgrade available - show upgrade button
  Given the Kube9 Operator is installed with version "1.4.0"
  And version "1.5.0" is available in the repository
  When the Featured Charts section loads
  Then the operator status badge shows "Update Available: v1.5.0" with yellow badge
  And the primary action button shows "Upgrade"
  And the button is highlighted to draw attention
```

```gherkin
Scenario: Upgrade operator from featured section
  Given the operator has an update available
  When the user clicks "Upgrade"
  Then an upgrade modal opens
  And the modal shows current version vs new version
  And "Reuse existing values" is checked by default
  And the API key is preserved if previously set
  When the user clicks "Upgrade"
  Then the operator is upgraded with --reuse-values
  And existing configuration is preserved
  And a success notification is displayed
```

```gherkin
Scenario: Installation fails - repository not accessible
  Given the user clicks "Install Now"
  When the kube9 repository cannot be reached
  Then the installation fails
  And an error notification explains the network issue
  And suggests checking internet connection
  And no release is created
```

```gherkin
Scenario: Installation fails - namespace conflict
  Given a namespace "kube9-system" already exists
  And the namespace contains conflicting resources
  When the user installs the operator
  Then the installation may fail due to resource conflicts
  And an error notification explains the conflict
  And suggests using a different namespace
```

```gherkin
Scenario: Installation fails - timeout waiting for pod
  Given the operator installation executes
  When the operator pod fails to start within 5 minutes
  Then the installation times out
  And an error notification suggests checking pod logs
  And the release is created but marked as failed
  And the user can view logs or retry
```

```gherkin
Scenario: View operator documentation before install
  Given the Featured Charts section is displayed
  When the user clicks "Documentation" on the operator card
  Then a browser opens to https://alto9.github.io/kube9/
  And the user can review documentation before installing
```

```gherkin
Scenario: View operator default values before install
  Given the Featured Charts section is displayed
  When the user clicks "View Values" on the operator card
  Then a modal shows the default values.yaml
  And the user can review configuration options
  And the user can copy values for customization
```

```gherkin
Scenario: Access advanced install options
  Given the operator install modal is open
  When the user clicks "Advanced Options"
  Then the full chart installation form is displayed
  And the user can customize all chart values
  And the user can modify resource limits, tolerations, etc.
```

```gherkin
Scenario: Operator detection after installation
  Given the operator installation completes
  When the extension performs operator health check
  Then the operator is detected in the configured namespace
  And the extension retrieves operator status from ConfigMap
  And the tier (free/pro) is determined from the status
  And the extension enables appropriate features
  And the tree view may show new operator-enabled items
```

```gherkin
Scenario: Configure operator after installation
  Given the operator is installed
  And the Featured section shows "Installed" status
  When the user clicks the "Configure" button
  Then operator configuration options are displayed
  And the user can add/update API key
  And the user can modify operator settings
  And changes are applied via helm upgrade
```

