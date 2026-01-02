---
story_id: 007-implement-conditions-tab-component
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: completed
estimated_minutes: 15
---

# Implement Conditions Tab Component

## Objective

Create the Conditions tab component that displays Pod conditions in a table format with status indicators.

## Acceptance Criteria

- [x] Create `src/webview/pod-describe/components/ConditionsTab.tsx`
- [x] Implement ConditionsTab accepting `conditions: PodCondition[]` prop
- [x] Display conditions in a table with columns: Type, Status, Last Transition, Reason, Message
- [x] Status column shows True/False/Unknown with color indicators:
  - True: green indicator
  - False: red indicator
  - Unknown: gray indicator
- [x] Display last transition time in human-readable format
- [x] Show reason and message if available
- [x] Highlight rows where Status is False for visibility
- [x] Sort conditions by last transition time (most recent first)
- [x] Handle empty conditions gracefully

## Files Involved

**New Files:**
- `src/webview/pod-describe/components/ConditionsTab.tsx`
- `src/webview/pod-describe/utils/dateUtils.ts`

## Implementation Notes

Reference:
- Feature scenarios: `ai/features/webview/pod-describe-webview.feature.md` (lines 250-278)

Component structure:
```typescript
interface ConditionsTabProps {
  conditions: PodCondition[];
}

const ConditionsTab: React.FC<ConditionsTabProps> = ({ conditions }) => {
  const sortedConditions = [...conditions].sort((a, b) => 
    new Date(b.lastTransitionTime).getTime() - new Date(a.lastTransitionTime).getTime()
  );

  return (
    <div className="conditions-tab">
      <table className="conditions-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Last Transition</th>
            <th>Reason</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {sortedConditions.map((condition, index) => (
            <tr key={index} className={condition.status === 'False' ? 'condition-failed' : ''}>
              <td>{condition.type}</td>
              <td>
                <span className={`status-indicator status-${condition.status.toLowerCase()}`}>
                  {condition.status}
                </span>
              </td>
              <td>{formatTime(condition.lastTransitionTime)}</td>
              <td>{condition.reason || '-'}</td>
              <td>{condition.message || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Dependencies

- Story 006 (PodDescribeApp must exist)

## Testing

- [x] TypeScript compilation succeeds
- [x] Component renders with valid data
- [x] Status indicators display correctly
- [x] Sorting works properly
- [x] Failed conditions are highlighted

