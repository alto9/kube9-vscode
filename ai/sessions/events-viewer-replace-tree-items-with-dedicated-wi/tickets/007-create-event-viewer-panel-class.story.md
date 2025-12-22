---
story_id: 007-create-event-viewer-panel-class
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-panel
  - event-viewer-actions
spec_id:
  - event-viewer-panel-spec
  - event-viewer-protocol-spec
---

# Create EventViewerPanel Class

## Objective

Create `EventViewerPanel` class to manage Events Viewer webview lifecycle, message protocol, and integration with EventsProvider.

## Context

New webview panel to replace tree-based event display. Follows singleton-per-cluster pattern like Dashboard panels.

## Acceptance Criteria

- [x] Create `src/webview/EventViewerPanel.ts`
- [x] Implement singleton pattern with static `panels` Map
- [x] Implement static `show()` method (create or reveal)
- [x] Implement private constructor
- [x] Create webview panel with proper options (retainContextWhenHidden, enableScripts, etc.)
- [x] Implement `setupMessageHandling()` for bidirectional communication
- [x] Implement message handlers: ready, load, refresh, filter, export, copy, navigate, viewYaml, toggleAutoRefresh
- [x] Implement `loadEvents()` method
- [x] Implement `sendInitialState()` method
- [x] Implement `sendMessage()` helper
- [x] Implement `getWebviewContent()` with HTML, CSP, nonces
- [x] Implement `dispose()` cleanup method
- [x] Implement `handleExport()` with JSON/CSV support
- [x] Implement `convertToCSV()` helper method
- [x] Implement `handleCopy()` for clipboard operations
- [x] Implement `handleNavigate()` and `handleViewYaml()` for tree integration
- [x] Add proper TypeScript types for all methods
- [x] Panel title shows cluster name: `"Events: {cluster-name}"`

## Files Affected

- **Create**: `src/webview/EventViewerPanel.ts`

## Implementation Notes

**Singleton Pattern**:
```typescript
private static panels: Map<string, EventViewerPanel> = new Map();

public static show(
    context: vscode.ExtensionContext,
    clusterContext: string,
    eventsProvider: EventsProvider
): EventViewerPanel {
    const existing = EventViewerPanel.panels.get(clusterContext);
    if (existing) {
        existing.panel.reveal(vscode.ViewColumn.One);
        return existing;
    }
    const panel = new EventViewerPanel(context, clusterContext, eventsProvider);
    EventViewerPanel.panels.set(clusterContext, panel);
    return panel;
}
```

**Message Protocol**: Handle 10 message types from webview, send 6 message types to webview. See protocol spec for details.

**CSP**: Use nonce for scripts, restrict sources.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-panel-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-panel.feature.md`
- Diagram: `ai/diagrams/webview/events-viewer/event-viewer-architecture.diagram.md`

## Estimated Time

30 minutes

