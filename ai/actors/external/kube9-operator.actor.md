---
actor_id: kube9-operator
type: external
---

# kube9-operator Actor

## Overview

The kube9-operator is an optional Kubernetes operator that runs within a cluster to enable Pro tier features. It collects metrics, syncs with kube9-server, and provides rich data to the VS Code Extension through ConfigMaps stored in the cluster.

## Type

External System Actor - Optional component for Pro tier

## Characteristics

### Technical Profile
- **Deployment**: Kubernetes Deployment in `kube9-system` namespace
- **Language**: Go (kube9-operator project)
- **Persistence**: SQLite database in mounted volume
- **Communication**: 
  - Outbound HTTPS to kube9-server (pulls insights)
  - Inbound: kubectl exec to CLI for queries
- **Data Storage**: ConfigMaps in kube9-system namespace

### Capabilities
- Collect sanitized cluster metrics
- Sync with kube9-server to pull AI insights
- Store insights and data in local SQLite database
- Expose data via CLI tool (queried by extension using kubectl exec)
- Update status ConfigMap with health and mode
- Aggregate dashboard data into ConfigMap
- De-obfuscate insights using local resource mapping

## Responsibilities

### Status Management
- Maintain `kube9-operator-status` ConfigMap
- Update status every 60 seconds
- Report mode: operated (free) or enabled (pro)
- Report health: healthy, degraded, unhealthy
- Include version, tier, registration status

### Data Aggregation
- Collect cluster-wide resource counts
- Aggregate node and pod statistics
- Calculate resource utilization metrics
- Store aggregated data in `kube9-dashboard-data` ConfigMap

### AI Insights Sync
- Poll kube9-server every hour for new insights
- Pull insights with obfuscated resource names
- De-obfuscate using local resource name mapping
- Store in SQLite database (`/data/kube9.db`)
- Update `kube9-ai-recommendations` ConfigMap with recent insights

### CLI Query Interface
- Provide CLI tool for rich queries
- Accept commands via kubectl exec:
  ```bash
  kubectl exec -n kube9-system deploy/kube9-operator -- \
    kube9-operator query <command> --format=json
  ```
- Support commands:
  - `status` - Operator status and health
  - `insights list` - List insights with filtering
  - `insights ack <id>` - Acknowledge insight
  - `assessments summary` - Framework assessment summary

### Metrics Collection
- Sanitize all collected data (no secrets, credentials, sensitive info)
- Track cluster resources and utilization
- Monitor operator health and performance
- Push sanitized metrics to kube9-server

## Interactions

### With VSCode Extension
- **Method**: Indirect via Kubernetes API
- **Data Exchange**: 
  - Extension queries ConfigMaps via kubectl get
  - Extension executes CLI queries via kubectl exec
- **Frequency**: 
  - Status checked every 5 minutes (with cache)
  - Dashboard data fetched on dashboard open
  - Insights queried on-demand

### With Kubernetes Cluster
- **Method**: Kubernetes client libraries (Go)
- **Operations**:
  - List and watch resources for metrics
  - Create/update ConfigMaps for data storage
  - Read resource names for de-obfuscation
- **Permissions**: ServiceAccount with RBAC for required resources

### With kube9-server
- **Method**: HTTPS POST/GET
- **Direction**: Operator initiates (outbound only, no cluster ingress needed)
- **Operations**:
  - Register cluster with API key
  - Push sanitized metrics hourly
  - Pull AI insights hourly
  - Request on-demand analysis
- **Authentication**: API key configured in operator

## Data Provided

### Status ConfigMap (Always)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-operator-status
  namespace: kube9-system
data:
  status: |
    {
      "mode": "operated",  // or "enabled"
      "tier": "free",      // or "pro"
      "version": "1.0.0",
      "health": "healthy",
      "lastUpdate": "2024-01-15T10:30:00Z",
      "registered": false, // or true
      "apiKeyConfigured": false // or true
    }
```

### Dashboard Data ConfigMap (Operated/Enabled)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-dashboard-data
  namespace: kube9-system
data:
  metrics: |
    {
      "namespaceCount": 12,
      "deploymentCount": 45,
      "podCount": 178,
      "nodeCount": 5,
      "cpuUsage": 67.5,
      "memoryUsage": 72.3,
      "lastUpdate": "2024-01-15T10:30:00Z"
    }
```

### AI Recommendations ConfigMap (Enabled, with API key)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube9-ai-recommendations
  namespace: kube9-system
data:
  recommendations: |
    [
      {
        "id": "insight-123",
        "severity": "warning",
        "category": "security",
        "title": "Container running as root",
        "description": "...",
        "affectedResources": ["deployment/api-server"],
        "recommendation": "...",
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
```

## Operational Modes

### Mode: basic
- **Meaning**: Operator not installed
- **Extension Behavior**: Free tier features only
- **ConfigMap**: Not present

### Mode: operated
- **Meaning**: Operator installed, no API key
- **Tier**: Free
- **ConfigMap**: Status ConfigMap present
- **Features**: Operator status visible, basic dashboard data
- **Extension Behavior**: Shows operated dashboard with upsell CTA

### Mode: enabled
- **Meaning**: Operator installed with valid API key
- **Tier**: Pro
- **ConfigMap**: Status + Dashboard + AI Recommendations
- **Features**: AI insights, on-demand analysis, rich metrics
- **Extension Behavior**: Shows full operated dashboard with AI panel

### Mode: degraded
- **Meaning**: Operator installed but unhealthy
- **Causes**: 
  - Stale status (>5 minutes since last update)
  - Health reported as "degraded" or "unhealthy"
  - Registered but not properly configured
- **Extension Behavior**: Shows warning, limited functionality

## Behavioral Patterns

### Sync Cycle
```
Every hour:
1. Collect cluster metrics
2. Sanitize data (remove sensitive info)
3. Push metrics to kube9-server
4. Pull latest insights from kube9-server (obfuscated)
5. De-obfuscate insights using local mappings
6. Store in SQLite database
7. Update ConfigMaps with recent data
8. Update status with timestamp
```

### On-Demand Analysis
```
1. Extension calls: kubectl exec ... kube9-operator query analyze ...
2. Operator CLI validates request
3. Checks daily analysis quota (24 per day)
4. Sends analysis request to kube9-server
5. Server queues analysis (may take minutes)
6. Next sync cycle pulls results
7. Insights appear in extension
```

### Health Monitoring
```
Every 60 seconds:
1. Check last server sync time
2. Validate database accessibility
3. Test Kubernetes API connectivity
4. Determine health status
5. Update status ConfigMap
6. If unhealthy, set mode to degraded
```

## Performance Characteristics

### Resource Usage
- CPU: Minimal (< 50m typical)
- Memory: ~100MB with SQLite database
- Storage: ~50MB for SQLite database
- Network: Hourly sync (~1MB/hour)

### Response Times
- CLI queries: < 500ms (local database)
- Status updates: Every 60 seconds
- Insight sync: Every 60 minutes
- On-demand analysis: Queued, results in minutes

## Error Conditions

### Common Issues
- **Server Unreachable**: Falls back to cached insights, sets health to degraded
- **Invalid API Key**: Cannot pull insights, shows upsell in extension
- **Permission Errors**: Cannot collect metrics, logs error
- **Database Corruption**: Recreates database, may lose cached insights
- **Quota Exceeded**: Rejects on-demand analysis requests

### Recovery Strategies
- Automatic retry with exponential backoff
- Fall back to cached data when server unavailable
- Graceful degradation of features
- Clear error messages in status ConfigMap

## Security Considerations

### Data Sanitization
- **Never sends**: Secrets, credentials, environment variables, sensitive labels
- **Obfuscates**: Resource names, namespace names (server only sees IDs)
- **Aggregates**: Metrics (no individual resource data sent)

### Network Security
- All communication over HTTPS
- API key stored in Kubernetes Secret
- No cluster ingress required (operator initiates connections)
- Certificate validation for server connections

### RBAC Permissions
- Read access to required resources
- Write access only to kube9-system ConfigMaps
- No cluster-admin privileges needed
- User controls access via RBAC

## Installation States

### Not Installed
- No resources in kube9-system namespace
- Extension operates in free tier mode
- No ConfigMaps present

### Installed (No API Key)
- Operator running in kube9-system
- Status ConfigMap present (mode: operated, tier: free)
- Dashboard data ConfigMap present
- No AI recommendations ConfigMap
- Extension shows operated dashboard with upsell

### Installed (With API Key)
- Operator running in kube9-system
- All ConfigMaps present
- Mode: enabled, tier: pro
- AI insights syncing hourly
- Extension shows full pro features

### Degraded
- Operator present but unhealthy
- Status ConfigMap stale (>5 minutes)
- May be restarting, network issues, or misconfig
- Extension shows warning

## Related Actors

- **VSCode Extension**: Primary consumer of operator data
- **Kubernetes Cluster**: Hosts operator and provides resources to monitor
- **kube9-server**: Provides AI insights and analysis
- **Developer**: Benefits from insights provided by operator

