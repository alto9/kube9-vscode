---
story_id: 010-add-json-syntax-highlighting
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-ui
spec_id:
  - pod-logs-ui-spec
status: pending
---

# Add JSON Syntax Highlighting to LogDisplay

## Objective

Add JSON detection and syntax highlighting to log lines that contain valid JSON.

## Context

Many modern applications log in JSON format. Highlighting JSON makes logs more readable by coloring keys, strings, numbers, etc.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md` - JSON syntax highlighting scenario
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - JSON Syntax Highlighting section

## Files to Create/Modify

- `src/webview/pod-logs/components/LogDisplay.tsx` (modify - add highlightJSON function)
- `src/webview/pod-logs/styles.css` (modify - add JSON color classes)

## Implementation Steps

1. Create `highlightJSON()` function in LogDisplay:
   ```typescript
   function highlightJSON(content: string): React.ReactNode {
     try {
       const parsed = JSON.parse(content);
       // Return formatted JSON with syntax highlighting
       return <span className="json">{JSON.stringify(parsed, null, 2)}</span>;
     } catch {
       return content; // Not JSON, return plain text
     }
   }
   ```
2. Apply to log line content in Row component
3. Add CSS classes for JSON syntax:
   ```css
   .json-key { color: var(--vscode-symbolIcon-keywordForeground); }
   .json-string { color: var(--vscode-symbolIcon-stringForeground); }
   .json-number { color: var(--vscode-symbolIcon-numberForeground); }
   .json-boolean { color: var(--vscode-symbolIcon-booleanForeground); }
   .json-null { color: var(--vscode-editorLineNumber-foreground); }
   ```
4. Use VS Code theme variables for colors
5. Handle multi-line JSON gracefully

## Acceptance Criteria

- [ ] JSON log lines are detected
- [ ] JSON is syntax highlighted with colors:
  - Keys: blue
  - Strings: green
  - Numbers: orange
  - Booleans: purple
  - Null: gray
- [ ] Non-JSON lines display as plain text
- [ ] Colors use VS Code theme variables
- [ ] Multi-line JSON is formatted properly

## Estimated Time

20 minutes

