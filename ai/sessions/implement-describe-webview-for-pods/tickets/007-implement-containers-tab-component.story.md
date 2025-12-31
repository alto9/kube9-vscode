---
story_id: 007-implement-containers-tab-component
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 30
---

# Implement Containers Tab Component

## Objective

Create the Containers tab component that displays detailed information about all containers (init and regular) in the Pod.

## Acceptance Criteria

- [ ] Create `src/webview/pod-describe/components/ContainersTab.tsx`
- [ ] Create `src/webview/pod-describe/components/ContainerCard.tsx` for individual containers
- [ ] Implement ContainersTab accepting `containers` and `initContainers` props
- [ ] Display init containers section if any exist
- [ ] Display regular containers section
- [ ] Each container shown as a card with:
  - Container name and image
  - Status (Running/Waiting/Terminated) with color indicator
  - Ready status
  - Restart count (with warning if > 0)
  - Resource requests and limits (CPU, memory)
  - Exposed ports
  - Environment variables (collapsible section)
  - Volume mounts (collapsible section)
- [ ] Use appropriate CSS classes for styling (container-card, container-status, etc.)
- [ ] Handle missing data gracefully

## Files Involved

**New Files:**
- `src/webview/pod-describe/components/ContainersTab.tsx`
- `src/webview/pod-describe/components/ContainerCard.tsx`

## Implementation Notes

Reference:
- Feature scenarios: `ai/features/webview/pod-describe-webview.feature.md` (lines 123-248)
- Spec CSS: `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 751-791)

ContainerCard structure:
```typescript
interface ContainerCardProps {
  container: ContainerInfo;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ container }) => {
  return (
    <div className="container-card">
      <div className="container-header">
        <h3>{container.name}</h3>
        <span className={`container-status ${container.status.state}`}>
          {container.status.state}
        </span>
      </div>
      <div className="container-details">
        <div>Image: {container.image}</div>
        <div>Ready: {container.ready ? 'Yes' : 'No'}</div>
        <div>Restarts: {container.restartCount}</div>
        {/* Resources, Ports, Environment, Volume Mounts */}
      </div>
    </div>
  );
};
```

## Dependencies

- Story 006 (PodDescribeApp must exist)

## Testing

- [ ] TypeScript compilation succeeds
- [ ] Component renders with valid data
- [ ] Init containers separated from regular containers
- [ ] Status indicators display correctly
- [ ] Collapsible sections work properly

