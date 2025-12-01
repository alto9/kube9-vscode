---
feature_id: initial-configuration
spec_id: [tree-view-spec, webview-spec]
model_id: []
---

## Overview

The Initial Configuration feature defines the first-time user experience when installing and launching the kube9 VS Code extension. It ensures users have a smooth onboarding process with a helpful welcome screen, automatic cluster detection from their local kubeconfig, and clear guidance on optional authentication setup for AI-powered features.

## Behavior

```gherkin
Feature: Initial Configuration

Background:
  Given the kube9 VS Code extension is available in the marketplace
  And the extension supports VS Code version 1.80.0 or higher

Scenario: Installing the extension from the marketplace
  Given a user has VS Code open
  When they search for "kube9" in the Extensions marketplace
  Then they should see the kube9 extension in the search results
  And the extension listing should show it is for Kubernetes cluster management
  When they click "Install" on the kube9 extension
  Then the extension should download and install successfully
  And the extension should activate automatically after installation
  And the kube9 side panel should appear in the activity bar

Scenario: Welcome screen appears on first launch
  Given the kube9 extension has just been installed
  And the extension has activated for the first time
  When VS Code completes the activation
  Then a welcome screen webview should open automatically
  And the welcome screen should display the kube9 logo and title
  And the welcome screen should show a quick start guide
  And the welcome screen should have a "Do not show this again" checkbox
  And the checkbox should be unchecked by default

Scenario: Welcome screen content provides helpful guidance
  Given the welcome screen is displayed
  Then the quick start guide should explain the extension's core features
  And the guide should list cluster viewing, resource navigation, and AI recommendations
  And the welcome screen should include a link to full documentation
  And the welcome screen should have a "Get Started" or "Close" button

Scenario: User dismisses welcome screen temporarily
  Given the welcome screen is displayed
  And the "Do not show this again" checkbox is not checked
  When the user clicks the "Close" or "Get Started" button
  Then the welcome screen should close
  And the extension should proceed to show detected clusters in the side panel
  When the user closes and reopens VS Code
  Then the welcome screen should appear again on activation

Scenario: User dismisses welcome screen permanently
  Given the welcome screen is displayed
  When the user checks the "Do not show this again" checkbox
  And the user clicks the "Close" or "Get Started" button
  Then the welcome screen should close
  And the extension should save the user's preference
  When the user closes and reopens VS Code
  Then the welcome screen should not appear
  And the extension should proceed directly to showing clusters

Scenario: Automatic cluster detection on activation
  Given the kube9 extension has activated
  And the user has a valid kubeconfig file at "~/.kube/config"
  And the kubeconfig contains one or more cluster contexts
  When the extension initializes
  Then the extension should automatically parse the kubeconfig file
  And the extension should extract all configured clusters and contexts
  And the extension should display the clusters in the kube9 side panel tree view
  And each cluster should be shown as a top-level tree item
  And each cluster should show its context name
  And the clusters should be displayed without requiring authentication

Scenario: Side panel shows detected clusters and contexts
  Given the extension has successfully parsed the kubeconfig
  And the kubeconfig contains multiple clusters with contexts
  When the user opens the kube9 side panel
  Then they should see all detected clusters listed
  And each cluster should have an icon indicating its connection status
  And the current context should be highlighted or marked as active
  When the user clicks on a cluster in the tree view
  Then the cluster should expand to show available namespaces

Scenario: Missing kubeconfig file is handled gracefully
  Given the kube9 extension has activated
  And no kubeconfig file exists at "~/.kube/config"
  Or the kubeconfig file exists but is empty
  When the extension attempts to parse the kubeconfig
  Then the extension should handle the error gracefully
  And the side panel should display a helpful message
  And the message should say "No Kubernetes clusters detected"
  And the message should explain how to configure kubectl or import a kubeconfig
  And the message should provide a button to "Import kubeconfig" or "Configure kubectl"
  And the welcome screen should still appear with setup instructions

Scenario: Invalid kubeconfig file is handled gracefully
  Given the kube9 extension has activated
  And a kubeconfig file exists at "~/.kube/config"
  But the kubeconfig file has invalid YAML syntax or structure
  When the extension attempts to parse the kubeconfig
  Then the extension should catch the parsing error
  And the side panel should display an error message
  And the message should indicate the kubeconfig is invalid
  And the message should suggest checking the file for syntax errors
  And the extension should log the error details for troubleshooting

Scenario: Extension activation performance
  Given the kube9 extension is being activated
  When VS Code triggers the activation event
  Then the extension should activate within 2 seconds
  And the kubeconfig parsing should happen asynchronously
  And the welcome screen should not block cluster detection
  And the side panel should populate incrementally as clusters are detected
  And the extension should not slow down VS Code startup significantly

Scenario: Re-activating extension after initial setup
  Given the user has previously installed and configured the extension
  And the user has dismissed the welcome screen permanently
  And the user has clusters configured in their kubeconfig
  When the user opens VS Code
  Then the extension should activate automatically
  And the welcome screen should not appear
  And the side panel should immediately show detected clusters
  And the extension should begin parsing the kubeconfig in the background
  And the tree view should update as clusters are loaded
```

## Notes

### Implementation Considerations

1. **Welcome Screen Persistence**: Store the "Do not show this again" preference in VS Code's global state using `context.globalState.update()`. Key suggestion: `kube9.welcomeScreen.dismissed`.

2. **Kubeconfig Location**: The extension should check the standard kubeconfig location (`~/.kube/config`) first, but also respect the `KUBECONFIG` environment variable for custom locations.

3. **Activation Events**: The extension should activate on:
   - First install (`onStartupFinished`)
   - Workspace contains Kubernetes files (optional optimization)
   - Explicit command invocation

4. **Error Handling**: All kubeconfig parsing should be wrapped in try-catch blocks with user-friendly error messages. Avoid exposing technical stack traces to users.

5. **Performance**: Cluster detection should not block the UI. Use async/await patterns and consider implementing a loading state in the tree view.

6. **Welcome Screen Design**: The webview should:
   - Match VS Code's theme (light/dark mode)
   - Use VS Code's webview styling for consistency
   - Be responsive and readable at different window sizes
   - Include clear call-to-action buttons

7. **Accessibility**: Ensure the welcome screen and side panel meet accessibility standards:
   - Proper ARIA labels
   - Keyboard navigation support
   - Screen reader compatibility

8. **Testing Scenarios**: Test with:
   - Fresh VS Code installation with no existing settings
   - Multiple clusters in kubeconfig
   - Missing kubeconfig file
   - Corrupted kubeconfig file
   - Custom KUBECONFIG environment variable

9. **Future Enhancement**: Consider adding a "Setup Wizard" command that users can invoke later to reconfigure or see the welcome content again, even if they dismissed it permanently.
