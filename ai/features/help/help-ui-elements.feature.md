---
feature_id: help-ui-elements
name: Help UI Elements
description: Status bar help icon, webview help buttons, context menu help items, and error message help links
spec_id:
  - help-ui-integration
---

# Help UI Elements

## Overview

Help is integrated throughout the extension's UI via status bar icons, webview help buttons, context menu items, and enriched error messages. These UI elements provide context-sensitive access to documentation and support resources from wherever the user is working.

## Behavior

```gherkin
Feature: Help UI Elements

Background:
  Given the kube9 extension is installed and activated
  And help resources are integrated throughout the UI

Scenario: Status bar displays help icon
  Given the extension is activated
  Then a help icon appears in the status bar
  And it is positioned on the far right
  And displays the text "$(question) Kube9 Help"
  And has tooltip "Kube9 Help and Documentation"
  And is always visible when VSCode is open

Scenario: Status bar help icon is clickable
  Given the help icon is visible in the status bar
  When the user clicks the icon
  Then a quick pick menu opens
  And displays four help options:
    - Documentation
    - Report Issue
    - Keyboard Shortcuts
    - Getting Started

Scenario: Status bar help icon is keyboard accessible
  Given the user navigates with keyboard only
  When they tab to the status bar help icon
  And press Enter or Space
  Then the help menu opens
  And focus moves to the menu

Scenario: Webview includes help button
  Given the user opens a webview (Events Viewer, Pod Logs, Cluster Manager, etc.)
  Then a help button appears in the top-right corner
  And displays a question mark icon and "Help" text
  And has appropriate styling matching VSCode theme

Scenario: Events Viewer help button opens specific documentation
  Given the Events Viewer is open
  When the user clicks the help button
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/features/events-viewer/"
  And displays Events Viewer-specific documentation

Scenario: Pod Logs help button opens specific documentation
  Given the Pod Logs viewer is open
  When the user clicks the help button
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/features/pod-logs/"
  And displays Pod Logs-specific documentation

Scenario: Cluster Manager help button opens specific documentation
  Given the Cluster Manager is open
  When the user clicks the help button
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/features/cluster-manager/"
  And displays Cluster Manager-specific documentation

Scenario: YAML Editor help button opens specific documentation
  Given the YAML Editor is open
  When the user clicks the help button
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/features/yaml-editor/"
  And displays YAML Editor-specific documentation

Scenario: Describe Webview help button opens specific documentation
  Given a Describe Webview is open for any resource
  When the user clicks the help button
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/features/describe-view/"
  And displays Describe View-specific documentation

Scenario: Webview help button has hover state
  Given a webview is open with a help button
  When the user hovers over the help button
  Then the background color changes to indicate interactivity
  And the cursor changes to pointer
  And the button displays a visual hover state

Scenario: Webview help button is keyboard accessible
  Given a webview is open with a help button
  When the user presses Tab to navigate
  Then focus moves to the help button
  And a focus indicator is visible
  When they press Enter or Space
  Then the contextual help opens

Scenario: Context menu shows help for pods
  Given the user right-clicks a pod in the tree view
  Then the context menu appears
  And includes a "Help" section at the bottom
  And shows "Help: Working with Pods" menu item
  When they click the help menu item
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/resources/pods/"

Scenario: Context menu shows help for deployments
  Given the user right-clicks a deployment in the tree view
  Then the context menu includes "Help: Working with Deployments"
  When they click the help menu item
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/resources/deployments/"

Scenario: Context menu shows help for services
  Given the user right-clicks a service in the tree view
  Then the context menu includes "Help: Working with Services"
  When they click the help menu item
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/resources/services/"

Scenario: Error message includes "Learn More" link
  Given the extension encounters an error
  When the error dialog is displayed
  Then it includes the error message
  And shows the error code
  And includes a "Learn More" button
  And includes a "Report Issue" button

Scenario: Error "Learn More" opens troubleshooting documentation
  Given an error occurs with code "CLUSTER_UNREACHABLE"
  When the error dialog shows
  And the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/connection/"
  And displays troubleshooting steps for cluster connectivity

Scenario: Kubeconfig error links to specific troubleshooting
  Given an error occurs with code "KUBECONFIG_NOT_FOUND"
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/kubeconfig/"
  And displays kubeconfig setup and troubleshooting

Scenario: RBAC error links to permissions documentation
  Given an error occurs with code "RBAC_PERMISSION_DENIED"
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/permissions/"
  And displays RBAC permissions guidance

Scenario: Operator error links to operator documentation
  Given an error occurs with code "OPERATOR_NOT_FOUND"
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/operator/"
  And displays operator installation and troubleshooting

Scenario: Timeout error links to timeout troubleshooting
  Given an error occurs with code "TIMEOUT"
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/timeout/"
  And displays timeout troubleshooting steps

Scenario: Resource not found error links to resource documentation
  Given an error occurs with code "RESOURCE_NOT_FOUND"
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/resources/"
  And displays resource troubleshooting guidance

Scenario: Error "Report Issue" opens GitHub with error details
  Given an error occurs
  When the error dialog shows
  And the user clicks "Report Issue"
  Then GitHub opens with a pre-filled issue template
  And includes the error message in the template
  And includes the error code
  And includes system information
  And the user can add additional context before submitting

Scenario: Unknown error codes link to general troubleshooting
  Given an error occurs with an unrecognized error code
  When the user clicks "Learn More"
  Then the browser opens
  And navigates to "https://alto9.github.io/kube9/troubleshooting/"
  And displays the general troubleshooting page

Scenario: Webview help button matches VSCode theme
  Given VSCode is using a dark theme
  When a webview opens with a help button
  Then the button uses VSCode dark theme colors
  And text is readable against the background
  When the user switches to a light theme
  Then the button colors update automatically
  And remain readable

Scenario: Status bar help icon persists across sessions
  Given the extension is activated
  And the status bar help icon is visible
  When the user closes and reopens VSCode
  Then the status bar help icon is still visible
  And maintains its position and functionality

Scenario: Help UI elements work without active cluster
  Given the user has no clusters configured
  Then the status bar help icon is still visible
  And clicking it opens the help menu
  And all help options are available
  And webview help buttons function normally

Scenario: Multiple webviews show independent help buttons
  Given the user has multiple webviews open
  When they click the help button in the Events Viewer
  Then Events Viewer documentation opens
  When they switch to Pod Logs webview
  And click its help button
  Then Pod Logs documentation opens
  And each webview maintains its own help context

Scenario: Help buttons are visually consistent
  Given multiple webviews are open
  Then all help buttons:
    - Are positioned in the top-right corner
    - Use the same question mark icon
    - Have the same size and styling
    - Follow VSCode design patterns
    - Match the active theme

Scenario: Error help links are accessible
  Given an error dialog is shown with help links
  When the user navigates with keyboard only
  Then they can tab through the action buttons
  And "Learn More" and "Report Issue" are both accessible
  And pressing Enter activates the focused button
```

## Related Features

- **help-commands**: Commands triggered by UI help elements
- **error-handling**: Error messages that include help links
- **events-viewer**: Webview with help button
- **pod-logs-viewer**: Webview with help button
- **cluster-manager**: Webview with help button
- **yaml-editor**: Webview with help button
- **describe-webview**: Webview with help button

## Implementation Notes

### Webview Help Integration

All webviews use a consistent message protocol:
```javascript
vscode.postMessage({
  type: 'openHelp',
  context: 'events-viewer' // or 'pod-logs', 'cluster-manager', etc.
});
```

### Error Context Mapping

Error codes map to specific documentation URLs:
- `KUBECONFIG_NOT_FOUND` → `/troubleshooting/kubeconfig/`
- `CLUSTER_UNREACHABLE` → `/troubleshooting/connection/`
- `RBAC_PERMISSION_DENIED` → `/troubleshooting/permissions/`
- `RESOURCE_NOT_FOUND` → `/troubleshooting/resources/`
- `OPERATOR_NOT_FOUND` → `/troubleshooting/operator/`
- `TIMEOUT` → `/troubleshooting/timeout/`
- (default) → `/troubleshooting/`

### Visual Consistency

All help UI elements:
- Use VSCode's question mark icon (`$(question)` or `codicon-question`)
- Follow VSCode theming with CSS variables
- Maintain consistent positioning (top-right for webviews, far-right for status bar)
- Include appropriate hover and focus states
- Are keyboard accessible

