---
feature_id: helm-repository-management
name: Helm Repository Management
description: Users can manage Helm repositories by adding, updating, and removing them
spec_id:
  - helm-repository-operations
  - helm-cli-integration
---

# Helm Repository Management

```gherkin
Scenario: View configured repositories
  Given the Helm Package Manager is open
  When the Repositories section loads
  Then all configured Helm repositories are displayed
  And each repository shows its name and URL
  And each repository shows the number of available charts
  And each repository has Update and Remove buttons
```

```gherkin
Scenario: Add a new repository
  Given the Helm Package Manager is open
  And the user is viewing the Repositories section
  When the user clicks the "+ Add Repository" button
  Then a modal opens with a form
  And the form has fields for repository name and URL
  When the user enters name "bitnami"
  And enters URL "https://charts.bitnami.com/bitnami"
  And clicks the "Add" button
  Then the repository is added to Helm configuration
  And the repository appears in the list
  And a success notification is displayed
```

```gherkin
Scenario: Add repository with invalid URL
  Given the Add Repository modal is open
  When the user enters name "test"
  And enters URL "not-a-valid-url"
  And clicks the "Add" button
  Then an error message is displayed
  And the error explains "Repository URL is invalid"
  And the repository is not added
```

```gherkin
Scenario: Add repository with duplicate name
  Given a repository named "stable" already exists
  And the Add Repository modal is open
  When the user enters name "stable"
  And enters URL "https://charts.helm.sh/stable"
  And clicks the "Add" button
  Then an error message is displayed
  And the error explains "Repository 'stable' already exists"
  And the repository is not added
```

```gherkin
Scenario: Update a single repository
  Given the Helm Package Manager is open
  And a repository named "bitnami" is configured
  When the user clicks the Update button for "bitnami"
  Then a progress indicator is shown
  And the Helm CLI executes "helm repo update bitnami"
  And the repository index is refreshed
  And the chart count is updated
  And a success notification is displayed
```

```gherkin
Scenario: Update all repositories
  Given the Helm Package Manager is open
  And multiple repositories are configured
  When the user clicks the "Update All" button
  Then a progress indicator is shown
  And the Helm CLI executes "helm repo update"
  And all repository indexes are refreshed
  And chart counts are updated for all repositories
  And a success notification is displayed
```

```gherkin
Scenario: Remove a repository
  Given the Helm Package Manager is open
  And a repository named "stable" is configured
  When the user clicks the Remove button for "stable"
  Then a confirmation dialog appears
  And the dialog asks "Are you sure you want to remove repository 'stable'?"
  When the user confirms removal
  Then the repository is removed from Helm configuration
  And the repository disappears from the list
  And a success notification is displayed
```

```gherkin
Scenario: Cancel repository removal
  Given a confirmation dialog for removing "stable" is displayed
  When the user clicks "Cancel"
  Then the dialog closes
  And the repository remains in the list
  And no changes are made
```

```gherkin
Scenario: Repository update fails
  Given the Helm Package Manager is open
  And a repository named "broken" with invalid URL exists
  When the user clicks the Update button for "broken"
  Then the update operation fails
  And an error notification is displayed
  And the error explains the connection issue
  And the repository remains in the list
```

```gherkin
Scenario: Suggest adding kube9 repository
  Given the Helm Package Manager is open for the first time
  And the "kube9" repository is not configured
  When the package manager loads
  Then a notification suggests adding the kube9 repository
  And the notification explains it contains the Kube9 Operator
  When the user clicks "Add Repository"
  Then the kube9 repository is added automatically
  And the repository appears in the list
```

