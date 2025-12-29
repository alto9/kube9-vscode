---
story_id: 005-create-preferences-manager
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-panel-spec
status: pending
---

# Create PreferencesManager for Per-Cluster Settings

## Objective

Create PreferencesManager to persist user preferences (follow mode, timestamps, line limit) per cluster in VS Code global state.

## Context

Each cluster maintains independent preferences. When a user reopens logs for a cluster, their previous preferences should be restored.

See:
- `ai/specs/webview/pod-logs-viewer/pod-logs-panel-spec.spec.md` - State Persistence section
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Persist preferences scenario

## Files to Create/Modify

- `src/utils/PreferencesManager.ts` (new)
- `src/utils/index.ts` (export)

## Implementation Steps

1. Create `src/utils/PreferencesManager.ts`
2. Define `PanelPreferences` interface:
   ```typescript
   interface PanelPreferences {
     followMode: boolean;
     showTimestamps: boolean;
     lineLimit: number | 'all';
     showPrevious: boolean;
   }
   ```
3. Create `PreferencesManager` class:
   - Constructor takes `ExtensionContext`
   - Key: `podLogsPreferences`
4. Implement `getPreferences(contextName: string)`:
   - Read from globalState
   - Return preferences for contextName or defaults
5. Implement `savePreferences(contextName, prefs)`:
   - Read current state
   - Update for contextName
   - Save to globalState
6. Implement `getDefaults()`:
   ```typescript
   {
     followMode: true,
     showTimestamps: false,
     lineLimit: 1000,
     showPrevious: false
   }
   ```

## Acceptance Criteria

- [ ] PreferencesManager loads preferences per cluster
- [ ] Defaults are provided when no preferences exist
- [ ] Preferences are saved to VS Code globalState
- [ ] Multiple clusters maintain independent preferences
- [ ] Preferences persist across VS Code sessions

## Estimated Time

20 minutes

