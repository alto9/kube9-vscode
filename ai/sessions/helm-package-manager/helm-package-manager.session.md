---
session_id: helm-package-manager
start_time: '2026-01-07T01:14:47.010Z'
status: development
problem_statement: >
  Create a comprehensive Helm Package Manager webview within the Kube9 VS Code
  extension that provides visual interface for discovering, installing, and
  managing Helm charts. The package manager should reduce context switching
  between terminal and IDE, improve chart discoverability, streamline
  installation with visual forms, and prominently feature the Kube9 Operator for
  1-click installation.
changed_files:
  - path: ai/features/helm/helm-package-manager-access.feature.md
    change_type: added
    scenarios_added:
      - Open Helm Package Manager from tree view
      - Package manager persists when hidden
      - Package manager shows loading state
      - Package manager shows cluster context
      - Package manager handles no clusters configured
      - Close package manager
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-repository-management.feature.md
    change_type: added
    scenarios_added:
      - View configured repositories
      - Add a new repository
      - Add repository with invalid URL
      - Add repository with duplicate name
      - Update a single repository
      - Update all repositories
      - Remove a repository
      - Cancel repository removal
      - Repository update fails
      - Suggest adding kube9 repository
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-chart-discovery.feature.md
    change_type: added
    scenarios_added:
      - Search for charts
      - Search with debouncing
      - Empty search results
      - View chart details
      - Browse repository charts
      - View chart README
      - View chart values
      - View available versions
      - Chart detail loading state
      - Chart detail fetch fails
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-chart-installation.feature.md
    change_type: added
    scenarios_added:
      - Install chart with default values
      - Install chart with custom release name
      - Install chart with custom values (YAML mode)
      - Install chart with form-based values editor
      - Switch between YAML and form mode
      - Install with create namespace
      - Validate invalid release name
      - Validate invalid values YAML
      - Dry run installation
      - Installation with timeout
      - Installation fails - release already exists
      - Installation fails - timeout
      - Cancel installation in progress
      - Installation progress feedback
      - Select specific chart version
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-release-management.feature.md
    change_type: added
    scenarios_added:
      - View installed releases
      - Release with healthy status
      - Release with failed status
      - Release with upgrade available
      - Filter releases by namespace
      - Filter releases by status
      - Search releases by name
      - Clear all filters
      - View release details
      - View release info tab
      - View release manifest
      - View release values
      - View release history
      - Empty releases list
      - Periodic release status updates
      - Release status transitions
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-release-upgrade.feature.md
    change_type: added
    scenarios_added:
      - Upgrade release to latest version
      - Upgrade with new custom values
      - Upgrade with modified existing values
      - Select specific version for upgrade
      - Upgrade fails - values validation error
      - Upgrade fails - chart not found
      - Upgrade with wait for ready
      - Upgrade times out waiting for ready
      - Cancel upgrade before execution
      - Upgrade progress feedback
      - Upgrade creates new revision
      - View values diff before upgrade
      - Upgrade from featured section
      - Multiple releases can be upgraded
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-release-rollback.feature.md
    change_type: added
    scenarios_added:
      - View release revision history
      - Rollback to previous revision
      - Rollback fails - revision not found
      - Cancel rollback
      - Rollback after failed upgrade
      - Rollback progress feedback
      - View rolled-back release
      - Uninstall release
      - Cancel uninstall
      - Uninstall fails - release not found
      - Uninstall with dependencies
      - Uninstall progress feedback
      - Uninstall from release details modal
      - Uninstall clears namespace (if empty)
      - Cannot rollback after uninstall
    scenarios_modified: []
    scenarios_removed: []
  - path: ai/features/helm/helm-operator-quick-install.feature.md
    change_type: added
    scenarios_added:
      - View Kube9 Operator in featured section
      - Operator not installed - show install button
      - 1-click operator installation with defaults
      - Install operator with API key for Pro tier
      - Install operator with custom namespace
      - Installation progress feedback
      - Wait for operator to be ready
      - Installation success notification
      - Installation with Pro tier shows enhanced success
      - Installation without API key suggests upgrade
      - Operator already installed - show installed status
      - Operator upgrade available - show upgrade button
      - Upgrade operator from featured section
      - Installation fails - repository not accessible
      - Installation fails - namespace conflict
      - Installation fails - timeout waiting for pod
      - View operator documentation before install
      - View operator default values before install
      - Access advanced install options
      - Operator detection after installation
      - Configure operator after installation
    scenarios_modified: []
    scenarios_removed: []
start_commit: cad2d177cd19b5f8e005c4726561617f8ad29b96
end_time: '2026-01-07T01:28:15.368Z'
---
## Problem Statement

Users managing Kubernetes clusters in VS Code lack a visual interface for Helm operations. While the CLI provides all functionality, a visual package manager would significantly improve the developer experience by reducing context switching, improving discoverability, streamlining installations, and providing visual feedback on releases and their status.

This is particularly important since the Kube9 Operator itself is distributed as a Helm chart, and having visual Helm management would make it easier for users to discover, install, and upgrade it.

## Goals

1. Create a webview-based Helm Package Manager accessible from a single tree item
2. Enable visual repository management (add, update, remove repositories)
3. Provide chart discovery and search across all configured repositories
4. Implement visual chart installation with form-based and YAML value editors
5. Display installed releases with status indicators and upgrade availability
6. Support release management operations (upgrade, rollback, uninstall)
7. Feature the Kube9 Operator with 1-click installation capability
8. Integrate with existing extension infrastructure (cluster context, error handling, notifications)

## Approach

Following Forge's diagram-first methodology:

1. **Actors**: Define personas interacting with the Helm package manager
2. **Diagrams**: Create visual architecture for webview, data flows, and user workflows
3. **Specs**: Derive technical specifications from diagram objects
4. **Features**: Define user-facing behaviors with Gherkin scenarios

The package manager will be a React-based webview similar to the existing Cluster Manager, using message passing between extension and webview for all Helm operations.

## Key Decisions

- Use single webview interface (not tree hierarchy) for richer UX capabilities
- Execute Helm CLI commands via child_process.spawn (similar to kubectl integration)
- Store repository configuration in workspace state
- Cache chart lists with TTL to reduce Helm CLI calls
- Implement 1-click operator installation as special flow with pre-configured values
- Support both YAML and form-based value editors for maximum flexibility

## Notes

- Helm 3.x must be installed and available in PATH
- Repository list should include kube9 repository by default or suggest it on first use
- Consider upgrade notifications for critical operator patches
- Future enhancements: chart favorites, value presets, chart version comparison
