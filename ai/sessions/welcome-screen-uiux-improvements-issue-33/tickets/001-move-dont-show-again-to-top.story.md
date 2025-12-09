---
story_id: move-dont-show-again-to-top
session_id: welcome-screen-uiux-improvements-issue-33
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
status: pending
priority: high
estimated_time: 15min
---

# Move "Don't Show Again" Checkbox to Top

## Objective

Relocate the "Don't show this welcome screen again" checkbox from the footer (bottom of page) to immediately below the header section, making it visible without scrolling.

## Context

**GitHub Issue**: #33.1

Currently, the checkbox is located at the bottom of the welcome screen in the footer section (lines 537-542 in welcome.html). Users must scroll to find it, which is poor UX for a dismissal control that should be immediately accessible.

## Acceptance Criteria

- [ ] Checkbox is moved from footer section to immediately after header section
- [ ] Checkbox is positioned above all content panels (ecosystem, quick start, etc.)
- [ ] Checkbox is visible without scrolling when welcome screen opens
- [ ] Checkbox styling and functionality remain unchanged
- [ ] Checkbox label text remains: "Don't show this welcome screen again"
- [ ] Checkbox continues to send the same message to extension on change

## Implementation Steps

1. **Remove checkbox from footer** (lines 537-542 in `src/webview/welcome.html`):
   - Delete the entire `.footer` div containing the checkbox

2. **Add new section after header** (insert after line 465, just after closing `</div>` of `.header`):
   ```html
   <div class="dont-show-container">
       <label>
           <input type="checkbox" id="doNotShowAgain" aria-label="Don't show this welcome screen again" />
           <span>Don't show this welcome screen again</span>
       </label>
   </div>
   ```

3. **Add CSS styling** for the new container (add to `<style>` section around line 343):
   ```css
   .dont-show-container {
       padding: 16px 24px;
       margin-bottom: 24px;
       background-color: var(--vscode-editor-background);
       border-bottom: 1px solid var(--vscode-widget-border);
       display: flex;
       align-items: center;
       justify-content: center;
   }

   .dont-show-container label {
       display: flex;
       align-items: center;
       cursor: pointer;
       font-size: 14px;
       color: var(--vscode-descriptionForeground);
       user-select: none;
   }

   .dont-show-container label:hover {
       color: var(--vscode-foreground);
   }

   .dont-show-container input[type="checkbox"] {
       appearance: none;
       -webkit-appearance: none;
       width: 18px;
       height: 18px;
       border: 1px solid var(--vscode-checkbox-border);
       background-color: var(--vscode-checkbox-background);
       border-radius: 3px;
       margin-right: 10px;
       cursor: pointer;
       position: relative;
       flex-shrink: 0;
       transition: background-color 0.1s ease, border-color 0.1s ease;
   }

   .dont-show-container input[type="checkbox"]:hover {
       border-color: var(--vscode-focusBorder);
   }

   .dont-show-container input[type="checkbox"]:focus {
       outline: 1px solid var(--vscode-focusBorder);
       outline-offset: 2px;
   }

   .dont-show-container input[type="checkbox"]:checked {
       background-color: var(--vscode-checkbox-background);
       border-color: var(--vscode-focusBorder);
   }

   .dont-show-container input[type="checkbox"]:checked::before {
       content: "";
       position: absolute;
       left: 5px;
       top: 2px;
       width: 5px;
       height: 9px;
       border: solid var(--vscode-checkbox-foreground);
       border-width: 0 2px 2px 0;
       transform: rotate(45deg);
   }
   ```

4. **Update JavaScript** (around line 564):
   - The existing `dismiss()` function already references `doNotShowAgain` by ID, so no change needed
   - JavaScript continues to work as-is since the checkbox ID remains the same

## Files Modified

- `src/webview/welcome.html` (HTML structure and CSS)

## Testing Checklist

- [ ] Open welcome screen - checkbox is immediately visible at top
- [ ] Checkbox is positioned below header, above all content panels
- [ ] No scrolling required to see checkbox
- [ ] Checking checkbox and closing webview saves preference
- [ ] Re-opening VS Code does not show welcome screen if checkbox was checked
- [ ] Checkbox styling matches VSCode theme (light and dark)
- [ ] Keyboard navigation works (tab to checkbox, space to toggle)
- [ ] Screen reader announces checkbox label correctly

## Related Scenarios

From `welcome-screen.feature.md`:
- "Don't Show Again control is visible at the top"
- "User dismisses welcome screen permanently"

## Notes

- This is a purely visual/structural change
- No TypeScript changes required
- The message handler in `WelcomeWebview.ts` continues to work unchanged
- Keep existing checkbox functionality (sends 'dismiss' message with doNotShowAgain flag)

