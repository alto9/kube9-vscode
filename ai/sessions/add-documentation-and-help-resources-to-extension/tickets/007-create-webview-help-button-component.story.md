---
story_id: 007-create-webview-help-button-component
session_id: add-documentation-and-help-resources-to-extension
feature_id:
  - help-ui-elements
spec_id:
  - help-ui-integration
status: superseded
estimated_minutes: 20
---

**Note**: This implementation has been superseded by the standardized WebviewHeader component approach. Help buttons are now integrated into the header component rather than being injected separately. See `ai/features/webview/webview-header-standardization.feature.md` for the current implementation.

# Create Webview Help Button Component

## Objective

Create a reusable help button HTML/CSS component that can be added to all webviews with proper styling and theme integration.

## Context

All webviews (Events Viewer, Pod Logs, Cluster Manager, YAML Editor, Describe Webview) need a consistent help button in the top-right corner that opens context-specific documentation.

See:
- Feature: `ai/features/help/help-ui-elements.feature.md` (scenarios: Webview includes help button, Webview help button has hover state, Webview help button is keyboard accessible, Webview help button matches VSCode theme, Help buttons are visually consistent)
- Spec: `ai/specs/help/help-ui-integration.spec.md` (Webview Help Integration section)

## Implementation

Create `src/webview/templates/help-button.html`:

```html
<button 
  class="help-button" 
  onclick="openHelp()"
  aria-label="Open help documentation"
  tabindex="0"
>
  <span class="codicon codicon-question"></span>
  Help
</button>
```

Create `src/webview/styles/help-button.css`:

```css
.help-button {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  transition: background-color 0.1s ease;
  z-index: 100;
}

.help-button:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.help-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.help-button .codicon {
  font-size: 16px;
}
```

Create `src/webview/scripts/help-button.js`:

```javascript
const vscode = acquireVsCodeApi();

function openHelp() {
  const helpContext = document.body.dataset.helpContext || 'default';
  vscode.postMessage({
    type: 'openHelp',
    context: helpContext
  });
}
```

## Files to Modify

- **CREATE**: `src/webview/templates/help-button.html`
- **CREATE**: `src/webview/styles/help-button.css`
- **CREATE**: `src/webview/scripts/help-button.js`

## Acceptance Criteria

- [ ] HTML template includes button with codicon icon
- [ ] Button has proper ARIA label for accessibility
- [ ] CSS positions button in top-right corner (absolute positioning)
- [ ] Uses VSCode CSS variables for theming
- [ ] Hover state changes background color
- [ ] Focus state shows outline
- [ ] Button is keyboard accessible (tabindex="0")
- [ ] JavaScript posts message to extension with context
- [ ] Help context read from data-help-context attribute on body

## Testing Notes

Manual verification in any webview:
- Help button appears in top-right corner
- Matches VSCode theme (dark/light)
- Hover shows visual feedback
- Tab navigation reaches button
- Focus shows outline indicator
- Clicking posts 'openHelp' message

