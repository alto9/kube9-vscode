---
story_id: 011-create-limit-ranges-tab
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Create Limit Ranges Tab Component

## Objective

Create React component for the Limit Ranges tab showing default limits and constraints.

## Acceptance Criteria

- LimitRangesTab component displays all limit range objects
- Each limit range object shown in separate card labeled with name
- Constraints organized by type (Container, Pod, PersistentVolumeClaim)
- Each constraint type shows applicable fields: Default Request, Default Limit, Min, Max, Max/Min Ratio
- Constraint types have clear labels with tooltips explaining their purpose
- Resource values formatted with units (m, Mi, Gi)
- Empty state message when no limit ranges configured
- Handles multiple limit range objects gracefully

## Files to Create/Modify

- `media/describe/NamespaceDescribeApp.tsx` - Add LimitRangesTab component
- Or create separate `media/describe/components/LimitRangesTab.tsx` if preferred

## Implementation Notes

Component structure:
```tsx
const LimitRangesTab: React.FC<{limitRanges: LimitRangeInfo[]}> = ({limitRanges}) => {
  if (limitRanges.length === 0) {
    return <EmptyState message="No limit ranges configured for this namespace" />;
  }
  
  return (
    <div className="limit-ranges-tab">
      {limitRanges.map(lr => (
        <section key={lr.name} className="limit-range-section">
          <h2>{lr.name}</h2>
          {lr.limits.map((limit, idx) => (
            <LimitRangeCard key={idx} type={limit.type} limit={limit} />
          ))}
        </section>
      ))}
    </div>
  );
};
```

LimitRangeCard should display:
- Type heading: "Container Limits", "Pod Limits", or "PVC Limits"
- Table with constraint types and their values
- Tooltips on constraint labels:
  - "Default Request": "Applied if container doesn't specify request"
  - "Default Limit": "Applied if container doesn't specify limit"
  - "Min": "Minimum value allowed"
  - "Max": "Maximum value allowed"

## Estimated Time

20 minutes

## Dependencies

- Story 007 (requires NamespaceDescribeApp base)

