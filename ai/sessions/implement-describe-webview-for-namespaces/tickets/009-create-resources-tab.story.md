---
story_id: 009-create-resources-tab
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Create Resources Tab Component

## Objective

Create React component for the Resources tab showing comprehensive resource counts with health indicators.

## Acceptance Criteria

- ResourcesTab component organized by sections: Workloads, Services & Networking, Configuration, Storage, Batch
- Each resource row shows type name, count, and details (where applicable)
- Pods show breakdown by status (Running, Pending, Failed)
- Services show breakdown by type (ClusterIP, NodePort, LoadBalancer)
- Jobs show breakdown by status (Active, Completed, Failed)
- PVCs show breakdown by phase (Bound, Pending)
- Health indicators with color coding (green=healthy, yellow=degraded, red=failed)
- Clickable resource rows send navigation message to extension
- Empty state message when namespace has no resources

## Files to Create/Modify

- `media/describe/NamespaceDescribeApp.tsx` - Add ResourcesTab component
- Or create separate `media/describe/components/ResourcesTab.tsx` if preferred

## Implementation Notes

Component structure:
```tsx
const ResourcesTab: React.FC<{resources: ResourceSummary; namespace: string; vscode: VSCodeAPI}> = 
  ({resources, namespace, vscode}) => (
  <div className="resources-tab">
    <section className="resource-section">
      <h2>Workloads</h2>
      <ResourceTable>
        <ResourceRow
          type="Pods"
          count={resources.pods.total}
          details={`${resources.pods.running} Running, ${resources.pods.pending} Pending, ${resources.pods.failed} Failed`}
          health={calculatePodHealth(resources.pods)}
          onClick={() => vscode.postMessage({
            command: 'navigateToResource',
            data: {resourceType: 'pods', namespace}
          })}
        />
        {/* More workload types */}
      </ResourceTable>
    </section>
    {/* More sections: Services & Networking, Configuration, Storage, Batch */}
  </div>
);
```

Health calculation:
- Pods: Green if all running, yellow if some pending, red if any failed
- Services/ConfigMaps/Secrets: No health indicator (just counts)
- Jobs: Yellow if any active, red if any failed
- PVCs: Yellow if any pending, red if any lost

## Estimated Time

30 minutes

## Dependencies

- Story 007 (requires NamespaceDescribeApp base)

