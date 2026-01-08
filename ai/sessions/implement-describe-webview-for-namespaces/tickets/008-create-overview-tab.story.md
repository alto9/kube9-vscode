---
story_id: 008-create-overview-tab
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Create Overview Tab Component

## Objective

Create React component for the Overview tab showing namespace status, metadata, labels, and annotations.

## Acceptance Criteria

- OverviewTab component displays namespace name, phase, age, creation timestamp
- Status and metadata shown in info grid layout
- UID and resource version displayed
- Labels section with all labels (if any)
- Annotations section with all annotations (if any)
- Labels and annotations are copyable
- Handles missing/empty labels and annotations gracefully

## Files to Create/Modify

- `media/describe/NamespaceDescribeApp.tsx` - Add OverviewTab component
- Or create separate `media/describe/components/OverviewTab.tsx` if preferred

## Implementation Notes

Component structure:
```tsx
const OverviewTab: React.FC<{data: NamespaceOverview; metadata: NamespaceMetadata}> = ({data, metadata}) => (
  <div className="overview-tab">
    <section className="info-section">
      <h2>Status</h2>
      <InfoGrid>
        <InfoItem label="Name" value={data.name} />
        <InfoItem label="Phase" value={data.phase} />
        <InfoItem label="Age" value={data.age} />
        <InfoItem label="Created" value={formatTimestamp(data.creationTimestamp)} />
      </InfoGrid>
    </section>
    
    <section className="info-section">
      <h2>Metadata</h2>
      <InfoGrid>
        <InfoItem label="UID" value={data.uid} copyable />
        <InfoItem label="Resource Version" value={data.resourceVersion} />
      </InfoGrid>
    </section>
    
    {Object.keys(metadata.labels).length > 0 && (
      <section>
        <h2>Labels</h2>
        <KeyValueList items={metadata.labels} copyable />
      </section>
    )}
    
    {Object.keys(metadata.annotations).length > 0 && (
      <section>
        <h2>Annotations</h2>
        <KeyValueList items={metadata.annotations} copyable />
      </section>
    )}
  </div>
);
```

Helper components: InfoGrid, InfoItem, KeyValueList

## Estimated Time

25 minutes

## Dependencies

- Story 007 (requires NamespaceDescribeApp base)

