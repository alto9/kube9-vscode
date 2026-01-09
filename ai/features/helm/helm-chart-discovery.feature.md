---
feature_id: helm-chart-discovery
name: Helm Chart Discovery
description: Users can search for and discover Helm charts across configured repositories
spec_id:
  - helm-chart-operations
  - helm-cli-integration
---

# Helm Chart Discovery

```gherkin
Scenario: Search for charts
  Given the Helm Package Manager is open
  And multiple repositories are configured
  When the user enters "postgres" in the search field
  Then the Helm CLI searches across all repositories
  And search results are displayed
  And each result shows chart name, version, and description
  And each result shows the source repository
```

```gherkin
Scenario: Search with debouncing
  Given the user is typing in the search field
  When the user types "post"
  And continues typing "gres"
  Then the search waits 300ms after the last keystroke
  And only one search is executed for "postgres"
  And intermediate searches are not performed
```

```gherkin
Scenario: Empty search results
  Given the Helm Package Manager is open
  When the user searches for "nonexistent-chart-12345"
  Then no results are found
  And a message explains "No charts found matching your search"
  And a suggestion to check spelling or try different keywords is shown
```

```gherkin
Scenario: View chart details
  Given search results are displayed
  And a chart "bitnami/postgresql" is in the results
  When the user clicks on "bitnami/postgresql"
  Then a detail modal opens
  And the modal shows the chart README
  And the modal shows default values with comments
  And the modal shows available versions in a dropdown
  And the modal has an "Install" button
```

```gherkin
Scenario: Browse repository charts
  Given the Repositories section is displayed
  And a repository "bitnami" is configured
  When the user clicks on the "bitnami" repository
  Then the Discover Charts section scrolls into view
  And search results show all charts from "bitnami"
  And the repository name is highlighted as a filter
```

```gherkin
Scenario: View chart README
  Given a chart detail modal is open for "bitnami/postgresql"
  When the modal loads
  Then the README tab is selected by default
  And the README is rendered as formatted markdown
  And images and links in the README are displayed
  And code blocks are syntax-highlighted
```

```gherkin
Scenario: View chart values
  Given a chart detail modal is open for "bitnami/postgresql"
  When the user clicks the "Values" tab
  Then the default values.yaml is displayed
  And the values are formatted as YAML
  And comments explaining each value are preserved
  And the values can be copied
```

```gherkin
Scenario: View available versions
  Given a chart detail modal is open for "bitnami/postgresql"
  When the user clicks the "Versions" dropdown
  Then all available versions are listed
  And versions are sorted from newest to oldest
  And each version shows the version number
  When the user selects a different version
  Then the README and values update to match that version
```

```gherkin
Scenario: Chart detail loading state
  Given the user clicks on a chart in search results
  When the chart details are being fetched
  Then a loading spinner is displayed in the modal
  And tabs show skeleton loaders
  And the Install button is disabled until loaded
```

```gherkin
Scenario: Chart detail fetch fails
  Given the user clicks on a chart in search results
  When fetching chart details fails
  Then an error message is displayed in the modal
  And the error explains the issue
  And a "Retry" button is provided
  When the user clicks "Retry"
  Then the details are fetched again
```

