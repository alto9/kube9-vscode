---
task_id: 013-create-tutorial-visual-assets
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 7-10 hours
---

# Create Tutorial Visual Assets

## Objective

Design and create 7 high-quality PNG images for each step of the interactive tutorial, with annotations showing users what to look for and how to interact with the UI.

## Context

Each tutorial step needs a visual asset that shows users what the feature looks like in action. These images are critical for the "instructional-first" approach where users can learn even without actual clusters configured.

## Requirements

### Technical Specifications

- **Format**: PNG (NOT SVG for security reasons)
- **Resolution**: 1600x1200 pixels (2x for retina displays)
- **File Size**: < 200KB each (use PNG compression)
- **Theme**: Design for visibility in both light and dark VSCode themes
- **Annotations**: Include arrows, labels, and highlights to guide users

### Design Guidelines

- Use clear, annotated screenshots of actual UI (or mockups during development)
- Add arrows pointing to key UI elements
- Include brief text labels directly on images
- Use contrasting colors for annotations (avoid pure white/black)
- Show realistic but safe content (avoid real cluster names/sensitive data)
- Test visibility in VSCode light, dark, and high-contrast themes

## Images to Create

### 1. `media/walkthrough/01-cluster-view.png`
- Show Kube9 activity bar icon (highlighted with arrow/circle)
- Display tree view with at least one cluster
- Annotate: "Click here to open Kube9"
- Show tree structure hierarchy visually

### 2. `media/walkthrough/02-cluster-manager.png`
- Show Cluster Manager webview UI
- Highlight customization options
- Annotate key features: custom views, namespace organization
- Show example of organized view

### 3. `media/walkthrough/03-navigation.png`
- Show expanded namespace with resources visible
- Highlight the expansion arrows
- Annotate: "Expand namespaces to see resources"
- Show resource hierarchy (Pods, Deployments, Services, etc.)

### 4. `media/walkthrough/04-view-resource.png`
- Show describe webview open for a pod
- Highlight pod status, conditions, events sections
- Annotate: "Click any pod to view details"
- Show realistic pod information

### 5. `media/walkthrough/05-logs.png`
- Show pod logs webview interface
- Highlight log viewer features (search, filter)
- Show sample log output (generic, non-sensitive)
- Annotate key UI elements

### 6. `media/walkthrough/06-management.png`
- Show context menu on a deployment/workload
- Highlight scale and delete options
- Annotate: "Right-click for management options"
- Show the context menu clearly

### 7. `media/walkthrough/07-documentation.png`
- Show Command Palette with kube9 commands visible
- Include links/references to documentation
- Show multiple ways to get help
- More text-focused than other images

## Workflow

1. **Take screenshots**
   - If extension is functional, take actual screenshots
   - If not ready, create mockups in design tool
   - Capture at 2x resolution (retina)

2. **Edit in image editor** (Figma, Photoshop, GIMP, etc.)
   - Add arrows pointing to important UI elements
   - Add text labels explaining features
   - Add highlight boxes or circles around key areas
   - Use colors that work in both light and dark themes

3. **Export as PNG**
   - Export at 1600x1200
   - Ensure high quality
   - Save originals for future edits

4. **Compress**
   - Use ImageOptim, TinyPNG, pngquant, or similar
   - Target < 200KB per image
   - Verify quality after compression

5. **Test visibility**
   - Place in extension
   - Test in VSCode light theme
   - Test in VSCode dark theme
   - Test in high-contrast theme
   - Adjust if needed

6. **Create directory and add files**
   ```bash
   mkdir -p media/walkthrough
   # Copy all 7 PNG files to media/walkthrough/
   ```

## Acceptance Criteria

- [ ] All 7 PNG files created
- [ ] Each file is 1600x1200 resolution
- [ ] Each file is < 200KB
- [ ] Files stored in `media/walkthrough/` directory
- [ ] Annotations are clear and helpful
- [ ] Images are visible in light theme
- [ ] Images are visible in dark theme
- [ ] Images are visible in high-contrast theme
- [ ] Text labels are readable
- [ ] Arrows/highlights are visible
- [ ] Content is generic (no sensitive data)
- [ ] Files follow naming convention: 01-cluster-view.png through 07-documentation.png

## Files Involved

- `media/walkthrough/01-cluster-view.png`
- `media/walkthrough/02-cluster-manager.png`
- `media/walkthrough/03-navigation.png`
- `media/walkthrough/04-view-resource.png`
- `media/walkthrough/05-logs.png`
- `media/walkthrough/06-management.png`
- `media/walkthrough/07-documentation.png`

## Dependencies

- Stories 001-004 (walkthrough structure references these files)
- Functional extension UI (or design mockups)

## Notes

- This is manual design work, not code implementation
- Can be done in parallel with code stories 001-012
- Images can be placeholders initially and refined later
- Consider creating both light and dark versions if single image doesn't work
- Keep source files (PSD, Figma, etc.) for future updates
- PNG format is required for security (SVG can contain scripts)
- These images are bundled with the extension and served locally

