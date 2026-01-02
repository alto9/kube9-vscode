---
story_id: 011-add-start-tutorial-button-to-welcome
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
  - initial-configuration
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 25 minutes
---

# Add Start Tutorial Button to Welcome Screen

## Objective

Add a prominent "Start Tutorial" button to the existing welcome screen webview that will launch the interactive tutorial.

## Context

The welcome screen is the first thing users see when they install the extension. We want to provide a clear, prominent entry point to the interactive tutorial from this screen.

## Implementation

### Find the Welcome Screen HTML

Locate the welcome screen webview HTML file (likely in `src/webview/` or similar). Add a tutorial button:

```html
<!-- In the welcome screen HTML -->
<div class="welcome-actions">
  <button id="startTutorial" class="primary-button">
    <span class="icon">📚</span>
    Start Interactive Tutorial
  </button>
  <button id="getStarted" class="secondary-button">
    Explore on My Own
  </button>
</div>
```

### Add Button Click Handler

In the welcome screen's webview script (likely inline or separate JS file):

```javascript
// Add event listener for tutorial button
document.getElementById('startTutorial')?.addEventListener('click', () => {
  // Send message to extension
  vscode.postMessage({ command: 'startTutorial' });
});
```

### Style the Button

Ensure the button is visually prominent:

```css
.welcome-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.primary-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  /* Colors will use VSCode theme variables */
}

.primary-button .icon {
  font-size: 16px;
}
```

## Acceptance Criteria

- [ ] "Start Tutorial" button added to welcome screen
- [ ] Button is visually prominent (primary style)
- [ ] Button includes icon (📚 or similar)
- [ ] Button has click event listener
- [ ] Clicking button sends 'startTutorial' message to extension
- [ ] Button is keyboard accessible (tab navigation)
- [ ] Button respects VSCode theme (light/dark mode)
- [ ] Button has appropriate hover/focus states
- [ ] "Explore on My Own" button remains as secondary option

## Testing

1. Fresh install or reset welcome screen state
2. Open welcome screen
3. Verify "Start Tutorial" button is visible and prominent
4. Verify button styling matches VSCode theme
5. Click button and verify message is sent (check next story for handling)
6. Test keyboard navigation (Tab to button, Enter to click)
7. Test in both light and dark themes
8. Verify button doesn't break existing welcome screen functionality

## Files Involved

- Welcome screen HTML file (likely `src/webview/welcome/index.html` or similar)
- Welcome screen CSS/styles
- Welcome screen JavaScript/TypeScript

## Dependencies

- Story 005 (show tutorial command must exist to handle the message)
- Existing welcome screen implementation

## Notes

- The exact file paths depend on how welcome screen is currently implemented
- If welcome screen uses React or other framework, adapt accordingly
- The message handler will be implemented in story 012
- Button should work even if tutorial hasn't been configured yet (graceful degradation)
- Consider adding a tooltip or aria-label for accessibility
- The "Explore on My Own" button provides an alternative path as specified in the feature

