---
story_id: add-webview-styling
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-application-webview]
spec_id: [argocd-webview-spec]
status: pending
priority: medium
estimated_minutes: 25
---

# Add Webview CSS Styling and Theme Integration

## Objective

Create CSS styles for the webview that integrate with VS Code theme variables and provide responsive design.

## Context

The webview needs comprehensive styling that respects VS Code theme (dark/light mode) and provides good visual hierarchy and responsive layout.

## Implementation Steps

1. Create `src/webview/argocd-application/styles.css` file
2. Define CSS variables using VS Code theme tokens
3. Style tab bar component
4. Style status badges (synced=green, out-of-sync=yellow, etc.)
5. Style metadata sections with grid layout
6. Style resource table with borders and hover effects
7. Style action buttons with primary/secondary variants
8. Add responsive breakpoints for mobile/small screens
9. Style out-of-sync warning background
10. Style loading and error states
11. Ensure accessibility (focus states, contrast ratios)

## Files Affected

- `src/webview/argocd-application/styles.css` - Create stylesheet

## Acceptance Criteria

- [ ] Styles use VS Code theme variables
- [ ] Light and dark themes work correctly
- [ ] Status badges have appropriate colors
- [ ] Tables are readable and well-spaced
- [ ] Buttons have hover and focus states
- [ ] Responsive design works on smaller screens
- [ ] Out-of-sync items visually distinct
- [ ] Loading spinner styled appropriately

## Dependencies

- 012-implement-overview-tab-components (needs components to style)
- 013-implement-drift-details-tab (needs components to style)

