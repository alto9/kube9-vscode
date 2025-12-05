---
task_id: 002-upload-publisher-icon
session_id: add-activity-panel-icon-and-vscode-publisher-profi
feature_id: [initial-configuration]
spec_id: []
status: completed
priority: medium
estimated_minutes: 15
---

# Upload Marketplace Publisher Icon

## Objective

Prepare and publish the kube9 publisher profile PNG icon (transparent, square ≥128x128) so the VS Code Marketplace listing shows the correct branding.

## Steps

1. Produce/export the publisher icon as a transparent PNG, square aspect ratio, at least 128x128 (recommend 256x256) matching the activity bar branding.
2. Save the asset in the repo for traceability (e.g., `assets/marketplace/publisher-icon.png`).
3. Upload the PNG to the VS Code Marketplace publisher profile via the marketplace portal.
4. Verify the kube9 extension page shows the new publisher icon after propagation.
5. Confirm the uploaded icon follows marketplace publishing rules (no SVGs for user-provided icons) per [publishing guidance](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Acceptance Criteria

- [ ] PNG icon is transparent, square (≥128x128), and on-brand with the activity bar icon
- [ ] Repository contains the exported PNG at a documented path
- [ ] Publisher profile in the VS Code Marketplace displays the new icon
- [ ] kube9 extension listing reflects the updated publisher icon
- [ ] Marketplace upload complies with VS Code publishing rules (no SVGs)

