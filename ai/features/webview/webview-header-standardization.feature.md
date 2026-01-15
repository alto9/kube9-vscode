---
feature_id: webview-header-standardization
name: Webview Header Standardization
description: Standardized header component for all webviews with consistent title, actions menu, and integrated help button
spec_id:
  - webview-header-component
---

# Webview Header Standardization

## Overview

All webviews now use a standardized header component that provides consistent styling, title display, actions menu, and optional help button integration. This replaces the previous approach where each webview had its own header implementation and help buttons were injected separately.

## Behavior

```gherkin
Feature: Webview Header Standardization

Background:
  Given the kube9 extension is installed and activated
  And webviews use the standardized WebviewHeader component

Scenario: All webviews display standardized header
  Given any webview is open (Events Viewer, Pod Logs, Helm Package Manager, etc.)
  Then a header appears at the top of the webview
  And displays the webview title on the left side
  And displays action buttons on the right side
  And uses consistent styling across all webviews
  And matches VSCode theme (dark/light)

Scenario: Header displays title correctly
  Given a webview is open
  Then the header displays the appropriate title
  Examples:
    | Webview | Title |
    | Events Viewer | "Events Viewer" |
    | Pod Logs | "Pod Logs: <pod-name> (<container>)" |
    | Helm Package Manager | "Helm Package Manager" |
    | Pod Describe | "Pod / <pod-name>" |
    | ArgoCD Application | "ArgoCD: <app-name>" |

Scenario: Header displays action buttons
  Given a webview is open with actions
  Then action buttons appear in the header actions menu
  And each button has an icon and label
  And buttons are properly spaced
  And buttons use consistent styling

Scenario: Help button appears when context provided
  Given a webview is open with help context
  Then a help button appears in the header actions menu
  And displays a question mark icon
  And displays "Help" text
  And matches the styling of other action buttons

Scenario: Help button does not appear without context
  Given a webview is open without help context
  Then no help button appears in the header

Scenario: Header actions are clickable
  Given a webview is open with action buttons
  When the user clicks an action button
  Then the corresponding action is executed
  And the button provides visual feedback

Scenario: Header actions can be disabled
  Given a webview is open with action buttons
  When an action is disabled
  Then the button appears grayed out
  And clicking the button has no effect

Scenario: Header is keyboard accessible
  Given a webview is open
  When the user presses Tab to navigate
  Then focus moves through header action buttons
  And focus indicators are visible
  When they press Enter or Space on a focused button
  Then the action is executed

Scenario: Header matches VSCode theme
  Given VSCode is using a dark theme
  When a webview opens
  Then the header uses dark theme colors
  And text is readable against the background
  When the user switches to a light theme
  Then the header colors update automatically
  And remain readable

Scenario: Header is responsive
  Given a webview is open
  When the panel width is reduced
  Then the header adapts appropriately
  And action buttons wrap if needed
  And the title remains visible

Scenario: All webviews use same header component
  Given multiple webviews are open
  Then all headers:
    - Use the same component (WebviewHeader)
    - Have consistent styling
    - Follow the same layout (title left, actions right)
    - Use the same CSS classes
    - Match VSCode design patterns
```

## Related Features

- **help-ui-elements**: Help button integration in header
- **events-viewer**: Uses WebviewHeader
- **pod-logs-viewer**: Uses WebviewHeader
- **helm-package-manager**: Uses WebviewHeader
- **pod-describe-webview**: Uses WebviewHeader
- **argocd-application**: Uses WebviewHeader

## Implementation Notes

### Component Location

The standardized header component is located at:
- `src/webview/components/WebviewHeader.tsx`
- `src/webview/styles/webview-header.css`

### Usage Pattern

All webviews import and use the WebviewHeader component:

```typescript
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';

const headerActions: WebviewHeaderAction[] = [
  {
    label: 'Refresh',
    icon: 'codicon-refresh',
    onClick: handleRefresh
  }
];

<WebviewHeader
  title="My Webview"
  actions={headerActions}
  helpContext="my-webview"
/>
```

### Help Button Integration

The help button is automatically included in the header when `helpContext` prop is provided. It uses the same styling as other action buttons and posts messages using the standard `openHelp` message type.

### Migration from Old Approach

Previously, help buttons were injected via HTML templates, CSS, and JS files. This approach has been replaced with the integrated header component. Old files have been removed:
- `src/webview/templates/help-button.html` (deleted)
- `src/webview/styles/help-button.css` (deleted)
- `src/webview/scripts/help-button.js` (deleted)
