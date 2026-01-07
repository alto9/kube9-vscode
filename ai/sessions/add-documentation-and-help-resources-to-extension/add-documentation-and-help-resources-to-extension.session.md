---
session_id: add-documentation-and-help-resources-to-extension
start_time: '2026-01-04T13:55:29.281Z'
status: completed
problem_statement: Add documentation and help resources to extension
changed_files:
  - path: ai/features/help/help-commands.feature.md
    change_type: added
    scenarios_added:
      - Open documentation via command palette
      - Open documentation via quick menu
      - Report issue via command palette
      - Report issue via quick menu
      - View keyboard shortcuts via command palette
      - View keyboard shortcuts via quick menu
      - Help commands work without active cluster
      - Help commands work offline for local operations
      - Browser opening fails gracefully
      - Status bar help menu shows all options
      - Status bar help menu opens tutorial
      - Help commands are searchable
      - Issue template includes system information
      - Help commands can be invoked programmatically
      - Multiple help commands can be invoked in sequence
  - path: ai/features/help/help-ui-elements.feature.md
    change_type: added
    scenarios_added:
      - Status bar displays help icon
      - Status bar help icon is clickable
      - Status bar help icon is keyboard accessible
      - Webview includes help button
      - Events Viewer help button opens specific documentation
      - Pod Logs help button opens specific documentation
      - Cluster Manager help button opens specific documentation
      - YAML Editor help button opens specific documentation
      - Describe Webview help button opens specific documentation
      - Webview help button has hover state
      - Webview help button is keyboard accessible
      - Context menu shows help for pods
      - Context menu shows help for deployments
      - Context menu shows help for services
      - Error message includes "Learn More" link
      - Error "Learn More" opens troubleshooting documentation
      - Kubeconfig error links to specific troubleshooting
      - RBAC error links to permissions documentation
      - Operator error links to operator documentation
      - Timeout error links to timeout troubleshooting
      - Resource not found error links to resource documentation
      - Error "Report Issue" opens GitHub with error details
      - Unknown error codes link to general troubleshooting
      - Webview help button matches VSCode theme
      - Status bar help icon persists across sessions
      - Help UI elements work without active cluster
      - Multiple webviews show independent help buttons
      - Help buttons are visually consistent
      - Error help links are accessible
start_commit: 2978d91a662a4db0acaf5fb806b57124d3fdc5fc
end_time: '2026-01-04T14:01:11.610Z'
---
## Problem Statement

Add documentation and help resources to extension

## Goals

- Provide multiple discoverable entry points for users to access help
- Make help context-sensitive based on what user is doing
- Integrate help throughout the UI (status bar, webviews, context menus, errors)
- Streamline issue reporting with pre-filled templates including system info
- Make keyboard shortcuts discoverable and customizable

## Approach

Following Forge's diagram-first approach:

1. **Created diagrams first** to visualize the help system:
   - `help-system-architecture.diagram.md` - Shows all help entry points and how they connect
   - `help-access-flow.diagram.md` - Shows user flow for accessing help resources

2. **Derived specs from diagrams**:
   - `help-commands.spec.md` - Technical implementation of help commands
   - `help-ui-integration.spec.md` - Technical implementation of UI help elements

3. **Created features with Gherkin scenarios**:
   - `help/index.md` - Background and rules for help system
   - `help-commands.feature.md` - Command palette commands (15 scenarios)
   - `help-ui-elements.feature.md` - UI integration points (27 scenarios)

## Key Decisions

**External Documentation Only**
- All help content opens in user's default browser
- Points to alto9.github.io/kube9 documentation
- Allows documentation updates without extension updates
- No built-in documentation viewer or offline docs

**Context-Sensitive Help**
- Each webview has specific documentation URL
- Error codes map to specific troubleshooting pages
- Context menus show help for specific resource types
- Fallback to general docs for unknown contexts

**Multiple Entry Points**
- Status bar: Persistent help icon with quick menu (always visible)
- Command palette: Three dedicated commands (Open Docs, Report Issue, Shortcuts)
- Webviews: Help buttons in top-right corner (context-specific)
- Context menus: Help items for resource types (bottom of menu)
- Error messages: "Learn More" and "Report Issue" buttons (error-specific)

**Streamlined Issue Reporting**
- GitHub opens with pre-filled template
- Includes system information automatically (OS, VSCode version, extension version, Node version)
- User can edit before submitting
- Template has clear sections: Description, Steps, Expected behavior, Environment

**Keyboard Shortcuts Integration**
- Opens VSCode's native keyboard shortcuts editor
- Pre-filtered to show only Kube9 commands
- Allows users to view and customize all keybindings
- No custom shortcuts viewer needed

## Notes

**Implementation Priority**
1. Help commands (foundational, used by all other entry points)
2. Status bar help icon (most visible entry point)
3. Error message integration (helps users when they're stuck)
4. Webview help buttons (context-specific assistance)
5. Context menu items (resource-specific help)

**Documentation Structure Requirements**
The extension assumes this documentation structure on alto9.github.io/kube9:
- `/` - Homepage
- `/features/events-viewer/` - Events Viewer docs
- `/features/pod-logs/` - Pod Logs docs
- `/features/cluster-manager/` - Cluster Manager docs
- `/features/yaml-editor/` - YAML Editor docs
- `/features/describe-view/` - Describe View docs
- `/resources/pods/` - Pod resource docs
- `/resources/deployments/` - Deployment resource docs
- `/resources/services/` - Service resource docs
- `/troubleshooting/` - General troubleshooting
- `/troubleshooting/kubeconfig/` - Kubeconfig troubleshooting
- `/troubleshooting/connection/` - Connection troubleshooting
- `/troubleshooting/permissions/` - RBAC permissions troubleshooting
- `/troubleshooting/operator/` - Operator troubleshooting
- `/troubleshooting/timeout/` - Timeout troubleshooting
- `/troubleshooting/resources/` - Resource troubleshooting

**Accessibility Considerations**
- All help UI elements are keyboard accessible
- Status bar icon: Tab navigation, Enter/Space to activate
- Webview help buttons: Focusable with proper ARIA labels
- Context menu items: Standard VSCode keyboard navigation
- Error dialogs: Keyboard navigable action buttons
- Screen reader friendly with descriptive labels

**Testing Notes**
- Mock `vscode.env.openExternal` for unit tests
- Verify correct URLs for all contexts
- Test error code mapping to documentation URLs
- Verify issue template generation with system info
- Test keyboard navigation for all help UI elements
