---
story_id: add-event-commands-get-deployment-events
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Add Event Commands Get Deployment Events

## Objective

Create method to fetch Kubernetes events related to a specific deployment.

## Context

Events provide insight into deployment lifecycle actions (scaling, rollouts, errors). This command fetches events for a deployment by filtering on `involvedObject.kind=Deployment` and `involvedObject.name`. Events will be displayed in the deployment describe webview.

## Acceptance Criteria

- [ ] Method to fetch deployment events exists (add to appropriate commands file or create EventCommands.ts)
- [ ] Method accepts: `deploymentName`, `namespace`, `kubeconfigPath`, `contextName`
- [ ] Uses Kubernetes API client to fetch events
- [ ] Filters events for the specific deployment
- [ ] Returns array of CoreV1Event objects
- [ ] Returns empty array if no events found (not an error)
- [ ] Handles errors gracefully with typed error result

## Implementation Steps

1. Decide location: Either add to `WorkloadCommands.ts` or create new `src/kubectl/EventCommands.ts`
2. Add `DeploymentEventsResult` interface:
```typescript
export interface DeploymentEventsResult {
    events: k8s.CoreV1Event[];
    error?: KubectlError;
}
```
3. Add `getDeploymentEvents()` static method:
```typescript
public static async getDeploymentEvents(
    deploymentName: string,
    namespace: string,
    kubeconfigPath: string,
    contextName: string
): Promise<DeploymentEventsResult>
```
4. Implementation should:
   - Set API client context
   - Call `coreV1Api.listNamespacedEvent(namespace)`
   - Filter events where:
     - `involvedObject.kind === 'Deployment'`
     - `involvedObject.name === deploymentName`
   - Return filtered events array
5. Consider sorting by timestamp (most recent first)

## Files to Modify

- `src/kubectl/WorkloadCommands.ts` OR create `src/kubectl/EventCommands.ts`

## Notes

- Events may be large; consider limiting to last 50 events or events from last hour
- Event filtering can be done client-side after fetching all namespace events

