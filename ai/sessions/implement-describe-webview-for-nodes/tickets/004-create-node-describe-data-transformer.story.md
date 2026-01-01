---
story_id: create-node-describe-data-transformer
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Create NodeDescribeData Transformer

## Objective

Create a module that transforms raw Kubernetes V1Node and V1Pod[] data into the NodeDescribeData structure needed for webview display.

## Context

The webview needs structured data that combines node information with calculated metrics (resource usage, allocation percentages). This transformer takes raw API data and produces display-ready data.

## Files to Create

- `src/webview/nodeDescribeTransformer.ts` (new file)

## Implementation Steps

1. Define all TypeScript interfaces from spec:
   - NodeDescribeData
   - NodeOverview
   - NodeResources
   - ResourceMetric
   - NodeCondition
   - NodePodInfo
   - NodeAddress
   - NodeTaint
   - ResourceAllocation
   - AllocationMetric

2. Create main transformation function:
```typescript
export function transformNodeData(
  v1Node: k8s.V1Node,
  v1Pods: k8s.V1Pod[]
): NodeDescribeData
```

3. Implementation should:
   - Extract overview data from v1Node.metadata and v1Node.status
   - Calculate resource metrics from capacity, allocatable, and pod requests
   - Use parseKubernetesQuantity() and formatQuantity() from utils
   - Transform conditions with formatRelativeTime() for relative timestamps
   - Extract addresses from v1Node.status.addresses
   - Extract labels from v1Node.metadata.labels
   - Extract taints from v1Node.spec.taints
   - Calculate aggregate allocation from all pod requests and limits
   - Handle missing/null fields gracefully with defaults

4. Export all interfaces and the transformation function

## Acceptance Criteria

- [ ] All TypeScript interfaces defined and exported
- [ ] transformNodeData() function created and exported
- [ ] Function accepts V1Node and V1Pod[] parameters
- [ ] Function returns complete NodeDescribeData object
- [ ] Overview section populated with all required fields
- [ ] Resources section calculates capacity, allocatable, used, available, and percentages
- [ ] Conditions section includes relative time formatting
- [ ] Pods section extracts name, namespace, status, requests, limits, restarts
- [ ] Addresses section extracts all address types
- [ ] Labels extracted and returned as Record<string, string>
- [ ] Taints extracted with key, value, and effect
- [ ] Allocation section calculates total requests and limits with percentages
- [ ] Handles null/undefined fields without throwing errors
- [ ] Uses utility functions from kubernetesQuantity and timeFormatting

## Estimated Time

< 30 minutes

## Dependencies

- Requires story 003 (utility functions) to be completed

