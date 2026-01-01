---
feature_id: welcome-screen
spec_id: [welcome-screen-spec, webview-spec]
actor_id: [developer]
context_id: [vscode-extension-development]
---

# Welcome Screen Feature

Note: AI Features section has been removed from the welcome screen per product direction decision.
The VS Code extension will not have AI features.

```gherkin
Feature: Welcome Screen UI/UX

Background:
  Given the kube9 VS Code extension is installed
  And this is the first time the extension is activated
  Or the user has not disabled the welcome screen

Scenario: Welcome screen displays on first activation
  Given the extension has just been activated for the first time
  When the extension finishes initializing
  Then a welcome screen webview should open
  And the welcome screen should be displayed in a new tab
  And the tab title should read "Welcome to Kube9"

Scenario: Don't Show Again control is visible at the top
  Given the welcome screen is open
  When the user views the welcome screen
  Then a "Don't show this welcome screen again" checkbox should be visible
  And the checkbox should be positioned at the top of the screen
  And the checkbox should be visible without scrolling
  And the checkbox should be located below the header
  And the checkbox should be located above all content panels

Scenario: User dismisses welcome screen permanently
  Given the welcome screen is open
  And the "Don't show this welcome screen again" checkbox is unchecked
  When the user checks the "Don't show this welcome screen again" checkbox
  And the user closes the welcome screen tab
  Then the preference should be saved to extension settings
  And the welcome screen should not appear on next activation
  When the extension is deactivated and reactivated
  Then the welcome screen should not be displayed

Scenario: User re-enables welcome screen via settings
  Given the user has previously disabled the welcome screen
  When the user opens VS Code settings
  And searches for "kube9 welcome"
  Then they should find a setting "Kube9: Show Welcome Screen"
  When they enable this setting
  And reload the VS Code window
  Then the welcome screen should appear again

Scenario: Ecosystem panel displays three core components
  Given the welcome screen is open
  When the user views the "Kube9 Ecosystem" panel
  Then the panel should display exactly 3 items
  And the first item should be "Kube9 Operator"
  And the second item should be "Kube9 VS Code"
  And the third item should be "Kube9 Desktop"
  And each item should have a brief description
  And each item should have a clickable link to its repository or documentation

Scenario: Kube9 Operator ecosystem item
  Given the welcome screen is open
  When the user views the "Kube9 Operator" item in the ecosystem panel
  Then it should display a description starting with "Kubernetes operator"
  And it should include a link to the operator documentation or repository
  When the user clicks the link
  Then it should open in their default browser

Scenario: Kube9 Desktop ecosystem item
  Given the welcome screen is open
  When the user views the "Kube9 Desktop" item in the ecosystem panel
  Then it should display a description starting with "Desktop application"
  And it should include a link to the desktop application documentation or repository
  When the user clicks the link
  Then it should open in their default browser

Scenario: Kube9 VS Code ecosystem item
  Given the welcome screen is open
  When the user views the "Kube9 VS Code" item in the ecosystem panel
  Then it should display a description starting with "VS Code extension"
  And it should indicate this is the current extension
  And it should include a link to the extension documentation or repository
  When the user clicks the link
  Then it should open in their default browser

Scenario: What is panel is removed
  Given the welcome screen is open
  When the user scrolls through the welcome screen
  Then there should be no "What is" panel
  And there should be no "What is Kube9" section
  And the Quick Start guide should appear immediately after the ecosystem panel

Scenario: Quick Start guide is prominently displayed
  Given the welcome screen is open
  When the user views the content after the ecosystem panel
  Then the Quick Start guide should be the next visible section
  And the Quick Start guide should not require scrolling to see its title
  And the Quick Start guide should be more prominent than in the previous layout

Scenario: Quick Start displays actual Kube9 activity bar icon
  Given the welcome screen is open
  When the user views the Quick Start guide step 1
  Then the text should read "Click the [ICON] icon in the VS Code activity bar"
  And the [ICON] placeholder should display the actual Kube9 activity bar icon
  And the icon should be sized appropriately (16-20px)
  And the icon should be aligned inline with the text
  And the icon should be visually recognizable as the Kube9 icon

Scenario: Quick Start displays actual icons for all steps
  Given the welcome screen is open
  When the user reads through all Quick Start guide steps
  Then any step that references a UI element with an icon should display that actual icon
  And all icons should be sized consistently
  And all icons should be aligned properly with their surrounding text
  And icons should help users visually identify what to look for

Scenario: Visit Kube9 Portal link is removed
  Given the welcome screen is open
  When the user views the entire welcome screen
  Then there should be no "Visit Kube9 Portal" link
  And there should be no "Visit Portal" button
  And there should be no portal-related links anywhere on the welcome screen

Scenario: Cluster Organizer instructions are displayed
  Given the welcome screen is open
  When the user views the content after the Quick Start guide
  Then a "Organize Your Clusters" section should be visible
  And the section should explain what the Cluster Organizer does
  And the section should list features: folders, aliases, and hiding clusters
  And the section should explain how to access it via Command Palette
  And it should show the command "Kube9: Cluster Organizer"
  And it should display keyboard shortcuts for Command Palette (Cmd+Shift+P / Ctrl+Shift+P)

Scenario: Welcome screen manual access via command palette
  Given the welcome screen has been dismissed
  And the "Don't show again" preference may or may not be set
  When the user opens the VS Code command palette
  And types "Kube9: Show Welcome"
  Then they should see the command "Kube9: Show Welcome Screen"
  When they select the command
  Then the welcome screen should open
  And it should display exactly as it would on first activation

Scenario: Welcome screen layout is responsive
  Given the welcome screen is open
  When the user resizes the VS Code window
  Then the welcome screen content should adjust responsively
  And all content should remain readable
  And the "Don't show again" checkbox should remain visible at the top
  And panels should stack vertically on narrow screens
  And panels should display side-by-side on wide screens when appropriate

Scenario: Welcome screen uses VSCode theme colors
  Given the welcome screen is open
  When the user has a dark theme active
  Then the welcome screen should use dark theme colors
  And text should have appropriate contrast for readability
  When the user switches to a light theme
  Then the welcome screen should automatically adapt to light theme colors
  And text should maintain appropriate contrast

Scenario: Icons are rendered with proper fallbacks
  Given the welcome screen is attempting to display icons
  When an icon file cannot be loaded
  Then a text fallback should be displayed
  And the text fallback should be descriptive (e.g., "[Kube9 Icon]")
  And the Quick Start guide should remain usable
  And an error should be logged to the output panel for debugging

Scenario: Welcome screen content is accessible
  Given the welcome screen is open
  When a user relies on screen readers
  Then all icons should have alt text
  And all links should have descriptive text
  And the "Don't show again" checkbox should have an associated label
  And keyboard navigation should work throughout the welcome screen
  And focus should be visually indicated when tabbing through elements
```


