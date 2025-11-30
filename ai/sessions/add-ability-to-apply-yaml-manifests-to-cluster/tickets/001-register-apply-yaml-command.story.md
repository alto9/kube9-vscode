---
story_id: 001-register-apply-yaml-command
session_id: add-ability-to-apply-yaml-manifests-to-cluster
feature_id: [apply-yaml-manifest]
spec_id: [apply-yaml-command-spec]
status: completed
priority: high
estimated_minutes: 10
---

# Register Apply YAML Command in package.json

## Objective

Add the "kube9: Apply YAML" command registration and context menu entries to `package.json` so VS Code recognizes the command and displays it in appropriate locations.

## Context

This is the first step in implementing the Apply YAML feature. The command must be registered in `package.json` before the TypeScript handler can be wired up. This follows the existing pattern used by other kube9 commands like `kube9.viewResourceYAML` and `kube9.deleteResource`.

## Implementation Steps

1. Open `package.json`
2. Add command entry to `contributes.commands` array:
   ```json
   {
     "command": "kube9.applyYAML",
     "title": "Apply YAML",
     "category": "kube9"
   }
   ```
3. Add editor context menu entry to `contributes.menus.editor/context` (create section if not exists):
   ```json
   {
     "command": "kube9.applyYAML",
     "when": "resourceExtname == .yaml || resourceExtname == .yml",
     "group": "kube9@1"
   }
   ```

## Files Affected

- `package.json` - Add command and menu registration

## Acceptance Criteria

- [x] Command `kube9.applyYAML` is registered in `contributes.commands`
- [x] Command has title "Apply YAML" and category "kube9"
- [x] Context menu entry added for editor context with YAML file filter
- [x] `when` clause correctly filters for .yaml and .yml extensions
- [x] No JSON syntax errors in package.json

## Dependencies

- None (first story in sequence)

