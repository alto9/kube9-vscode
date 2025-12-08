---
actor_id: kube9-server
type: external
---

# kube9-server Actor

## Overview

The kube9-server is a cloud-hosted backend service that provides AI-powered analysis, insights generation, and data aggregation for Pro tier users. The VS Code Extension does NOT communicate directly with kube9-server; instead, the kube9-operator acts as an intermediary, pulling insights and pushing metrics.

## Type

External System Actor - Backend service (indirect interaction)

## Characteristics

### Technical Profile
- **Deployment**: Cloud-hosted service (managed by Alto9)
- **API**: RESTful HTTP API (used by operator, not extension)
- **Authentication**: API key based
- **Data Storage**: Persistent database for metrics, insights, user accounts
- **AI**: Machine learning models for cluster analysis

### Capabilities
- Generate AI insights from cluster metrics
- Perform on-demand deep analysis
- Aggregate data across multiple clusters (for Pro users)
- Train and refine recommendation models
- Manage user accounts and subscriptions
- Track usage quotas (24 analyses per day per cluster)

## Responsibilities

### AI Analysis
- Analyze cluster metrics for issues, security vulnerabilities, optimization opportunities
- Generate insights with severity, category, and recommendations
- Obfuscate resource names in insights (privacy protection)
- Continuously improve models based on feedback

### Insight Management
- Store generated insights
- Track insight acknowledgments and dismissals
- Provide insights via API for operator to pull
- Manage insight lifecycle and expiration

### Quota Management
- Track daily analysis quota per cluster (24/day)
- Enforce quota limits
- Provide quota status in API responses

### User Management
- Manage Pro tier subscriptions
- Validate API keys
- Track cluster registrations
- Handle billing and payments

## Interactions

### With kube9-operator
- **Method**: HTTPS API (operator initiates, not extension)
- **Operations**:
  - **POST /metrics**: Operator pushes sanitized cluster metrics
  - **GET /insights**: Operator pulls latest insights (obfuscated)
  - **POST /analyze**: Operator requests on-demand analysis
  - **POST /acknowledge**: Operator reports insight acknowledgments
- **Frequency**: Hourly sync + on-demand analysis requests
- **Authentication**: API key in request headers

### With VSCode Extension
- **Method**: NO DIRECT COMMUNICATION
- **Data Flow**: 
  ```
  Server → Operator (HTTPS API) → ConfigMaps (Kubernetes) → Extension (kubectl)
  ```
- **Privacy**: Extension never sends data to server, never connects to server

## Data Flow Architecture

### Metrics Upload (Operator → Server)
```
1. Operator collects and sanitizes metrics
2. Operator obfuscates resource names
3. POST /metrics with sanitized data
4. Server stores metrics
5. Server queues analysis job
6. Server generates insights
```

### Insights Delivery (Server → Operator → Extension)
```
1. Server generates insight (resource names are IDs)
2. Operator polls: GET /insights
3. Server returns insights with obfuscated names
4. Operator de-obfuscates using local mappings
5. Operator stores in SQLite and ConfigMap
6. Extension queries ConfigMap via kubectl
7. Extension displays insights to developer
```

### On-Demand Analysis (Extension → Operator → Server)
```
1. Developer clicks "Analyze with AI" in extension
2. Extension: kubectl exec ... query analyze <resource>
3. Operator checks quota (24/day)
4. Operator POST /analyze to server
5. Server queues analysis
6. Server analyzes within minutes
7. Operator pulls results on next sync (hourly)
8. Results appear in extension
```

## Data Model

### Metrics Payload (from Operator)
```json
{
  "clusterId": "uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "resources": {
    "namespace_001": {
      "deployments": 12,
      "pods": 45,
      "avgCpuUsage": 67.5
    }
  },
  "obfuscationMap": {
    "namespace_001": "production",
    "deployment_002": "api-server"
  }
}
```

### Insights Response (to Operator)
```json
{
  "insights": [
    {
      "id": "insight-123",
      "severity": "warning",
      "category": "security",
      "title": "Container running as root",
      "description": "...",
      "affectedResources": ["deployment_002"],  // Obfuscated
      "recommendation": "...",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "quotaRemaining": 18,
  "quotaLimit": 24
}
```

## API Endpoints (used by Operator)

### POST /api/v1/metrics
- **Auth**: API key
- **Body**: Sanitized cluster metrics
- **Response**: 200 OK

### GET /api/v1/insights
- **Auth**: API key
- **Query Params**: since (timestamp)
- **Response**: List of insights with obfuscated names

### POST /api/v1/analyze
- **Auth**: API key
- **Body**: Analysis request (resource type, obfuscated ID)
- **Response**: 202 Accepted (queued)

### POST /api/v1/acknowledge
- **Auth**: API key
- **Body**: Insight ID
- **Response**: 200 OK

### GET /api/v1/quota
- **Auth**: API key
- **Response**: Quota usage and limits

## Privacy & Security

### Data Sanitization
- Operator removes all sensitive data before sending to server
- Resource names obfuscated (server never sees real names)
- No secrets, credentials, or environment variables sent
- Metrics aggregated (no individual resource data)

### Obfuscation Strategy
```
Real: namespace=production, deployment=api-server
Sent to server: namespace_001, deployment_002
Operator maintains local mapping
Server generates insights using IDs
Operator de-obfuscates on retrieval
Extension sees real names
```

### Access Control
- API key required for all requests
- API keys tied to user accounts
- Usage tracked per API key
- Quota enforced per API key

## Error Conditions

### Server Unavailable
- Operator falls back to cached insights
- Extension continues working with local data
- Operator retries with exponential backoff

### Invalid API Key
- Server returns 401 Unauthorized
- Operator logs error, sets status to degraded
- Extension shows "API key invalid" in status

### Quota Exceeded
- Server returns 429 Too Many Requests
- Operator queues request for next day
- Extension shows "Daily quota exceeded" message

### Analysis Timeout
- Server may take minutes for complex analysis
- Operator polls for results on next sync
- Extension shows "Analysis in progress"

## Tier Management

### Free Tier (No API Key)
- Operator installed but not registered
- No metrics sent to server
- No insights generated
- Extension shows upsell CTA

### Pro Tier (Valid API Key)
- Operator registered and syncing
- Metrics sent hourly
- Insights generated continuously
- 24 on-demand analyses per day
- Extension shows full features

## Performance Characteristics

### Response Times
- Metrics upload: < 1 second
- Insights retrieval: < 1 second
- On-demand analysis: Queued, results in 1-5 minutes
- Quota check: < 500ms

### Sync Frequency
- Operator syncs every 60 minutes
- Insights are near real-time (hourly refresh)
- Metrics uploaded hourly

## Related Actors

- **kube9-operator**: Direct client of kube9-server API
- **VSCode Extension**: Indirect beneficiary (no direct communication)
- **Developer**: Receives AI insights via extension
- **Kubernetes Cluster**: Source of metrics (via operator)

## Important Notes

**Extension-Server Relationship:**
- Extension does NOT communicate with kube9-server
- Extension does NOT know server URL
- Extension does NOT send API keys
- Extension queries operator data locally via kubectl
- Privacy-preserving architecture: Extension → kubectl → Operator → Server

**Data Flow Direction:**
- Server → Operator: Insights (pull model)
- Operator → Server: Metrics (push model)
- Extension → Operator: Queries (kubectl exec)
- Extension ← Operator: Data (ConfigMaps and CLI responses)

