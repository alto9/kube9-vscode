---
story_id: 013-implement-search-functionality
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-actions
spec_id:
  - pod-logs-ui-spec
status: pending
---

# Implement Search Functionality with Highlighting

## Objective

Create SearchBar component and implement search with match highlighting and navigation.

## Context

Users need to search through logs to find specific errors or patterns. Search should highlight matches and allow navigation between them.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md` - Search scenarios
- `ai/specs/webview/pod-logs-viewer/pod-logs-ui-spec.spec.md` - SearchBar Component

## Files to Create/Modify

- `src/webview/pod-logs/components/SearchBar.tsx` (new)
- `src/webview/pod-logs/components/LogDisplay.tsx` (modify - highlight matches)
- `src/webview/pod-logs/App.tsx` (modify - search state and handlers)

## Implementation Steps

1. Create `src/webview/pod-logs/components/SearchBar.tsx`:
   ```typescript
   interface SearchBarProps {
     query: string;
     matches: number[];
     onQueryChange: (query: string) => void;
     onClose: () => void;
   }
   ```
2. Add search input, match counter, prev/next buttons, close button
3. In App, add search state:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('');
   const [searchMatches, setSearchMatches] = useState<number[]>([]);
   const [searchVisible, setSearchVisible] = useState(false);
   ```
4. Implement search logic:
   ```typescript
   useEffect(() => {
     if (!searchQuery) {
       setSearchMatches([]);
       return;
     }
     const matches = logs
       .map((log, index) => log.toLowerCase().includes(searchQuery.toLowerCase()) ? index : -1)
       .filter(i => i !== -1);
     setSearchMatches(matches);
   }, [searchQuery, logs]);
   ```
5. In LogDisplay, highlight matching lines:
   ```typescript
   const isMatch = searchQuery && content.toLowerCase().includes(searchQuery.toLowerCase());
   <div className={`log-line ${isMatch ? 'highlight' : ''}`}>
   ```
6. Add CSS for highlight background color
7. Wire search button in Toolbar to show SearchBar

## Acceptance Criteria

- [ ] Search button opens SearchBar
- [ ] SearchBar shows input, match count, navigation buttons
- [ ] Search is case-insensitive by default
- [ ] Matching log lines are highlighted
- [ ] Match count shows "X matches"
- [ ] Close button hides SearchBar and clears search
- [ ] Search works in real-time as user types

## Estimated Time

30 minutes

