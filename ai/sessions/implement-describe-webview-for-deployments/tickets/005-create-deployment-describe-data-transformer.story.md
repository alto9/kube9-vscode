---
story_id: create-deployment-describe-data-transformer
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Create Deployment Describe Data Transformer

## Objective

Create module that transforms raw Kubernetes API data (V1Deployment, V1ReplicaSet[], Events[]) into display-ready DeploymentDescribeData structure.

## Context

This transformer is the core logic that converts raw Kubernetes objects into structured, formatted data for the webview. It handles all data extraction, calculation, and formatting. Follows the pattern from NodeDescribeWebview transformation.

## Acceptance Criteria

- [ ] `deploymentDataTransformer.ts` file exists in `src/webview/` or `src/transformers/`
- [ ] Exports `transformDeploymentData()` function
- [ ] Function accepts: deployment (V1Deployment), replicaSets (V1ReplicaSet[]), events (CoreV1Event[])
- [ ] Returns complete DeploymentDescribeData structure
- [ ] All nested structures populated (overview, replicaStatus, strategy, podTemplate, conditions, etc.)
- [ ] Resource values formatted (millicores, Mi/Gi)
- [ ] Timestamps converted to relative times
- [ ] ReplicaSets sorted by revision (newest first)
- [ ] Current active ReplicaSet identified (isCurrent flag)
- [ ] Handles undefined/null values gracefully

## Implementation Steps

1. Create `src/webview/deploymentDataTransformer.ts`
2. Define all TypeScript interfaces from spec (DeploymentDescribeData, DeploymentOverview, ReplicaStatus, etc.)
3. Implement main function:
```typescript
export function transformDeploymentData(
    deployment: k8s.V1Deployment,
    replicaSets: k8s.V1ReplicaSet[],
    events: k8s.CoreV1Event[]
): DeploymentDescribeData
```
4. Implement helper functions:
   - `extractOverview(deployment)`
   - `extractReplicaStatus(deployment)`
   - `extractStrategy(deployment)`
   - `extractPodTemplate(deployment)`
   - `extractConditions(deployment)`
   - `transformReplicaSets(replicaSets, deployment)`
   - `transformEvents(events)`
   - `extractContainerInfo(container)`
   - `extractProbeInfo(probe)`
5. Use utility functions from previous story for parsing values
6. Handle RollingUpdate vs Recreate strategy differences
7. Calculate health status (isHealthy flag)
8. Filter events to last hour by default

## Files to Create

- `src/webview/deploymentDataTransformer.ts`

## Implementation Pattern

```typescript
export function transformDeploymentData(
    deployment: k8s.V1Deployment,
    replicaSets: k8s.V1ReplicaSet[],
    events: k8s.CoreV1Event[]
): DeploymentDescribeData {
    return {
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace,
        overview: extractOverview(deployment),
        replicaStatus: extractReplicaStatus(deployment),
        strategy: extractStrategy(deployment),
        podTemplate: extractPodTemplate(deployment),
        conditions: extractConditions(deployment),
        replicaSets: transformReplicaSets(replicaSets, deployment),
        labels: deployment.metadata.labels || {},
        selectors: deployment.spec.selector.matchLabels || {},
        annotations: deployment.metadata.annotations || {},
        events: transformEvents(events)
    };
}
```

## Related Patterns

See `src/webview/nodeDataTransformer.ts` for similar transformation structure.

