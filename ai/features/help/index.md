---
folder_id: help
name: Help and Documentation
description: Help resources, documentation access, and support features throughout the extension
---

# Help and Documentation

## Background

```gherkin
Background: Help System Context
  Given the kube9 VS Code extension is installed and activated
  And users may need assistance with features and troubleshooting
  When users access help resources
  Then the extension provides multiple entry points to documentation
  And help is context-sensitive based on what the user is doing
  And all documentation opens in the user's default browser
  And help resources point to alto9.github.io/kube9 documentation
  And issue reporting opens GitHub with pre-filled templates
```

## Rules

```gherkin
Rule: Help is accessible from everywhere
  Given a user needs assistance
  When they look for help
  Then they can access help via:
    - Command palette commands
    - Status bar help icon
    - Webview help buttons
    - Context menu help items
    - Error message help links
  And all entry points lead to appropriate documentation

Rule: Help is context-sensitive
  Given a user is working with a specific feature
  When they request help
  Then they receive documentation specific to that feature
  And the documentation directly addresses their current context
  And error messages link to troubleshooting for that error type

Rule: Documentation is external
  Given users access help resources
  When help content is displayed
  Then it opens in the user's default browser
  And it points to alto9.github.io/kube9 documentation
  And documentation can be updated without extension updates
  And documentation remains accessible even if extension is outdated

Rule: Issue reporting is streamlined
  Given a user wants to report a bug or request a feature
  When they use the "Report Issue" command
  Then GitHub opens with a pre-filled issue template
  And the template includes system information:
    - Operating system
    - VSCode version
    - Kube9 extension version
    - Node version
  And the user can edit the template before submitting

Rule: Keyboard shortcuts are discoverable
  Given a user wants to learn keyboard shortcuts
  When they use the "View Keyboard Shortcuts" command
  Then VSCode's keyboard shortcuts editor opens
  And it is pre-filtered to show only Kube9 commands
  And users can view and customize keybindings
```

## Integration Points

- **Command Palette**: Three dedicated help commands accessible anytime
- **Status Bar**: Persistent help icon with quick menu in bottom-right
- **Webviews**: Context-sensitive help buttons in all webview panels
- **Tree View**: Help items in resource context menus
- **Error Handler**: Error messages include "Learn More" and "Report Issue" actions
- **Welcome Screen**: Links to documentation and tutorial

## Non-Goals

- Built-in documentation viewer (opens in browser instead)
- Offline documentation (requires internet for latest docs)
- Live chat or real-time support
- Documentation authoring within extension
- Automated issue detection and reporting

