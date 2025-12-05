---
story_id: 001-add-activity-bar-icon
session_id: add-activity-panel-icon-and-vscode-publisher-profi
feature_id: [initial-configuration]
spec_id: [tree-view-spec, webview-spec]
status: completed
priority: high
estimated_minutes: 20
---

# Add Activity Bar Icon

## Objective

Add a kube9-branded transparent PNG icon for the activity bar entry and wire it into the extension so the button is visible and legible in light and dark themes.

## Context

The Initial Configuration feature now requires an activity bar icon (`24x24 px` with safe padding) that ships with the extension assets and is referenced by the kube9 activity view container. This ensures the activity bar button is visible and on-brand.

## Implementation Steps

1. Create or place the activity bar icon asset (transparent PNG, 24x24 px with padding) under an icons/assets folder (e.g., `src/assets/icons/kube9-activity.png`).
2. Keep icon single-color and centered per VS Code activity bar icon guidance (24x24 canvas, centered; states rely on VS Code opacity changes [docs](https://code.visualstudio.com/api/references/contribution-points#Icon-specifications)).
3. Update `package.json` `contributes.viewsContainers.activitybar` entry for the kube9 container to reference the icon path.
4. Ensure build/packaging includes the icon in the VSIX (webpack/copy assets config if applicable).
5. Verify icon contrast/visibility in both light and dark VS Code themes.
6. Confirm the activity bar icon remains a PNG (no SVG) to satisfy marketplace publishing rules ([publishing guidance](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)).

## Files Affected

- `package.json` — reference the activity bar icon for the kube9 view container
- `src/assets/icons/kube9-activity.png` (new) — activity bar PNG asset
- `webpack.config.js` or asset copy pipeline — ensure PNG is packaged

## Acceptance Criteria

- [ ] Activity bar icon is a transparent PNG sized 24x24 px with padding
- [ ] Icon is single-color and centered to meet activity bar icon spec expectations
- [ ] Icon format complies with marketplace publishing rules (PNG, not SVG)
- [ ] Icon is referenced by the kube9 activity view container in `package.json`
- [ ] Icon is included in the packaged VSIX/build artifacts
- [ ] Icon remains legible in both light and dark themes
- [ ] No regressions to existing activity bar behavior or tree view loading

## Dependencies

- None

