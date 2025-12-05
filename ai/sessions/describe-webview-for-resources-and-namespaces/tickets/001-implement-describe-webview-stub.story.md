---
story_id: 001-implement-describe-webview-stub
session_id: describe-webview-for-resources-and-namespaces
feature_id: [describe-webview]
spec_id: [webview-spec]
status: completed
priority: high
estimated_minutes: 20
---

# Implement shared Describe webview stub (left-click + right-click Describe)

## Objective

Add a shared Describe webview that opens for both left-click and the right-click “Describe” command on describable tree items, showing stub content (title with kind/name and a “Coming soon” message) and reusing a single panel instance.

## Context

This is the minimal shell for the Describe experience. It must wire tree item activation (left-click) and the context menu Describe command to open/reveal one shared panel, set the title to `<Kind> / <name>`, and display the stub body while we build full layouts later.

## Implementation Steps

1. Ensure tree item activation for describable resources triggers the Describe flow and opens/reveals a single shared panel instance.
2. Wire the right-click “Describe” command to the same shared panel (no duplicate panels).
3. Set the panel title to include resource kind and name (e.g., “Deployment / api-server”).
4. Render stub body content: header + “Coming soon” message; include only close/refresh basics.
5. Reuse the panel for subsequent Describe actions (left or right click) by updating title and stub content instead of creating new panels.

## Files Affected

- `src` (commands/tree handling for Describe) — wire activation/context command to shared panel
- `src` (webview implementation) — add stub HTML/content and reuse logic

## Acceptance Criteria

- [x] Left-click on a describable tree item opens/reveals one shared Describe panel.
- [x] Right-click "Describe" opens/reveals the same panel (no additional panels).
- [x] Panel title includes resource kind and name (e.g., "Deployment / api-server").
- [x] Panel body shows stub "Coming soon" message with only close/refresh controls.
- [x] Subsequent Describe actions reuse the same panel and update title/content.
- [x] No JSON/TS lint errors introduced.

