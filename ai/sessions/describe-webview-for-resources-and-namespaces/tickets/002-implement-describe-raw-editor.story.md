---
story_id: 002-implement-describe-raw-editor
session_id: describe-webview-for-resources-and-namespaces
feature_id: [describe-webview]
spec_id: [webview-spec]
status: completed
priority: high
estimated_minutes: 20
---

# Implement Describe (Raw) read-only editor with full describe output

## Objective

Add the right-click “Describe (Raw)” command to open a new read-only text editor tab containing the full kubectl describe output for the selected resource, titled with the resource name and `.describe`.

## Context

Raw describe should not be stubbed. It should return the actual kubectl describe text for the resource the user clicked. The editor must be read-only and should not spawn multiple tabs for the same invoke unless desired by VS Code defaults.

## Implementation Steps

1. Add the “Describe (Raw)” context menu command for describable resources (if not already registered).
2. On invoke, gather the selected resource kind/name/namespace/context and execute kubectl describe to obtain full text.
3. Open a new read-only text document tab with title including the resource name and suffix `.describe`.
4. Write the full describe output into the document; no stub/placeholder content.
5. Handle errors gracefully (show a notification and do not leave empty tabs).

## Files Affected

- `package.json` (if command contribution needed)
- `src` (command handler for Describe (Raw))

## Acceptance Criteria

- [x] Right-click "Describe (Raw)" appears for describable resources.
- [x] Invoking it opens a read-only text editor tab titled with resource name + `.describe`.
- [x] Tab contains the full kubectl describe output for the selected resource.
- [x] Errors are surfaced to the user; no empty tabs on failure.
- [x] No JSON/TS lint errors introduced.

