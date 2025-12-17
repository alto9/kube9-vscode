---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-query-api-spec
story_type: code
estimated_minutes: 25
---

# Create EventQueryClient Class

## Objective

Create the `EventQueryClient` class that queries cluster events from the kube9-operator CLI binary via kubectl exec. This class provides the data layer for the Event Viewer.

## Acceptance Criteria

- [ ] EventQueryClient class created with TypeScript interfaces
- [ ] `listEvents()` method implemented with filter support
- [ ] `getEvent()` method implemented for single event retrieval
- [ ] Proper error handling for operator unavailable/timeout
- [ ] TypeScript interfaces exported for use by webview

## Implementation Steps

### 1. Create event types file

**File**: `src/services/EventQueryTypes.ts` (new file)

```typescript
/**
 * Filter options for querying events
 */
export interface EventFilters {
    type?: string[];           // Event types to include
    severity?: string[];       // Severities to include
    since?: string;            // ISO 8601 timestamp or relative (e.g., "24h")
    objectKind?: string;       // Filter by object kind
    objectName?: string;       // Filter by object name
    objectNamespace?: string;  // Filter by namespace
    searchText?: string;       // Full-text search
}

/**
 * Response from event list query
 */
export interface EventListResponse {
    events: Event[];
    pagination: {
        currentPage: number;
        perPage: number;
        totalCount: number;
        totalPages: number;
    };
}

/**
 * Individual event data
 */
export interface Event {
    id: string;
    type: string;
    severity: string;
    timestamp: string;
    description: string;
    objectKind?: string;
    objectName?: string;
    objectNamespace?: string;
    metadata?: Record<string, any>;
    relatedEventIds?: string[];
}
```

### 2. Create EventQueryClient class

**File**: `src/services/EventQueryClient.ts` (new file)

```typescript
import { execKubectl } from '../kubectl/KubectlCommandRunner';
import { EventFilters, EventListResponse, Event } from './EventQueryTypes';

/**
 * Client for querying cluster events from kube9-operator via kubectl exec.
 * Executes the kube9-operator CLI binary bundled in the operator pod.
 */
export class EventQueryClient {
    /**
     * List events with filters and pagination
     * 
     * @param context - Kubectl context name
     * @param filters - Filter options
     * @param page - Page number (1-indexed)
     * @param perPage - Results per page (default 20, max 100)
     * @param sortBy - Field to sort by (timestamp, type, severity)
     * @param sortDirection - Sort direction (asc or desc)
     * @returns Promise with events and pagination info
     */
    async listEvents(
        context: string,
        filters?: EventFilters,
        page: number = 1,
        perPage: number = 20,
        sortBy?: string,
        sortDirection: 'asc' | 'desc' = 'desc'
    ): Promise<EventListResponse> {
        const args = ['exec', '-n', 'kube9-system', 'deploy/kube9-operator', '--', 'kube9-operator', 'query', 'events', 'list'];
        
        // Add filters
        if (filters?.type?.length) {
            args.push(`--type=${filters.type.join(',')}`);
        }
        if (filters?.severity?.length) {
            args.push(`--severity=${filters.severity.join(',')}`);
        }
        if (filters?.since) {
            args.push(`--since=${filters.since}`);
        }
        if (filters?.objectKind) {
            args.push(`--object-kind=${filters.objectKind}`);
        }
        if (filters?.objectName) {
            args.push(`--object-name=${filters.objectName}`);
        }
        if (filters?.objectNamespace) {
            args.push(`--object-namespace=${filters.objectNamespace}`);
        }
        if (filters?.searchText) {
            args.push(`--search=${filters.searchText}`);
        }
        
        // Add pagination
        args.push(`--page=${page}`);
        args.push(`--per-page=${perPage}`);
        
        // Add sorting
        if (sortBy) {
            args.push(`--sort-by=${sortBy}`);
            args.push(`--sort-direction=${sortDirection}`);
        }
        
        // Request JSON format
        args.push('--format=json');
        
        return this.exec(args, context);
    }
    
    /**
     * Get a single event by ID
     * 
     * @param context - Kubectl context name
     * @param eventId - Event ID
     * @returns Promise with event details
     */
    async getEvent(context: string, eventId: string): Promise<Event> {
        const args = ['exec', '-n', 'kube9-system', 'deploy/kube9-operator', '--', 'kube9-operator', 'query', 'events', 'get', eventId, '--format=json'];
        return this.exec(args, context);
    }
    
    /**
     * Execute kubectl command and parse JSON response
     * 
     * @param args - kubectl arguments
     * @param context - Kubectl context name
     * @returns Promise with parsed JSON response
     */
    private async exec(args: string[], context: string): Promise<any> {
        try {
            const result = await execKubectl(args, context, 30000); // 30 second timeout
            
            if (!result.success || result.exitCode !== 0) {
                throw new Error(`Operator query failed: ${result.stderr || 'Unknown error'}`);
            }
            
            return JSON.parse(result.stdout);
        } catch (error: any) {
            // Check if operator is not installed
            if (error.message?.includes('not found') || error.message?.includes('NotFound')) {
                throw new Error('Operator not installed in cluster');
            }
            
            // Check for timeout
            if (error.message?.includes('timeout')) {
                throw new Error('Query timeout - operator may be busy or unavailable');
            }
            
            throw new Error(`Failed to query events: ${error.message}`);
        }
    }
}
```

## Files to Create

- `src/services/EventQueryTypes.ts` - TypeScript interfaces
- `src/services/EventQueryClient.ts` - Query client class

## Testing

Manual test (requires operator installed in test cluster):
1. Create test script to instantiate EventQueryClient
2. Call `listEvents()` with no filters
3. Verify JSON response is parsed correctly
4. Test with various filters
5. Test error handling (disconnect cluster to simulate failure)

## Dependencies

- Depends on existing `execKubectl` function from `src/kubectl/KubectlCommandRunner.ts`
- Requires kube9-operator with event query support (operator-side implementation)

## Notes

- This implementation assumes the operator CLI binary supports the query interface
- Until operator event support is complete, queries will fail gracefully with "Operator not installed" error
- The 30-second timeout is configurable and may need adjustment based on performance testing
- Error messages are user-friendly and actionable

