---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 30
---

# Create Event Table HTML Structure

## Objective

Create the HTML structure for the event table view that displays events for operated clusters. This includes the table layout, filter controls, pagination controls, and empty/loading states.

## Acceptance Criteria

- [ ] Event table HTML renders for operated clusters
- [ ] Filter controls displayed (type, severity, time range, search, clear)
- [ ] Table columns: Type, Severity, Description, Resource, Time
- [ ] Pagination controls displayed (prev, next, page indicator, count)
- [ ] Refresh button in header
- [ ] Loading state placeholder
- [ ] Empty state placeholder
- [ ] Styling matches VS Code theme
- [ ] Table is responsive and scrollable

## Implementation Steps

### 1. Create getEventTableHtml function

**File**: `src/webview/EventViewerPanel.ts`

Add new method:

```typescript
/**
 * Get HTML for the event table (operated clusters).
 * 
 * @param clusterName - Display name of cluster
 * @returns HTML string
 */
private static getEventTableHtml(clusterName: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Events - ${clusterName}</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 0;
                    margin: 0;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .header-title {
                    font-size: 18px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .refresh-button {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 13px;
                }
                .refresh-button:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .filters {
                    padding: 15px 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .filter-label {
                    font-size: 13px;
                    margin-right: 5px;
                }
                select, input[type="text"] {
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 8px;
                    border-radius: 2px;
                    font-size: 13px;
                }
                .search-input {
                    min-width: 200px;
                }
                .clear-button {
                    background-color: transparent;
                    color: var(--vscode-button-secondaryForeground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 4px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 13px;
                }
                .clear-button:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .table-container {
                    overflow-x: auto;
                    height: calc(100vh - 200px);
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th {
                    background-color: var(--vscode-editorWidget-background);
                    color: var(--vscode-foreground);
                    text-align: left;
                    padding: 10px;
                    font-weight: 600;
                    font-size: 13px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    cursor: pointer;
                    user-select: none;
                }
                th:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                td {
                    padding: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    font-size: 13px;
                }
                .event-row {
                    cursor: pointer;
                }
                .event-row:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .event-icon {
                    margin-right: 5px;
                }
                .pagination {
                    padding: 15px 20px;
                    border-top: 1px solid var(--vscode-panel-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .pagination-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .pagination-button {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                    font-size: 13px;
                }
                .pagination-button:hover:not(:disabled) {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .pagination-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .loading-state, .empty-state {
                    padding: 60px 20px;
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                }
                .loading-spinner {
                    font-size: 24px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .hidden {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-title">
                    <span>📅</span>
                    <span>Event Viewer</span>
                </div>
                <button class="refresh-button" onclick="handleRefresh()">
                    🔄 Refresh
                </button>
            </div>

            <div class="filters">
                <span class="filter-label">Filters:</span>
                <select id="typeFilter">
                    <option value="">All Types</option>
                    <option value="cluster">Cluster Events</option>
                    <option value="operator">Operator Events</option>
                    <option value="insight">Insight Events</option>
                    <option value="assessment">Assessment Events</option>
                    <option value="workload">Workload Events</option>
                    <option value="system">System Events</option>
                </select>
                <select id="severityFilter">
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                </select>
                <select id="timeRangeFilter">
                    <option value="1h">Last 1 hour</option>
                    <option value="6h">Last 6 hours</option>
                    <option value="24h" selected>Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="">All Time</option>
                </select>
                <input type="text" id="searchInput" class="search-input" placeholder="Search events...">
                <button class="clear-button" onclick="handleClearFilters()">Clear</button>
            </div>

            <div id="loadingState" class="loading-state hidden">
                <div class="loading-spinner">⏳</div>
                <p>Loading events...</p>
            </div>

            <div id="emptyState" class="empty-state hidden">
                <p>📭 No events found</p>
                <p>Try adjusting your filters or time range</p>
            </div>

            <div id="tableContainer" class="table-container hidden">
                <table>
                    <thead>
                        <tr>
                            <th onclick="handleSort('type')">Type ↕</th>
                            <th onclick="handleSort('severity')">Severity ↕</th>
                            <th>Description</th>
                            <th>Resource</th>
                            <th onclick="handleSort('timestamp')">Time ↕</th>
                        </tr>
                    </thead>
                    <tbody id="eventTableBody">
                        <!-- Events will be inserted here dynamically -->
                    </tbody>
                </table>
            </div>

            <div id="pagination" class="pagination hidden">
                <div class="pagination-controls">
                    <button id="prevButton" class="pagination-button" onclick="handlePrevPage()">
                        ◀ Previous
                    </button>
                    <span id="pageInfo">Page 1 of 1</span>
                    <button id="nextButton" class="pagination-button" onclick="handleNextPage()">
                        Next ▶
                    </button>
                </div>
                <div id="resultCount">Showing 0 of 0</div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // State management
                let currentState = {
                    page: 1,
                    filters: {
                        type: '',
                        severity: '',
                        timeRange: '24h',
                        searchText: ''
                    },
                    sortBy: 'timestamp',
                    sortDirection: 'desc'
                };

                function handleRefresh() {
                    vscode.postMessage({ type: 'refresh' });
                }

                function handleClearFilters() {
                    document.getElementById('typeFilter').value = '';
                    document.getElementById('severityFilter').value = '';
                    document.getElementById('timeRangeFilter').value = '24h';
                    document.getElementById('searchInput').value = '';
                    currentState.filters = {
                        type: '',
                        severity: '',
                        timeRange: '24h',
                        searchText: ''
                    };
                    currentState.page = 1;
                    loadEvents();
                }

                function handleSort(column) {
                    if (currentState.sortBy === column) {
                        currentState.sortDirection = currentState.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentState.sortBy = column;
                        currentState.sortDirection = 'desc';
                    }
                    loadEvents();
                }

                function handlePrevPage() {
                    if (currentState.page > 1) {
                        currentState.page--;
                        loadEvents();
                    }
                }

                function handleNextPage() {
                    currentState.page++;
                    loadEvents();
                }

                function loadEvents() {
                    showLoading();
                    vscode.postMessage({
                        type: 'loadEvents',
                        data: {
                            filters: currentState.filters,
                            page: currentState.page,
                            perPage: 20,
                            sortBy: currentState.sortBy,
                            sortDirection: currentState.sortDirection
                        }
                    });
                }

                function showLoading() {
                    document.getElementById('loadingState').classList.remove('hidden');
                    document.getElementById('emptyState').classList.add('hidden');
                    document.getElementById('tableContainer').classList.add('hidden');
                    document.getElementById('pagination').classList.add('hidden');
                }

                function showEmpty() {
                    document.getElementById('loadingState').classList.add('hidden');
                    document.getElementById('emptyState').classList.remove('hidden');
                    document.getElementById('tableContainer').classList.add('hidden');
                    document.getElementById('pagination').classList.add('hidden');
                }

                function showTable() {
                    document.getElementById('loadingState').classList.add('hidden');
                    document.getElementById('emptyState').classList.add('hidden');
                    document.getElementById('tableContainer').classList.remove('hidden');
                    document.getElementById('pagination').classList.remove('hidden');
                }

                // Add event listeners for filters
                document.getElementById('typeFilter').addEventListener('change', (e) => {
                    currentState.filters.type = e.target.value;
                    currentState.page = 1;
                    loadEvents();
                });

                document.getElementById('severityFilter').addEventListener('change', (e) => {
                    currentState.filters.severity = e.target.value;
                    currentState.page = 1;
                    loadEvents();
                });

                document.getElementById('timeRangeFilter').addEventListener('change', (e) => {
                    currentState.filters.timeRange = e.target.value;
                    currentState.page = 1;
                    loadEvents();
                });

                document.getElementById('searchInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        currentState.filters.searchText = e.target.value;
                        currentState.page = 1;
                        loadEvents();
                    }
                });

                // Listen for messages from extension
                window.addEventListener('message', (event) => {
                    const message = event.data;
                    switch (message.type) {
                        case 'init':
                            // Initial data received
                            loadEvents();
                            break;
                        case 'eventData':
                            // Event data will be handled in next story
                            break;
                        case 'error':
                            showEmpty();
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}
```

### 2. Update show() method to use event table HTML

**File**: `src/webview/EventViewerPanel.ts`

In the `show()` method, update the conditional to use the new HTML:

```typescript
// Set the webview's HTML content based on operator status
if (operatorStatus === 'basic') {
    panel.webview.html = EventViewerPanel.getCTAHtml(clusterName);
} else {
    panel.webview.html = EventViewerPanel.getEventTableHtml(clusterName);
}
```

Remove the `getPlaceholderHtml` method as it's no longer needed.

## Files to Modify

- `src/webview/EventViewerPanel.ts` - Add getEventTableHtml method, update show() method

## Testing

Manual test (with operated cluster):
1. Click "Events" tree item for operated cluster
2. Verify event table structure displays:
   - Header with title and refresh button
   - Filter controls (all 4 filters + search + clear button)
   - Table headers (Type, Severity, Description, Resource, Time)
   - Loading state shows initially
   - Pagination controls at bottom
3. Test filter dropdowns (values populate correctly)
4. Test clicking column headers (sort indicators)
5. Test pagination buttons (disabled when appropriate)

## Dependencies

- Depends on Story 003 (EventViewerPanel)
- Depends on Story 004 (command registration with operator status check)

## Notes

- This story creates the HTML structure without dynamic data loading
- Event data loading will be implemented in the next story
- The table starts in loading state and waits for event data
- All interactive elements have onclick handlers defined
- CSS uses VS Code theme variables for consistency
- The table is scrollable and responsive

