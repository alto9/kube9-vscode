---
session_id: events-viewer-replace-tree-items-with-dedicated-wi
start_time: '2025-12-19T15:11:50.187Z'
status: development
problem_statement: >-
  Events Viewer: Replace tree items with dedicated Windows EventViewer-style
  webview
changed_files:
  - path: ai/features/webview/events-viewer/event-viewer-panel.feature.md
    change_type: added
    scenarios_added:
      - Opening Events Viewer from tree category
      - Opening Events Viewer via command palette
      - One webview panel per cluster context
      - Revealing existing panel instead of creating duplicate
      - Panel disposal when closed by user
      - Panel disposal when extension deactivates
      - Panel title shows cluster name
      - Panel opens in editor area with appropriate column
      - Panel retains context when hidden
      - Auto-refresh starts when panel opens
      - Auto-refresh continues while panel is visible
      - Auto-refresh stops when panel is closed
      - Toggle auto-refresh on and off
      - Auto-refresh state persists per cluster
      - Manual refresh button works regardless of auto-refresh state
      - Panel handles operator becoming unavailable
      - Panel displays loading state during initial fetch
      - Panel displays empty state when no events exist
      - Panel displays error state when fetch fails
      - Panel icon shows in editor tab
      - Multiple panels can be open simultaneously
      - Panel layout adapts to window size
      - Webview scripts are loaded properly
      - Content Security Policy is properly configured
    scenarios_removed:
      - Opening Events Viewer from tree category
      - Opening Events Viewer via command palette
      - One webview panel per cluster context
      - Revealing existing panel instead of creating duplicate
      - Panel disposal when closed by user
      - Panel disposal when extension deactivates
      - Panel title shows cluster name
      - Panel opens in editor area with appropriate column
      - Panel retains context when hidden
      - Auto-refresh starts when panel opens
      - Auto-refresh continues while panel is visible
      - Auto-refresh stops when panel is closed
      - Toggle auto-refresh on and off
      - Auto-refresh state persists per cluster
      - Manual refresh button works regardless of auto-refresh state
      - Panel handles operator becoming unavailable
      - Panel displays loading state during initial fetch
      - Panel displays empty state when no events exist
      - Panel displays error state when fetch fails
      - Panel icon shows in editor tab
      - Multiple panels can be open simultaneously
      - Panel layout adapts to window size
      - Webview scripts are loaded properly
      - Content Security Policy is properly configured
  - path: ai/features/webview/events-viewer/event-viewer-ui.feature.md
    change_type: added
    scenarios_added:
      - Three-pane layout structure
      - Left pane displays filter controls
      - Main pane displays event table with columns
      - Event table columns are sortable
      - Event table rows are color-coded by type
      - Event table uses virtual scrolling for performance
      - Event table row selection
      - Event table row hover state
      - Bottom pane displays selected event details
      - Bottom pane is resizable
      - Bottom pane can be collapsed
      - Table displays loading state during fetch
      - Table displays empty state when no events
      - Table displays error state when fetch fails
      - Toolbar at top of main pane
      - Search box in toolbar for quick filtering
      - Status bar at bottom shows event count and refresh status
      - Theme integration with VS Code
      - Level column displays icons for event types
      - Date/Time column shows relative time with absolute tooltip
      - Source column displays resource in namespace/kind/name format
      - Event ID column shows reason with count badge
      - Keyboard navigation through table
      - Table supports multi-row selection with Ctrl/Cmd
      - Table context menu on right-click
      - Pane dividers are draggable with visual feedback
      - Responsive layout for narrow windows
      - Smooth transitions and animations
      - Accessibility support for screen readers
      - High DPI display support
      - Loading indicator for individual operations
  - path: ai/features/webview/events-viewer/event-viewer-filtering.feature.md
    change_type: added
    scenarios_added:
      - 'Filter events by type (Normal, Warning, Error)'
      - Multiple type selection
      - Filter events by time range with quick options
      - Custom time range selection
      - Filter events by namespace
      - Multiple namespace selection
      - Filter events by resource type
      - Multiple resource type selection
      - Real-time text search in events
      - Search across event fields
      - Combine multiple filters
      - Clear individual filters
      - Clear all filters at once
      - Filter state persists per cluster
      - Filter state survives refresh
      - Filter state survives auto-refresh
      - Filter counts update dynamically
      - Filter dropdown shows event distribution
      - Filter by event source (involved object)
      - Quick filter from table interaction
      - Filter indicators in UI
      - Filter validation and feedback
      - Filter presets (future enhancement placeholder)
      - Filter by event severity level
      - Filter exclusion (inverse filtering)
      - Filter reset button per filter category
      - Filter loading state
      - Filter debouncing for search
      - Filter URL parameters (for future sharing)
      - Accessible filter controls
      - Filter persistence across sessions (future)
  - path: ai/features/webview/events-viewer/event-viewer-actions.feature.md
    change_type: added
    scenarios_added:
      - Manual refresh events
      - Export all events to JSON
      - Export all events to CSV
      - Export selected events only
      - Export respects current filters
      - Copy single event details to clipboard
      - Copy multiple events to clipboard
      - Copy event message only
      - Navigate to resource in tree view
      - Navigate to resource when resource doesn't exist in tree
      - Open resource YAML from event
      - Clear all filters action
      - Toggle auto-refresh on/off
      - Configure auto-refresh interval
      - Sort table by column
      - Resize table columns
      - Collapse/expand details pane
      - Resize details pane
      - Select event to view details
      - Double-click event to open detailed modal
      - Keyboard shortcuts for common actions
      - Filter to specific namespace from event
      - Filter to specific resource type from event
      - Exclude events similar to selected
      - Pin important events (future enhancement)
      - Event detail actions in bottom pane
      - Bulk actions on selected events
      - Undo filter action
      - Share filtered view (future enhancement)
      - Create alert rule from event pattern (future enhancement)
      - Accessible action buttons
      - Action feedback and confirmation
  - path: ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md
    change_type: added
    scenarios_added:
      - Discover operator namespace from status ConfigMap
      - Fallback to user configuration when ConfigMap lacks namespace
      - Fallback to default 'kube9-system' as last resort
      - Three-tier namespace resolution chain
      - Cache namespace per cluster context
      - Invalidate namespace cache on operator status change
      - EventsProvider uses discovered namespace
      - OperatorStatusClient uses discovered namespace
      - 'Bootstrap problem: finding ConfigMap needs namespace'
      - Search all namespaces for operator ConfigMap
      - Handle operator in custom namespace from first install
      - User configures custom namespace in VS Code settings
      - Per-cluster namespace configuration in settings
start_commit: 615365e47d82741e4e1c7e203a72d7d83a0bb131
---
## Problem Statement

Events Viewer: Replace tree items with dedicated Windows EventViewer-style webview

## Goals

### Primary Goals

1. **Create dedicated EventViewer webview panel** with Windows EventViewer-inspired UX featuring three-pane layout (filters, table, details), virtual scrolling, rich filtering/search, auto-refresh, and export capabilities

2. **Replace tree-based event display completely** by making EventsCategory a webview launcher and removing EventTreeItem, with one webview per cluster context

3. **Implement dynamic namespace discovery** using three-tier resolution (ConfigMap → Settings → Default) to eliminate all hardcoded 'kube9-system' references and support custom namespace installations

### Secondary Goals

- Maintain integration with existing EventsProvider service
- Follow existing webview patterns (Dashboard, Studio)
- Ensure accessibility and theme integration
- Enable efficient troubleshooting workflows for cluster operators

## Approach

### Architecture Strategy

- **Webview Panel Pattern**: Singleton-per-cluster like Dashboard panels, with EventViewerPanel managing lifecycle and message protocol
- **Component-Based UI**: React-based with EventViewerApp root, Toolbar, ThreePaneLayout, and virtual scrolling via react-window
- **Message Protocol**: Bidirectional postMessage communication where extension handles data operations and webview handles UI state
- **Dynamic Namespace Resolution**: OperatorNamespaceResolver service with ConfigMap-based discovery, settings fallback, and per-cluster caching

### Implementation Phases

1. **Features & Specs** (Design Session): Define features with Gherkin, specify technical details, create diagrams, document namespace discovery
2. **Core Infrastructure**: Create OperatorNamespaceResolver, update EventsProvider for dynamic namespace, fix all hardcoded references
3. **Webview Panel**: Create EventViewerPanel class, implement message protocol, set up webview HTML/script loading
4. **React Components**: Build component hierarchy, three-pane layout, virtual scrolling, filtering controls
5. **Actions & Integration**: Export (JSON/CSV), navigation to resources, clipboard operations, auto-refresh management
6. **Tree Integration**: Update EventsCategory to launch webview, remove tree-based display, register commands

## Key Decisions

1. **Windows EventViewer as UX Model**: Familiar to IT professionals, proven UX for event analysis, efficient three-pane layout

2. **One Webview Per Cluster**: Matches Dashboard pattern, allows independent viewing, simplifies state management

3. **Virtual Scrolling Required**: Essential for 500+ events performance using react-window

4. **Replace Tree Display Completely**: Tree view fundamentally wrong for event data, webview provides superior UX

5. **Three-Tier Namespace Resolution**: ConfigMap is source of truth, settings provide override, default ensures backward compatibility, caching provides performance

6. **Enhance EventsProvider, Don't Replace**: Existing service handles operator CLI well, only needs namespace parameter enhancement

7. **React for Webview UI**: Consistent with other webviews, component-based architecture, rich ecosystem

8. **VS Code Theme Integration**: Use VS Code CSS variables for automatic theme compatibility

## Notes

### Technical Considerations

- Performance: Virtual scrolling critical for 500+ events
- Security: CSP, nonce for scripts, user confirmation for file operations
- Accessibility: Keyboard navigation, ARIA labels, screen reader support
- Migration: All hardcoded namespaces must be updated simultaneously

### User Experience Considerations

- Familiarity: Windows EventViewer UX familiar to target users (cluster operators)
- Efficiency: Three-pane layout optimizes troubleshooting workflow
- Flexibility: Powerful filtering without overwhelming UI
- Responsiveness: Layout adapts to window size

### Future Enhancements (Out of Scope)

- Saved filter presets
- Event correlation and analysis
- Custom event views
- Real-time streaming (currently polling)
- Event annotations or bookmarks

### Dependencies

- Operator must include namespace in status ConfigMap (enhancement needed)
- react-window or similar for virtual scrolling
- Existing EventsProvider service (enhance, don't replace)
- Kubernetes client Exec API (already in use)

### Related Issues

- GitHub issue #43 (source requirement)
- Operator namespace management (kube9-operator repository)
