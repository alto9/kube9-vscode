---
story_id: 026-create-css-with-vscode-theme-integration
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create CSS Styles with VS Code Theme Integration

## Objective

Create comprehensive CSS stylesheet for Events Viewer with VS Code CSS variables for automatic theme integration.

## Context

Webview must integrate seamlessly with VS Code themes (dark/light) using CSS variables.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/index.css`
- [x] Define styles for all components
- [x] Use VS Code CSS variables for colors:
  - `--vscode-editor-background`
  - `--vscode-editor-foreground`
  - `--vscode-sideBar-background`
  - `--vscode-list-activeSelectionBackground`
  - `--vscode-inputValidation-warningBackground`
  - `--vscode-inputValidation-errorBackground`
  - `--vscode-button-background`
  - `--vscode-button-foreground`
- [x] Color-code event rows by type (normal, warning, error)
- [x] Style selected row state
- [x] Style hover states
- [x] Style toolbar and buttons
- [x] Style filter pane and controls
- [x] Style table header and cells
- [x] Style details pane
- [x] Style status bar
- [x] Style resize handles
- [x] Ensure readability in both light and dark themes

## Files Affected

- **Create**: `src/webview/event-viewer/index.css`

## Implementation Notes

**Example Color Usage**:
```css
.event-viewer-app {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
}

.event-row.warning {
  background-color: var(--vscode-inputValidation-warningBackground);
}

.event-row.selected {
  background-color: var(--vscode-list-activeSelectionBackground);
}
```

**Layout**: Use flexbox for responsive three-pane layout.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Diagram: `ai/diagrams/webview/events-viewer/event-viewer-ui-layout.diagram.md`

## Estimated Time

30 minutes

