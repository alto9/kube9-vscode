---
spec_id: pod-logs-ui-spec
name: Pod Logs Viewer UI Specification
description: Technical specification for Pod Logs Viewer UI components, styling, and React implementation
feature_id:
  - pod-logs-ui
  - pod-logs-actions
diagram_id:
  - pod-logs-architecture
---

# Pod Logs Viewer UI Specification

## Overview

The Pod Logs Viewer UI provides a rich, performant interface for viewing and interacting with Kubernetes pod logs. Built with React, it features virtual scrolling, real-time updates, search, and extensive user controls.

## Architecture

See [pod-logs-architecture](../../../diagrams/webview/pod-logs-viewer/pod-logs-architecture.diagram.md) for component architecture.

## Component Structure

### Main App Component

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { LogDisplay } from './components/LogDisplay';
import { Toolbar } from './components/Toolbar';
import { Footer } from './components/Footer';
import { SearchBar } from './components/SearchBar';

interface AppState {
  pod: PodInfo;
  logs: string[];
  preferences: PanelPreferences;
  containers: string[];
  streamStatus: 'connected' | 'disconnected' | 'error';
  searchVisible: boolean;
  searchQuery: string;
  searchMatches: number[];
}

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    pod: null,
    logs: [],
    preferences: { followMode: true, showTimestamps: false, lineLimit: 1000, showPrevious: false },
    containers: [],
    streamStatus: 'disconnected',
    searchVisible: false,
    searchQuery: '',
    searchMatches: []
  });
  
  // Message handler
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'initialState':
          setState(prev => ({
            ...prev,
            pod: message.data.pod,
            preferences: message.data.preferences,
            containers: message.data.containers
          }));
          break;
          
        case 'logData':
          setState(prev => ({
            ...prev,
            logs: [...prev.logs, ...message.data]
          }));
          break;
          
        case 'streamStatus':
          setState(prev => ({
            ...prev,
            streamStatus: message.status
          }));
          break;
      }
    };
    
    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);
  
  // Send ready message on mount
  useEffect(() => {
    vscode.postMessage({ type: 'ready' });
  }, []);
  
  return (
    <div className="pod-logs-viewer">
      <Toolbar
        pod={state.pod}
        containers={state.containers}
        preferences={state.preferences}
        onContainerChange={handleContainerChange}
        onLineLimitChange={handleLineLimitChange}
        onToggleTimestamps={handleToggleTimestamps}
        onToggleFollow={handleToggleFollow}
        onTogglePrevious={handleTogglePrevious}
        onRefresh={handleRefresh}
        onClear={handleClear}
        onCopy={handleCopy}
        onExport={handleExport}
        onSearch={handleSearchOpen}
      />
      
      {state.searchVisible && (
        <SearchBar
          query={state.searchQuery}
          matches={state.searchMatches}
          onQueryChange={handleSearchQueryChange}
          onClose={handleSearchClose}
        />
      )}
      
      <LogDisplay
        logs={state.logs}
        showTimestamps={state.preferences.showTimestamps}
        followMode={state.preferences.followMode}
        searchQuery={state.searchQuery}
        onScrollUp={handleScrollUp}
      />
      
      <Footer
        lineCount={state.logs.length}
        streamStatus={state.streamStatus}
      />
    </div>
  );
};
```

### Toolbar Component

```typescript
interface ToolbarProps {
  pod: PodInfo | null;
  containers: string[];
  preferences: PanelPreferences;
  onContainerChange: (container: string) => void;
  onLineLimitChange: (limit: number | 'all') => void;
  onToggleTimestamps: () => void;
  onToggleFollow: () => void;
  onTogglePrevious: () => void;
  onRefresh: () => void;
  onClear: () => void;
  onCopy: () => void;
  onExport: () => void;
  onSearch: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  pod,
  containers,
  preferences,
  onContainerChange,
  onLineLimitChange,
  onToggleTimestamps,
  onToggleFollow,
  onTogglePrevious,
  onRefresh,
  onClear,
  onCopy,
  onExport,
  onSearch
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section pod-info">
        <span className="pod-name">Pod: {pod?.name}</span>
        <span className="namespace">Namespace: {pod?.namespace}</span>
        
        {containers.length > 1 ? (
          <select
            className="container-selector"
            value={pod?.container || ''}
            onChange={(e) => onContainerChange(e.target.value)}
          >
            {containers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="all">All Containers</option>
          </select>
        ) : (
          <span className="container-name">Container: {pod?.container}</span>
        )}
      </div>
      
      <div className="toolbar-section controls">
        <select
          className="line-limit-selector"
          value={preferences.lineLimit}
          onChange={(e) => {
            const value = e.target.value;
            onLineLimitChange(value === 'all' ? 'all' : parseInt(value, 10));
          }}
        >
          <option value="50">50 lines</option>
          <option value="100">100 lines</option>
          <option value="500">500 lines</option>
          <option value="1000">1000 lines</option>
          <option value="5000">5000 lines</option>
          <option value="all">All lines</option>
        </select>
        
        <button
          className={`btn-toggle ${preferences.showTimestamps ? 'active' : ''}`}
          onClick={onToggleTimestamps}
          title="Toggle timestamps"
        >
          <span className="codicon codicon-clock"></span>
          Timestamps: {preferences.showTimestamps ? 'On' : 'Off'}
        </button>
        
        <button
          className={`btn-toggle ${preferences.followMode ? 'active' : ''}`}
          onClick={onToggleFollow}
          title="Toggle follow mode"
        >
          <span className={`codicon ${preferences.followMode ? 'codicon-debug-pause' : 'codicon-play'}`}></span>
          Follow: {preferences.followMode ? 'On' : 'Off'}
        </button>
        
        {pod?.hasCrashed && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.showPrevious}
              onChange={onTogglePrevious}
            />
            Show previous container logs
          </label>
        )}
      </div>
      
      <div className="toolbar-section actions">
        <button className="btn-icon" onClick={onRefresh} title="Refresh logs">
          <span className="codicon codicon-refresh"></span>
        </button>
        <button className="btn-icon" onClick={onClear} title="Clear display">
          <span className="codicon codicon-clear-all"></span>
        </button>
        <button className="btn-icon" onClick={onCopy} title="Copy logs">
          <span className="codicon codicon-copy"></span>
        </button>
        <button className="btn-icon" onClick={onExport} title="Export logs">
          <span className="codicon codicon-save"></span>
        </button>
        <button className="btn-icon" onClick={onSearch} title="Search logs">
          <span className="codicon codicon-search"></span>
        </button>
      </div>
    </div>
  );
};
```

### Log Display Component (Virtual Scrolling with Dynamic Heights)

```typescript
import { VariableSizeList as List } from 'react-window';

interface LogDisplayProps {
  logs: string[];
  showTimestamps: boolean;
  followMode: boolean;
  searchQuery: string;
  onScrollUp: () => void;
}

export const LogDisplay: React.FC<LogDisplayProps> = ({
  logs,
  showTimestamps,
  followMode,
  searchQuery,
  onScrollUp
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Row height cache and refs for dynamic sizing
  const rowHeights = useRef<Map<number, number>>(new Map());
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Get height for a specific row index
  const getItemSize = useCallback((index: number) => {
    return rowHeights.current.get(index) || 20; // fallback to 20px minimum
  }, []);
  
  // Measure row height after render
  const setRowRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      rowRefs.current.set(index, element);
      const height = element.offsetHeight;
      const currentHeight = rowHeights.current.get(index);
      
      if (currentHeight !== height) {
        rowHeights.current.set(index, height);
        // Force list to recalculate layout
        listRef.current?.resetAfterIndex(index);
      }
    }
  }, []);
  
  // Clear height cache when logs change significantly
  useEffect(() => {
    rowHeights.current.clear();
    rowRefs.current.clear();
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [logs.length]);
  
  // Auto-scroll to bottom when follow mode is on
  useEffect(() => {
    if (followMode && listRef.current) {
      listRef.current.scrollToItem(logs.length - 1, 'end');
    }
  }, [logs, followMode]);
  
  // Detect scroll up to disable follow mode
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (!scrollUpdateWasRequested && followMode) {
      // Calculate total scrollable height by summing all row heights
      let totalHeight = 0;
      for (let i = 0; i < logs.length; i++) {
        totalHeight += getItemSize(i);
      }
      
      const clientHeight = containerRef.current?.clientHeight || 0;
      const isAtBottom = scrollOffset + clientHeight >= totalHeight - 50;
      
      if (!isAtBottom) {
        onScrollUp();
      }
    }
  };
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const line = logs[index];
    const { timestamp, content } = parseLogLine(line, showTimestamps);
    const isMatch = searchQuery && content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return (
      <div 
        ref={setRowRef(index)}
        style={{
          ...style,
          height: 'auto',  // Allow natural height
          minHeight: 20    // Minimum 20px
        }}
        className={`log-line ${isMatch ? 'highlight' : ''}`}
      >
        {showTimestamps && timestamp && (
          <span className="timestamp">{timestamp}</span>
        )}
        <span className="content">{highlightJSON(content)}</span>
      </div>
    );
  };
  
  return (
    <div ref={containerRef} className="log-display">
      <List
        ref={listRef}
        height={600}
        itemCount={logs.length}
        itemSize={getItemSize}
        width="100%"
        onScroll={handleScroll}
      >
        {Row}
      </List>
    </div>
  );
};

function parseLogLine(line: string, showTimestamps: boolean): { timestamp?: string; content: string } {
  // Parse timestamp if present in format: 2024-12-29T10:30:45.123Z
  const timestampRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/;
  const match = line.match(timestampRegex);
  
  if (match) {
    return { timestamp: match[1], content: match[2] };
  }
  
  return { content: line };
}

function highlightJSON(content: string): React.ReactNode {
  try {
    const parsed = JSON.parse(content);
    return (
      <span className="json">
        {JSON.stringify(parsed, null, 2)}
      </span>
    );
  } catch {
    return content;
  }
}
```

### Search Bar Component

```typescript
interface SearchBarProps {
  query: string;
  matches: number[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  matches,
  onQueryChange,
  onClose
}) => {
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Search logs..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
      />
      
      {matches.length > 0 && (
        <div className="search-matches">
          {currentMatchIndex + 1} of {matches.length}
        </div>
      )}
      
      <button
        className="btn-icon"
        onClick={() => setCurrentMatchIndex(Math.max(0, currentMatchIndex - 1))}
        disabled={matches.length === 0}
        title="Previous match"
      >
        <span className="codicon codicon-arrow-up"></span>
      </button>
      
      <button
        className="btn-icon"
        onClick={() => setCurrentMatchIndex(Math.min(matches.length - 1, currentMatchIndex + 1))}
        disabled={matches.length === 0}
        title="Next match"
      >
        <span className="codicon codicon-arrow-down"></span>
      </button>
      
      <button className="btn-icon" onClick={onClose} title="Close search">
        <span className="codicon codicon-close"></span>
      </button>
    </div>
  );
};
```

### Footer Component

```typescript
interface FooterProps {
  lineCount: number;
  streamStatus: 'connected' | 'disconnected' | 'error';
}

export const Footer: React.FC<FooterProps> = ({ lineCount, streamStatus }) => {
  const statusIcon = {
    connected: '●',
    disconnected: '⏸',
    error: '⚠'
  }[streamStatus];
  
  const statusText = {
    connected: 'Streaming',
    disconnected: 'Paused',
    error: 'Error'
  }[streamStatus];
  
  const statusClass = `status-${streamStatus}`;
  
  return (
    <div className="footer">
      <span className="line-count">{lineCount.toLocaleString()} lines</span>
      <span className={`stream-status ${statusClass}`}>
        {statusIcon} {statusText}
      </span>
    </div>
  );
};
```

## Styling (CSS)

### Theme Integration

Use VS Code CSS variables for theme compatibility:

```css
:root {
  --vscode-editor-background: var(--vscode-editor-background);
  --vscode-editor-foreground: var(--vscode-editor-foreground);
  --vscode-editorLineNumber-foreground: var(--vscode-editorLineNumber-foreground);
  --vscode-textLink-foreground: var(--vscode-textLink-foreground);
  --vscode-button-background: var(--vscode-button-background);
  --vscode-input-background: var(--vscode-input-background);
}

.pod-logs-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: var(--vscode-editorWidget-background);
  border-bottom: 1px solid var(--vscode-editorWidget-border);
  flex-wrap: wrap;
}

.log-display {
  flex: 1;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.log-line {
  padding: 2px 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  min-height: 20px;
}

.log-line .log-content {
  display: inline;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-line.highlight {
  background-color: var(--vscode-editor-findMatchHighlightBackground);
}

.timestamp {
  color: var(--vscode-editorLineNumber-foreground);
  margin-right: 8px;
}

.footer {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background-color: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  font-size: 12px;
  border-top: 1px solid var(--vscode-statusBar-border);
}

.status-connected {
  color: var(--vscode-testing-iconPassed);
}

.status-disconnected {
  color: var(--vscode-editorLineNumber-foreground);
}

.status-error {
  color: var(--vscode-errorForeground);
}
```

### JSON Syntax Highlighting

```css
.json {
  color: var(--vscode-editor-foreground);
}

.json .json-key {
  color: var(--vscode-symbolIcon-keywordForeground);
}

.json .json-string {
  color: var(--vscode-symbolIcon-stringForeground);
}

.json .json-number {
  color: var(--vscode-symbolIcon-numberForeground);
}

.json .json-boolean {
  color: var(--vscode-symbolIcon-booleanForeground);
}

.json .json-null {
  color: var(--vscode-editorLineNumber-foreground);
}
```

## Build Configuration

### Webpack Configuration

```javascript
// webpack.config.js for webview
module.exports = {
  entry: './src/webview/pod-logs/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'media', 'pod-logs'),
    filename: 'main.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  externals: {
    vscode: 'commonjs vscode'
  }
};
```

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; 
                 script-src ${cspSource} 'nonce-${nonce}'; 
                 style-src ${cspSource} 'unsafe-inline'; 
                 font-src ${cspSource};">
  <title>Pod Logs Viewer</title>
  <link href="${stylesUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
```

## Performance Considerations

### Virtual Scrolling with Dynamic Heights
- Use `react-window` with `VariableSizeList` for efficient rendering of large log lists
- Only render visible rows (50-100 at a time)
- Dynamically calculate row heights based on actual content
- Cache measured row heights to avoid repeated calculations
- Clear height cache when log content changes significantly
- Support multi-line log entries (JSON, stack traces) without horizontal scrolling

### Height Measurement Strategy
- Measure row heights after initial render using DOM `offsetHeight`
- Cache measured heights in a Map for O(1) lookup
- Invalidate cache and recalculate when:
  - Log count changes (new logs added or cleared)
  - Container switches (different pod/container)
  - Window resizes

### Batched Updates
- Batch log line additions (every 100ms)
- Use `React.memo` for expensive components
- Debounce search queries (300ms)

### Memory Management
- Limit buffer to 10,000 lines
- Trim oldest lines when limit exceeded
- Clear logs and height cache from memory when panel closes

## Accessibility

- **Keyboard Navigation**: All controls accessible via Tab/Shift+Tab
- **ARIA Labels**: Buttons and inputs have descriptive labels
- **Focus Management**: Search input auto-focuses when opened
- **Screen Reader**: Status updates announced
- **High Contrast**: Support high contrast themes

## Technical Requirements

- **React**: ^18.x
- **react-window**: ^1.8.x
- **TypeScript**: ^5.x
- **VS Code Webview API**: ^1.85.0
- **@vscode/codicons**: ^0.0.35 (for icons)

