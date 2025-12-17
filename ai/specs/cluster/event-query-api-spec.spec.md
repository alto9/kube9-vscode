---
spec_id: event-query-api-spec
feature_id:
  - event-viewer
context_id:
  - kubernetes-cluster-management
---

# Event Query API Specification (Extension Side)

## Overview

This specification defines how the VS Code extension queries cluster events from the kube9-operator via kubectl exec. The extension executes the `kube9-operator` CLI binary bundled in the operator pod image, which provides a query interface to retrieve event data from the operator's SQLite database.

## Related Specifications

This specification references the operator-side event API defined in `kube9-operator/ai/specs/api/event-api-spec.spec.md`. The extension queries events using the operator's CLI query tool.

## Query Method

The extension queries events by executing the `kube9-operator` CLI binary bundled in the operator pod via `kubectl exec`:

```bash
kubectl exec -n kube9-system deploy/kube9-operator -- \
  kube9-operator query events list \
  [filters] \
  --page=1 \
  --per-page=20 \
  --format=json
```

**Key Components**:
- **kubectl exec**: Executes commands inside the operator pod
- **kube9-operator binary**: CLI binary bundled in the operator pod image
- **query events subcommands**: Query interface provided by the CLI binary
- **SQLite database**: Event storage inside the operator pod (queried by the CLI binary)

## Event Query Client

### Client Interface

```typescript
interface EventFilters {
  type?: string[];           // Event types to include
  severity?: string[];       // Severities to include
  since?: string;            // ISO 8601 timestamp or relative (e.g., "24h")
  objectKind?: string;       // Filter by object kind
  objectName?: string;       // Filter by object name
  objectNamespace?: string;  // Filter by namespace
  searchText?: string;       // Full-text search
}

interface EventListResponse {
  events: Event[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalCount: number;
    totalPages: number;
  };
}

interface Event {
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

class EventQueryClient {
  /**
   * List events with filters and pagination
   */
  async listEvents(
    context: string,
    filters?: EventFilters,
    page: number = 1,
    perPage: number = 20,
    sortBy?: string,
    sortDirection: "asc" | "desc" = "desc"
  ): Promise<EventListResponse> {
    const args = ['query', 'events', 'list'];
    
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
   */
  async getEvent(context: string, eventId: string): Promise<Event> {
    const args = ['query', 'events', 'get', eventId, '--format=json'];
    return this.exec(args, context);
  }
  
  /**
   * Get available event types
   */
  async getEventTypes(context: string): Promise<string[]> {
    const args = ['query', 'events', 'types', '--format=json'];
    const result = await this.exec(args, context);
    return result.types;
  }
  
  /**
   * Execute kubectl command to operator CLI
   */
  private async exec(command: string[], context: string): Promise<any> {
    try {
      const result = await kubectl.exec(
        'kube9-system',
        'deploy/kube9-operator',
        ['kube9-operator', ...command],
        context
      );
      
      if (result.exitCode !== 0) {
        throw new Error(`Operator query failed: ${result.stderr}`);
      }
      
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Failed to query events: ${error.message}`);
    }
  }
}
```

## Query Parameters

### Event Type Filter

Valid values:
- `cluster` - Cluster-wide events
- `operator` - Operator lifecycle events
- `insight` - Insight generation events
- `assessment` - Assessment completion events
- `workload` - Workload lifecycle events
- `system` - Internal system events

Multiple types can be specified as comma-separated list:
```bash
--type=cluster,operator,insight
```

### Severity Filter

Valid values:
- `critical` - Critical issues requiring immediate attention
- `error` - Errors that need resolution
- `warning` - Warnings that should be reviewed
- `info` - Informational events

Multiple severities can be specified as comma-separated list:
```bash
--severity=critical,error,warning
```

### Time Range Filter

The `--since` parameter accepts:

#### Relative Time

- `1h` - Last 1 hour
- `6h` - Last 6 hours
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days

#### Absolute Time

ISO 8601 timestamp:
```bash
--since=2025-12-17T10:00:00Z
```

#### Default

If not specified, defaults to all events.

### Object Filters

Filter events by affected Kubernetes object:

```bash
--object-kind=Deployment
--object-name=api-server
--object-namespace=production
```

### Search Filter

Full-text search in event description and object name:

```bash
--search="CPU throttling"
```

### Pagination

```bash
--page=1              # Page number (1-indexed)
--per-page=20         # Results per page (default: 20, max: 100)
```

### Sorting

```bash
--sort-by=timestamp        # Field to sort by (timestamp, type, severity)
--sort-direction=desc      # Sort direction (asc, desc)
```

## Response Format

### List Events Response

```json
{
  "events": [
    {
      "id": "evt_abc123",
      "type": "insight",
      "severity": "warning",
      "timestamp": "2025-12-17T10:30:00Z",
      "description": "CPU throttling detected in api-server deployment",
      "objectKind": "Deployment",
      "objectName": "api-server",
      "objectNamespace": "production",
      "metadata": {
        "container": "app",
        "throttlePercentage": 45,
        "recommendedCpuLimit": "2000m"
      },
      "relatedEventIds": ["evt_def456"]
    },
    {
      "id": "evt_def789",
      "type": "assessment",
      "severity": "error",
      "timestamp": "2025-12-17T09:15:00Z",
      "description": "Security pillar assessment failed",
      "objectKind": "Cluster",
      "objectName": "prod-cluster-01",
      "metadata": {
        "pillar": "security",
        "failingChecks": 3,
        "criticalCount": 1
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "perPage": 20,
    "totalCount": 87,
    "totalPages": 5
  }
}
```

### Get Event Response

```json
{
  "id": "evt_abc123",
  "type": "insight",
  "severity": "warning",
  "timestamp": "2025-12-17T10:30:00Z",
  "description": "CPU throttling detected in api-server deployment",
  "objectKind": "Deployment",
  "objectName": "api-server",
  "objectNamespace": "production",
  "metadata": {
    "container": "app",
    "throttlePercentage": 45,
    "recommendedCpuLimit": "2000m",
    "detectedAt": "2025-12-17T10:25:00Z",
    "insightId": "ins_xyz789"
  },
  "relatedEventIds": ["evt_def456", "evt_ghi789"]
}
```

### Get Event Types Response

```json
{
  "types": [
    "cluster",
    "operator",
    "insight",
    "assessment",
    "workload",
    "system"
  ]
}
```

## Error Handling

### Operator Not Installed

When the operator is not installed (non-operated cluster):

```typescript
// kubectl exec fails with "no such deployment"
// Extension should handle this gracefully and show call-to-action
```

### Operator Unreachable

When the operator pod is not running or unreachable:

```typescript
// kubectl exec fails with connection error
// Extension should show error message with retry option
```

### Query Timeout

When the query takes too long:

```typescript
// Set timeout for kubectl exec (e.g., 30 seconds)
// Show timeout error message
```

### Invalid Parameters

When invalid parameters are provided:

```json
{
  "error": "Invalid parameter: type must be one of [cluster, operator, insight, assessment, workload, system]",
  "code": "INVALID_PARAMETER"
}
```

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Error codes:
- `INVALID_PARAMETER` - Invalid query parameter
- `DATABASE_ERROR` - Event database error
- `INTERNAL_ERROR` - Internal operator error

## Time Range Mapping

Extension UI → Query Parameter mapping:

| UI Selection | Query Parameter |
|--------------|----------------|
| Last 1 hour | `--since=1h` |
| Last 6 hours | `--since=6h` |
| Last 24 hours | `--since=24h` |
| Last 7 days | `--since=7d` |
| Last 30 days | `--since=30d` |
| All Time | (omit --since) |

## kubectl Exec Implementation

### Execution Details

```typescript
interface KubectlExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function execOperatorQuery(
  args: string[],
  context: string,
  timeout: number = 30000
): Promise<KubectlExecResult> {
  const command = [
    'kubectl',
    'exec',
    '-n', 'kube9-system',
    'deploy/kube9-operator',
    '--context', context,
    '--',
    'kube9-operator',
    ...args
  ];
  
  return executeCommand(command, { timeout });
}
```

### Timeout Configuration

- Default timeout: 30 seconds
- Configurable via extension settings
- Show timeout error if exceeded

### Retry Logic

- Automatic retry on transient network errors
- Maximum 3 retries with exponential backoff
- Don't retry on invalid parameter errors

## Performance Considerations

### Query Optimization

- Use pagination to limit result size
- Apply filters server-side (don't fetch all and filter client-side)
- Cache operator availability status (don't check on every query)

### Response Size Limits

- Maximum events per page: 100
- Maximum metadata size per event: 10KB
- Large metadata should be truncated with indication

### Parallel Queries

- Don't make multiple parallel queries to same operator
- Queue queries if needed
- Show loading state during query

## Integration with Operator

### Operator Requirements

The operator must:
1. **Bundle CLI binary**: Include `kube9-operator` binary in the operator pod image
2. **Provide query interface**: CLI binary must support `kube9-operator query events` subcommands
3. **Store events locally**: Maintain SQLite database in operator pod with event table
4. **Support query parameters**: Handle all query parameters listed above (filters, pagination, sorting)
5. **Return JSON format**: CLI binary outputs structured JSON responses (via `--format=json`)
6. **Handle pagination correctly**: Implement server-side pagination in SQLite queries
7. **Maintain backward compatibility**: Keep CLI interface stable across operator versions

### Version Compatibility

- Extension should check operator version
- Display warning if operator version is too old
- Gracefully handle missing query features in old versions

## Testing Considerations

### Unit Tests

- Query parameter building
- Response parsing
- Error handling
- Time range conversion
- Filter combination logic

### Integration Tests

- Query events from operator
- Apply filters and verify results
- Pagination navigation
- Error handling (operator down, timeout)
- Response parsing with various event types

### End-to-End Tests

- Query events from real cluster
- Apply all filter combinations
- Navigate all pages
- Handle operator unavailability
- Verify performance with large event sets (1000+ events)

## Security Considerations

### RBAC Requirements

Extension users need permission to exec into operator pod:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: kube9-event-reader
  namespace: kube9-system
rules:
- apiGroups: [""]
  resources: ["pods", "pods/exec"]
  verbs: ["get", "list", "create"]
```

Most cluster admins grant this by default.

### Data Privacy

- Events contain cluster information (resource names, namespaces)
- All queries stay within cluster (no external communication)
- No event data sent to kube9-server
- Events stored locally in operator database

### Query Injection Prevention

- Sanitize all user input before building query
- Use parameterized queries in operator
- Validate filter values against allowed lists
- Escape special characters in search text

