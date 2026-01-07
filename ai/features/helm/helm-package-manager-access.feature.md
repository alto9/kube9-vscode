---
feature_id: helm-package-manager-access
name: Helm Package Manager Access
description: Users can open the Helm Package Manager webview from the tree view
spec_id:
  - helm-webview-architecture
---

# Helm Package Manager Access

```gherkin
Scenario: Open Helm Package Manager from tree view
  Given the Kube9 extension is active
  And the user has at least one Kubernetes cluster configured
  When the user clicks the "Helm Package Manager" tree item
  Then a webview panel opens displaying the package manager
  And the webview shows the Featured Charts section
  And the webview shows the Repositories section
  And the webview shows the Installed Releases section
  And the webview shows the Discover Charts section
```

```gherkin
Scenario: Package manager persists when hidden
  Given the Helm Package Manager webview is open
  When the user switches to a different VS Code panel
  And the user clicks the "Helm Package Manager" tree item again
  Then the same webview instance is displayed
  And the previous state is preserved (scroll position, filters)
```

```gherkin
Scenario: Package manager shows loading state
  Given the user clicks the "Helm Package Manager" tree item
  When the webview is loading data
  Then a loading indicator is displayed
  And sections show skeleton loaders
  And the user cannot interact with actions until loaded
```

```gherkin
Scenario: Package manager shows cluster context
  Given the Helm Package Manager is open
  And the user has multiple Kubernetes clusters configured
  When the webview loads
  Then the current cluster name is displayed in the header
  And releases are shown from the current cluster
  And repositories are shown from the current Helm configuration
```

```gherkin
Scenario: Package manager handles no clusters configured
  Given the Kube9 extension is active
  And no Kubernetes clusters are configured
  When the user clicks the "Helm Package Manager" tree item
  Then the webview opens with an empty state
  And a message explains that a cluster is required
  And a button to configure clusters is displayed
```

```gherkin
Scenario: Close package manager
  Given the Helm Package Manager webview is open
  When the user closes the webview panel
  Then the webview is disposed
  And resources are cleaned up
  And clicking the tree item again opens a fresh instance
```

