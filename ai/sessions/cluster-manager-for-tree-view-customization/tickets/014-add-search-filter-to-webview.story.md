---
story_id: 014-add-search-filter-to-webview
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Add Search Filter to Webview

## Objective

Add search input to webview toolbar that filters clusters by name or alias in real-time with highlighted matching text.

## Context

Users with many clusters need search to find specific clusters quickly. This adds the search UI with live filtering.

See:
- `ai/features/studio/cluster-manager-webview.feature.md` - Search filters clusters, clearing search
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Search and Filter section

## Acceptance Criteria

1. Add search input field to toolbar
2. Filter clusters as user types (case-insensitive)
3. Match against both cluster name (context name) and alias
4. Highlight matching text in results
5. Show "No clusters found" if no matches
6. Clear button to reset filter
7. Debounce search input (300ms) for performance

## Files to Create/Modify

- `media/cluster-manager/components/Toolbar.tsx` (new)
- `media/cluster-manager/components/SearchFilter.tsx` (new)
- `media/cluster-manager/index.tsx` (add toolbar, filter logic)

## Implementation Notes

```tsx
const filteredClusters = clusters.filter(cluster => {
  const customization = customizations.clusters[cluster.contextName];
  const displayName = customization?.alias || cluster.contextName;
  return displayName.toLowerCase().includes(searchTerm.toLowerCase());
});
```

Use `useMemo` to avoid re-filtering on every render.

Debounce:
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);
```

## Estimated Time

30 minutes









