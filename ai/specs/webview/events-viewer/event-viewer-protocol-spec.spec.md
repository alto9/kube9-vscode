---
spec_id: event-viewer-protocol-spec
name: Event Viewer Message Protocol Specification
description: Technical specification for message communication between EventViewerPanel (extension) and React webview
feature_id:
  - event-viewer-panel
  - event-viewer-actions
  - event-viewer-filtering
diagram_id:
  - event-viewer-message-protocol
---

# Event Viewer Message Protocol Specification

## Overview

The Events Viewer uses bidirectional messaging between the extension host (EventViewerPanel) and the webview (React app). This spec defines the message types, payloads, and communication patterns.

## Communication Architecture

```
Extension Host                    Webview
┌──────────────────┐             ┌──────────────────┐
│ EventViewerPanel │◄───────────►│ EventViewerApp   │
│                  │   Messages   │ (React)          │
│ - EventsProvider │             │ - State          │
│ - Commands       │             │ - UI Components  │
│ - File I/O       │             │ - User Actions   │
└──────────────────┘             └──────────────────┘
```

## Message Types

### Extension → Webview Messages

Messages sent from EventViewerPanel to React webview.

#### 1. initialState

Sent when webview is first ready, provides initial configuration and state.

```typescript
{
    type: 'initialState';
    clusterContext: string;          // Cluster context name
    filters: EventFilters;           // Current filter state
    autoRefreshEnabled: boolean;     // Auto-refresh state
}
```

**When**: After webview sends 'ready' message  
**Purpose**: Initialize webview with cluster-specific state

#### 2. events

Sent when events are loaded or refreshed successfully.

```typescript
{
    type: 'events';
    events: KubernetesEvent[];      // Array of events
    loading: false;
}
```

**When**: After successful event fetch from operator  
**Purpose**: Provide event data to display in table

#### 3. loading

Sent when loading state changes.

```typescript
{
    type: 'loading';
    loading: boolean;               // True = loading, False = done
}
```

**When**: Before/after event fetch operations  
**Purpose**: Show/hide loading indicators in UI

#### 4. error

Sent when an error occurs during event fetch or processing.

```typescript
{
    type: 'error';
    error: string;                  // Error message
    loading: false;
}
```

**When**: Event fetch fails, operator unavailable, etc.  
**Purpose**: Display error state in UI with helpful message

#### 5. autoRefreshState

Sent when auto-refresh state changes.

```typescript
{
    type: 'autoRefreshState';
    enabled: boolean;               // Auto-refresh on/off
}
```

**When**: After toggle auto-refresh action  
**Purpose**: Update UI to reflect auto-refresh state

#### 6. autoRefreshInterval

Sent when auto-refresh interval changes.

```typescript
{
    type: 'autoRefreshInterval';
    interval: number;               // Interval in seconds
}
```

**When**: After user configures refresh interval  
**Purpose**: Update UI to display current interval

### Webview → Extension Messages

Messages sent from React webview to EventViewerPanel.

#### 1. ready

Sent when webview has loaded and React app is mounted.

```typescript
{
    type: 'ready';
}
```

**When**: React useEffect on mount  
**Purpose**: Signal extension to send initialState

#### 2. load

Request to load events with optional filters.

```typescript
{
    type: 'load';
    filters?: EventFilters;         // Optional filter overrides
}
```

**When**: User changes filters, initial load  
**Purpose**: Request fresh event data from operator

#### 3. refresh

Request to refresh events (clears cache).

```typescript
{
    type: 'refresh';
}
```

**When**: User clicks refresh button  
**Purpose**: Force fresh event fetch, bypassing cache

#### 4. filter

Notify extension of filter changes.

```typescript
{
    type: 'filter';
    filters: EventFilters;          // New filter state
}
```

**When**: User applies filters in UI  
**Purpose**: Update filter state and trigger filtered event load

#### 5. export

Request to export events to file.

```typescript
{
    type: 'export';
    format: 'json' | 'csv';         // Export format
    events: KubernetesEvent[];      // Events to export
}
```

**When**: User clicks export and selects format  
**Purpose**: Trigger file save dialog and write events to file

#### 6. copy

Request to copy content to clipboard.

```typescript
{
    type: 'copy';
    content: string;                // Content to copy
}
```

**When**: User copies event details or message  
**Purpose**: Write content to system clipboard

#### 7. navigate

Request to navigate to resource in tree view.

```typescript
{
    type: 'navigate';
    resource: {
        namespace: string;
        kind: string;
        name: string;
    };
}
```

**When**: User clicks "Go to Resource" action  
**Purpose**: Navigate tree view to show specific resource

#### 8. viewYaml

Request to open resource YAML in editor.

```typescript
{
    type: 'viewYaml';
    resource: {
        namespace: string;
        kind: string;
        name: string;
    };
}
```

**When**: User clicks "View YAML" action  
**Purpose**: Open YAML editor for specific resource

#### 9. toggleAutoRefresh

Request to toggle auto-refresh on/off.

```typescript
{
    type: 'toggleAutoRefresh';
    enabled: boolean;               // New state (on/off)
}
```

**When**: User clicks auto-refresh toggle  
**Purpose**: Enable/disable automatic event refreshing

#### 10. setAutoRefreshInterval

Request to change auto-refresh interval.

```typescript
{
    type: 'setAutoRefreshInterval';
    interval: number;               // Interval in seconds
}
```

**When**: User selects new refresh interval  
**Purpose**: Update refresh timer interval

## Message Flow Patterns

### Pattern 1: Initial Load

```
Webview                Extension
   │                       │
   ├──► ready             │
   │                       │
   │      initialState ◄──┤
   │                       │
   │      loading ◄────────┤
   │                       │
   │                 (fetch events)
   │                       │
   │      events ◄─────────┤
```

### Pattern 2: User Refresh

```
Webview                Extension
   │                       │
   ├──► refresh           │
   │                       │
   │      loading ◄────────┤
   │                       │
   │                 (clear cache)
   │                 (fetch events)
   │                       │
   │      events ◄─────────┤
```

### Pattern 3: Filter Change

```
Webview                Extension
   │                       │
   ├──► filter {filters}  │
   │                       │
   │      loading ◄────────┤
   │                       │
   │              (apply filters)
   │              (fetch filtered)
   │                       │
   │      events ◄─────────┤
```

### Pattern 4: Export Action

```
Webview                Extension
   │                       │
   ├──► export {format,   │
   │         events}       │
   │                       │
   │              (show save dialog)
   │              (write file)
   │              (show notification)
```

### Pattern 5: Auto-Refresh

```
Webview                Extension
   │                       │
   ├──► toggleAutoRefresh │
   │      {enabled: true}  │
   │                       │
   │   autoRefreshState ◄─┤
   │      {enabled: true}  │
   │                       │
   │   (wait 30 seconds)   │
   │                       │
   │      loading ◄────────┤
   │                       │
   │                 (fetch events)
   │                       │
   │      events ◄─────────┤
   │                       │
   │   (repeat every 30s)  │
```

### Pattern 6: Error Handling

```
Webview                Extension
   │                       │
   ├──► refresh           │
   │                       │
   │      loading ◄────────┤
   │                       │
   │              (fetch fails)
   │                       │
   │      error ◄──────────┤
   │      {error: "..."}   │
```

## Message Handling Implementation

### Extension Side (EventViewerPanel)

```typescript
private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.type) {
                case 'ready':
                    await this.sendInitialState();
                    break;
                case 'load':
                    await this.handleLoadEvents(message.filters);
                    break;
                case 'refresh':
                    await this.handleRefresh();
                    break;
                case 'filter':
                    await this.handleFilterChange(message.filters);
                    break;
                case 'export':
                    await this.handleExport(message.format, message.events);
                    break;
                case 'copy':
                    await this.handleCopy(message.content);
                    break;
                case 'navigate':
                    await this.handleNavigate(message.resource);
                    break;
                case 'viewYaml':
                    await this.handleViewYaml(message.resource);
                    break;
                case 'toggleAutoRefresh':
                    await this.handleToggleAutoRefresh(message.enabled);
                    break;
                case 'setAutoRefreshInterval':
                    await this.handleSetAutoRefreshInterval(message.interval);
                    break;
            }
        },
        null,
        this.disposables
    );
}

private sendMessage(message: any): void {
    this.panel.webview.postMessage(message);
}
```

### Webview Side (React)

```typescript
// Message sender
const vscode = acquireVsCodeApi();

const sendMessage = useCallback((message: any) => {
    vscode.postMessage(message);
}, [vscode]);

// Message receiver
useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        
        switch (message.type) {
            case 'initialState':
                setState(prev => ({
                    ...prev,
                    clusterContext: message.clusterContext,
                    filters: message.filters,
                    autoRefreshEnabled: message.autoRefreshEnabled
                }));
                break;
            
            case 'events':
                setState(prev => ({
                    ...prev,
                    events: message.events,
                    loading: false,
                    error: null
                }));
                break;
            
            case 'loading':
                setState(prev => ({
                    ...prev,
                    loading: message.loading
                }));
                break;
            
            case 'error':
                setState(prev => ({
                    ...prev,
                    error: message.error,
                    loading: false
                }));
                break;
            
            case 'autoRefreshState':
                setState(prev => ({
                    ...prev,
                    autoRefreshEnabled: message.enabled
                }));
                break;
        }
    };

    window.addEventListener('message', handleMessage);
    
    // Send ready message on mount
    sendMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
}, [sendMessage]);
```

## Type Safety

Define message types for type safety on both sides:

```typescript
// Extension → Webview
type ExtensionMessage =
    | { type: 'initialState'; clusterContext: string; filters: EventFilters; autoRefreshEnabled: boolean }
    | { type: 'events'; events: KubernetesEvent[]; loading: false }
    | { type: 'loading'; loading: boolean }
    | { type: 'error'; error: string; loading: false }
    | { type: 'autoRefreshState'; enabled: boolean }
    | { type: 'autoRefreshInterval'; interval: number };

// Webview → Extension
type WebviewMessage =
    | { type: 'ready' }
    | { type: 'load'; filters?: EventFilters }
    | { type: 'refresh' }
    | { type: 'filter'; filters: EventFilters }
    | { type: 'export'; format: 'json' | 'csv'; events: KubernetesEvent[] }
    | { type: 'copy'; content: string }
    | { type: 'navigate'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'viewYaml'; resource: { namespace: string; kind: string; name: string } }
    | { type: 'toggleAutoRefresh'; enabled: boolean }
    | { type: 'setAutoRefreshInterval'; interval: number };
```

## Error Handling

### Extension Errors

When errors occur in extension host:

1. Catch the error
2. Log it for debugging
3. Send 'error' message to webview
4. Include user-friendly error message
5. Continue handling other messages

```typescript
try {
    const events = await this.eventsProvider.getEvents(this.clusterContext);
    this.sendMessage({ type: 'events', events, loading: false });
} catch (error) {
    console.error('Failed to load events:', error);
    this.sendMessage({
        type: 'error',
        error: `Failed to load events: ${(error as Error).message}`,
        loading: false
    });
}
```

### Webview Errors

When errors occur in webview:

1. Display error state in UI
2. Provide retry action
3. Log to console for debugging
4. Don't crash the React app

## Performance Considerations

### Message Frequency

- **Debounce**: Search input changes should be debounced before sending 'filter' messages
- **Throttle**: Resize operations should be throttled
- **Batch**: Multiple filter changes should be batched into single message

### Message Size

- **Events Array**: Limited to 500 events maximum, reasonable size
- **Export**: Events passed to extension for file writing (acceptable)
- **Avoid**: Sending large data unnecessarily, use state management

### State Management

- Extension maintains source of truth for filters and settings
- Webview maintains UI state (scroll position, selection, etc.)
- Sync critical state via messages
- Don't duplicate large data structures

## Security Considerations

- Content Security Policy restricts message sources
- All user input sanitized before display
- File operations require user confirmation
- No arbitrary code execution via messages
- Validate message structure and types

## Testing Strategy

- Unit tests for message handlers (extension side)
- Mock VS Code API for webview testing
- Integration tests for message flow patterns
- Test error scenarios and edge cases
- Verify type safety with TypeScript

