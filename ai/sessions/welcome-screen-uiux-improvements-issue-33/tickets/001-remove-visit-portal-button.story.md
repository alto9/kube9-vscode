---
story_id: remove-visit-portal-button
session_id: welcome-screen-uiux-improvements-issue-33
feature_id: [welcome-screen]
spec_id: [welcome-screen-spec]
status: pending
priority: low
estimated_time: 5min
---

# Remove "Visit Kube9 Portal" Button

## Objective

Remove the "Visit Kube9 Portal" button and related functionality from the welcome screen, as it's no longer relevant to the current Kube9 ecosystem.

## Context

**GitHub Issue**: #33.5

The welcome screen currently has a "Visit Kube9 Portal" button (line 532) in the "Coming Soon: AI-Powered Features" section. This button and its associated JavaScript function should be removed.

This is a simple cleanup task to remove outdated content.

## Acceptance Criteria

- [ ] "Visit Kube9 Portal" button is completely removed from HTML
- [ ] "Visit Portal" button is not visible anywhere on welcome screen
- [ ] `openPortal()` JavaScript function is removed
- [ ] No portal-related links remain
- [ ] "View Documentation" button remains (keep the secondary button)

## Implementation Steps

1. **Remove button from HTML** (line 532 in `src/webview/welcome.html`):
   
   In the "Coming Soon: AI-Powered Features" section, remove this button:
   ```html
   <button class="link-button" onclick="openPortal()">Visit Kube9 Portal</button>
   ```
   
   Keep the "View Documentation" button:
   ```html
   <button class="link-button secondary" onclick="openDocs()">View Documentation</button>
   ```

2. **Remove JavaScript function** (lines 548-550 in `src/webview/welcome.html`):
   
   Delete the entire `openPortal()` function:
   ```javascript
   function openPortal() {
       openExternal('https://app.kube9.io');
   }
   ```

3. **Remove message handler in WelcomeWebview.ts** (lines 62-65):
   
   Delete this case from the message handler:
   ```typescript
   case 'openPortal':
       // Open the kube9 website in external browser
       vscode.env.openExternal(vscode.Uri.parse('https://kube9.io'));
       break;
   ```

4. **Verify no other references**:
   - Search for "portal" (case-insensitive) in both files
   - Ensure no other references to portal remain

## Files Modified

- `src/webview/welcome.html` (remove button HTML and JavaScript function)
- `src/webview/WelcomeWebview.ts` (remove message handler case)

## Testing Checklist

- [ ] Welcome screen opens without "Visit Kube9 Portal" button
- [ ] No "Visit Portal" button visible anywhere
- [ ] "View Documentation" button still present and works
- [ ] No JavaScript errors in console
- [ ] No broken onclick handlers
- [ ] Clicking "View Documentation" still opens documentation in browser

## Related Scenarios

From `welcome-screen.feature.md`:
- "Visit Kube9 Portal link is removed"

## Notes

- This is a simple deletion story
- Keep the "View Documentation" button as it remains useful
- The `openDocs()` function should remain unchanged
- The `openExternal()` function is still used by other links and should NOT be removed
- This change reduces confusion about portal vs. other Kube9 products

