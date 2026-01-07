---
feature_id: helm-chart-installation
name: Helm Chart Installation
description: Users can install Helm charts with customized values and configuration
spec_id:
  - helm-chart-operations
---

# Helm Chart Installation

```gherkin
Scenario: Install chart with default values
  Given a chart detail modal is open for "bitnami/postgresql"
  When the user clicks the "Install" button
  Then an installation form opens
  And the release name is auto-generated
  And the namespace field shows available namespaces
  And the default chart values are pre-loaded
  When the user selects namespace "default"
  And clicks "Install"
  Then the chart is installed with default values
  And a progress indicator shows installation status
  And the release appears in the Installed Releases section
  And a success notification is displayed
```

```gherkin
Scenario: Install chart with custom release name
  Given the installation form is open
  When the user enters release name "my-database"
  And selects namespace "production"
  And clicks "Install"
  Then the chart is installed as "my-database"
  And the release appears in namespace "production"
  And the release is listed in Installed Releases
```

```gherkin
Scenario: Install chart with custom values (YAML mode)
  Given the installation form is open
  And the values editor is in YAML mode
  When the user modifies the values YAML:
    """
    persistence:
      enabled: true
      size: 10Gi
    resources:
      requests:
        memory: 256Mi
    """
  And clicks "Install"
  Then the chart is installed with the custom values
  And the custom values are applied to the release
```

```gherkin
Scenario: Install chart with form-based values editor
  Given the installation form is open
  And the values editor is in form mode
  When the user enables "persistence.enabled" checkbox
  And sets "persistence.size" to "10Gi"
  And sets "resources.requests.memory" to "256Mi"
  And clicks "Install"
  Then the form values are converted to YAML
  And the chart is installed with those values
```

```gherkin
Scenario: Switch between YAML and form mode
  Given the installation form is open
  And the values editor is in YAML mode
  When the user clicks "Switch to Form Mode"
  Then the YAML values are parsed into form fields
  And the form editor is displayed
  And the values are preserved
  When the user clicks "Switch to YAML Mode"
  Then the form values are converted to YAML
  And the YAML editor is displayed
  And the values are preserved
```

```gherkin
Scenario: Install with create namespace
  Given the installation form is open
  When the user enters namespace "new-namespace"
  And the namespace does not exist
  And the "Create namespace" checkbox is checked
  And clicks "Install"
  Then the namespace is created
  And the chart is installed in the new namespace
```

```gherkin
Scenario: Validate invalid release name
  Given the installation form is open
  When the user enters release name "Invalid_Name!"
  And clicks "Install"
  Then a validation error is displayed
  And the error explains "Invalid release name format"
  And the installation does not proceed
```

```gherkin
Scenario: Validate invalid values YAML
  Given the installation form is open
  And the values editor is in YAML mode
  When the user enters invalid YAML:
    """
    this is: not
      - valid: yaml:
    """
  Then a syntax error is displayed inline
  And the error highlights the problematic line
  And the Install button is disabled
```

```gherkin
Scenario: Dry run installation
  Given the installation form is open
  And custom values are configured
  When the user clicks the "Dry Run" button
  Then the Helm CLI executes with --dry-run flag
  And a preview modal shows the manifest that would be installed
  And the preview displays Kubernetes resources as YAML
  And the user can review before actual installation
```

```gherkin
Scenario: Installation with timeout
  Given the installation form is open
  When the user expands "Advanced Options"
  And sets timeout to "10m"
  And enables "Wait for resources to be ready"
  And clicks "Install"
  Then the installation waits up to 10 minutes
  And monitors resources until ready or timeout
```

```gherkin
Scenario: Installation fails - release already exists
  Given a release "my-app" already exists in namespace "default"
  And the installation form is open
  When the user enters release name "my-app"
  And selects namespace "default"
  And clicks "Install"
  Then the installation fails
  And an error notification explains "A release with this name already exists"
  And the error suggests choosing a different name or uninstalling the existing release
```

```gherkin
Scenario: Installation fails - timeout
  Given the installation form is open with wait enabled
  And timeout is set to "1m"
  When the user clicks "Install"
  And the chart resources take longer than 1 minute to be ready
  Then the installation times out
  And an error notification explains the timeout
  And the error suggests checking pod logs or increasing timeout
  And the partial release is created in failed state
```

```gherkin
Scenario: Cancel installation in progress
  Given an installation is in progress
  And the progress indicator is displayed
  When the installation cannot be cancelled (Helm limitation)
  Then no cancel button is shown
  And the user must wait for completion or failure
```

```gherkin
Scenario: Installation progress feedback
  Given the user clicks "Install"
  When the installation is executing
  Then a progress notification is displayed
  And progress messages update:
    - "Starting installation..."
    - "Executing helm install..."
    - "Waiting for resources..."
    - "Installation complete"
  And the progress percentage increases
```

```gherkin
Scenario: Select specific chart version
  Given the installation form is open
  When the user clicks the "Version" dropdown
  Then available chart versions are listed
  When the user selects version "12.5.0"
  And clicks "Install"
  Then that specific version is installed
  And the --version flag is passed to Helm CLI
```

