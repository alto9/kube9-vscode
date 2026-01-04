---
story_id: 009-add-help-button-to-webview-templates
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: pending
estimated_minutes: 20
---

# Add Help Button to Webview Templates

## Objective

Integrate the help button component into all webview HTML templates with the correct help context for each webview type.

## Context

Each webview needs the help button with its specific context: 'events-viewer', 'pod-logs', 'cluster-manager', 'yaml-editor', or 'describe-webview'.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios for each webview type)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Webview Template section)

## Implementation

For each webview template, add the help button and set the context:

**Events Viewer** (`src/webview/eventsViewer.html`):
```html
<body data-help-context="events-viewer">
  <!-- Include help button component -->
  <!-- ... rest of webview content ... -->
</body>
```

**Pod Logs** (`src/webview/podLogs.html`):
```html
<body data-help-context="pod-logs">
  <!-- Include help button component -->
  <!-- ... rest of webview content ... -->
</body>
```

**Cluster Manager** (`src/webview/clusterManager.html`):
```html
<body data-help-context="cluster-manager">
  <!-- Include help button component -->
  <!-- ... rest of webview content ... -->
</body>
```

**YAML Editor** (`src/webview/yamlEditor.html`):
```html
<body data-help-context="yaml-editor">
  <!-- Include help button component -->
  <!-- ... rest of webview content ... -->
</body>
```

**Describe Webview** (`src/webview/describeWebview.html`):
```html
<body data-help-context="describe-webview">
  <!-- Include help button component -->
  <!-- ... rest of webview content ... -->
</body>
```

Each template should:
1. Add `data-help-context` attribute to body
2. Include help-button.css stylesheet
3. Include help-button.html component
4. Include help-button.js script

## Files to Modify

- **UPDATE**: `src/webview/eventsViewer.html` - Add help button with context 'events-viewer'
- **UPDATE**: `src/webview/podLogs.html` - Add help button with context 'pod-logs'
- **UPDATE**: `src/webview/clusterManager.html` - Add help button with context 'cluster-manager'
- **UPDATE**: `src/webview/yamlEditor.html` - Add help button with context 'yaml-editor'
- **UPDATE**: `src/webview/describeWebview.html` - Add help button with context 'describe-webview'

## Acceptance Criteria

- [ ] All five webviews have help button in top-right corner
- [ ] Each webview has correct data-help-context attribute
- [ ] Help buttons visually consistent across all webviews
- [ ] Clicking help in Events Viewer opens events-viewer docs
- [ ] Clicking help in Pod Logs opens pod-logs docs
- [ ] Clicking help in Cluster Manager opens cluster-manager docs
- [ ] Clicking help in YAML Editor opens yaml-editor docs
- [ ] Clicking help in Describe Webview opens describe-view docs

## Testing Notes

Manual verification for each webview:
- Open webview
- Verify help button appears in top-right corner
- Click help button
- Verify correct documentation page opens in browser
- Test in both light and dark themes
- Test keyboard navigation (Tab to button, Enter to activate)

