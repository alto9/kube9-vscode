---
story_id: 010-create-quotas-tab
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Create Quotas Tab Component

## Objective

Create React component for the Quotas tab showing resource quotas with usage progress bars.

## Acceptance Criteria

- QuotasTab component displays all resource quota objects
- Each quota object shown in separate section labeled with quota name
- Each resource shows: resource name, hard limit, current usage, percentage used
- Visual progress bars showing usage percentage
- Progress bar color changes based on usage: blue (<90%), yellow (90-99%), red (100%+)
- Warning indicators when approaching limits (>90%)
- Empty state message when no quotas configured
- Handles multiple quota objects gracefully

## Files to Create/Modify

- `media/describe/NamespaceDescribeApp.tsx` - Add QuotasTab component
- Or create separate `media/describe/components/QuotasTab.tsx` if preferred

## Implementation Notes

Component structure:
```tsx
const QuotasTab: React.FC<{quotas: ResourceQuotaInfo[]}> = ({quotas}) => {
  if (quotas.length === 0) {
    return <EmptyState message="No resource quotas configured for this namespace" />;
  }
  
  return (
    <div className="quotas-tab">
      {quotas.map(quota => (
        <section key={quota.name} className="quota-section">
          <h2>{quota.name}</h2>
          {Object.keys(quota.hard).map(resource => {
            const percent = quota.percentUsed[resource];
            const color = percent >= 100 ? 'red' : percent >= 90 ? 'yellow' : 'blue';
            
            return (
              <QuotaRow
                key={resource}
                resource={resource}
                hard={quota.hard[resource]}
                used={quota.used[resource] || '0'}
                percent={percent}
                color={color}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
};
```

QuotaRow should display:
- Resource name
- Usage text: "12 cores / 20 cores" or "42Gi / 64Gi"
- Percentage: "60%"
- Progress bar with appropriate color
- Warning icon if percent >= 90%

## Estimated Time

25 minutes

## Dependencies

- Story 007 (requires NamespaceDescribeApp base)

