---
feature_id: help-commands
name: Help Commands
description: Command palette commands for accessing documentation, reporting issues, and viewing keyboard shortcuts
spec_id:
  - help-commands
---

# Help Commands

## Overview

The extension provides three dedicated help commands accessible via the command palette: Open Documentation, Report Issue, and View Keyboard Shortcuts. These commands offer quick access to help resources and are available at any time during extension use.

## Behavior

```gherkin
Feature: Help Commands

Background:
  Given the kube9 extension is installed and activated
  And the user has access to the command palette

Scenario: Open documentation via command palette
  Given the user wants to view documentation
  When they open the command palette with Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
  And type "Kube9: Open Documentation"
  And select the command
  Then the default browser opens
  And navigates to "https://alto9.github.io/kube9/"
  And the documentation homepage is displayed

Scenario: Open documentation via quick menu
  Given the user clicks the help icon in the status bar
  When the help menu appears
  And they select "Documentation"
  Then the default browser opens
  And navigates to "https://alto9.github.io/kube9/"

Scenario: Report issue via command palette
  Given the user wants to report a bug or request a feature
  When they open the command palette
  And type "Kube9: Report Issue"
  And select the command
  Then the default browser opens
  And navigates to "https://github.com/alto9/kube9-vscode/issues/new"
  And the issue template is pre-filled with:
    - Section headers (Describe the issue, Steps to reproduce, Expected behavior, Environment)
    - Operating system information
    - VSCode version
    - Kube9 extension version
    - Node version
  And the user can edit the template before submitting

Scenario: Report issue via quick menu
  Given the user clicks the help icon in the status bar
  When the help menu appears
  And they select "Report Issue"
  Then GitHub opens with the pre-filled issue template

Scenario: View keyboard shortcuts via command palette
  Given the user wants to learn keyboard shortcuts
  When they open the command palette
  And type "Kube9: View Keyboard Shortcuts"
  And select the command
  Then VSCode's keyboard shortcuts editor opens
  And it is pre-filtered to show only commands containing "kube9"
  And all Kube9 commands are displayed with their current keybindings
  And the user can click any command to customize its keybinding

Scenario: View keyboard shortcuts via quick menu
  Given the user clicks the help icon in the status bar
  When the help menu appears
  And they select "Keyboard Shortcuts"
  Then VSCode's keyboard shortcuts editor opens
  And shows Kube9 commands

Scenario: Help commands work without active cluster
  Given the user has no clusters configured
  When they run any help command
  Then the command executes successfully
  And opens the appropriate help resource
  And no error messages are shown

Scenario: Help commands work offline for local operations
  Given the user has no internet connection
  When they run "Kube9: View Keyboard Shortcuts"
  Then the keyboard shortcuts editor opens normally
  And displays all Kube9 commands

Scenario: Browser opening fails gracefully
  Given the user has no default browser configured
  When they run "Kube9: Open Documentation"
  Then an error message is displayed: "Failed to open URL in browser"
  And the message suggests checking default browser settings
  And the extension continues functioning normally

Scenario: Status bar help menu shows all options
  Given the extension is activated
  When the user clicks the help icon in the status bar
  Then a quick pick menu appears with these options:
    - Documentation (with book icon)
    - Report Issue (with bug icon)
    - Keyboard Shortcuts (with keyboard icon)
    - Getting Started (with question icon)
  And each option has a descriptive subtitle
  And the menu can be dismissed with Escape

Scenario: Status bar help menu opens tutorial
  Given the user clicks the help icon in the status bar
  When the help menu appears
  And they select "Getting Started"
  Then the interactive tutorial opens
  And displays the walkthrough steps

Scenario: Help commands are searchable
  Given the user opens the command palette
  When they type "help"
  Then "Kube9: Open Documentation" appears in results
  And "Kube9: Report Issue" appears in results
  And "Kube9: View Keyboard Shortcuts" appears in results
  When they type "docs"
  Then "Kube9: Open Documentation" appears in results
  When they type "bug"
  Then "Kube9: Report Issue" appears in results

Scenario: Issue template includes system information
  Given the user runs "Kube9: Report Issue"
  When the GitHub issue page opens
  Then the body contains the user's operating system (darwin, win32, linux)
  And contains the exact VSCode version (e.g., "1.85.0")
  And contains the exact Kube9 extension version from package.json
  And contains the Node.js version
  And all information is formatted clearly

Scenario: Help commands can be invoked programmatically
  Given another extension component needs to open help
  When it calls vscode.commands.executeCommand('kube9.openDocumentation')
  Then the documentation opens in the browser
  And the command returns a Promise that resolves when complete

Scenario: Multiple help commands can be invoked in sequence
  Given the user runs "Kube9: Open Documentation"
  And the browser opens the documentation
  When they return to VSCode
  And run "Kube9: Report Issue"
  Then a second browser tab opens with GitHub
  And both tabs remain open and functional
```

## Related Features

- **help-ui-elements**: UI integration points that trigger these commands
- **interactive-tutorial**: Tutorial accessed via help menu
- **initial-configuration**: Help commands available during setup

## Implementation Notes

All help commands:
- Use VSCode's `env.openExternal` API for opening URLs
- Return Promises for async handling
- Handle errors gracefully with user-friendly messages
- Log usage for telemetry (with user consent)
- Are available regardless of extension state (cluster connected or not)

