---
story_id: 005-implement-discovery-section
session_id: helm-package-manager
feature_id:
  - helm-chart-discovery
spec_id:
  - helm-chart-operations
status: completed
---

# Story: Implement Discover Charts Section Component

## Objective

Create the Discover Charts Section component with search functionality and chart results display.

## Context

The Discover Charts section allows users to search for charts across all repositories and browse results. See [helm-chart-discovery](../../features/helm/helm-chart-discovery.feature.md) for scenarios.

## Acceptance Criteria

- [x] Create `DiscoverChartsSection.tsx` component
- [x] Create `SearchBar.tsx` component with debounced input
- [x] Create `ChartResults.tsx` component for search results
- [x] Create `ChartResultCard.tsx` for individual chart display
- [x] Implement 300ms debounce on search input
- [x] Display chart name, version, description, repository
- [x] Handle loading state during search
- [x] Handle empty search results with helpful message
- [x] Make chart cards clickable to view details

## Implementation Notes

```typescript
interface DiscoverChartsSectionProps {
  searchResults: ChartSearchResult[];
  searching: boolean;
  onSearch: (query: string) => void;
  onChartClick: (chart: ChartSearchResult) => void;
}

export const DiscoverChartsSection: React.FC<DiscoverChartsSectionProps> = ({
  searchResults,
  searching,
  onSearch,
  onChartClick
}) => {
  return (
    <section className="discover-charts-section">
      <h2>🔍 Discover Charts</h2>
      <SearchBar onSearch={onSearch} debounceMs={300} />
      {searching && <LoadingSpinner />}
      {!searching && searchResults.length === 0 && (
        <EmptyState message="Search for charts by name..." />
      )}
      {!searching && searchResults.length > 0 && (
        <ChartResults results={searchResults} onClick={onChartClick} />
      )}
    </section>
  );
};
```

- Use `useDebounce` hook or `setTimeout` for debouncing
- Show loading skeleton while searching
- Empty state variations: no search vs no results

## Files Involved

- `src/webview/helm-package-manager/components/DiscoverChartsSection.tsx` (create new)
- `src/webview/helm-package-manager/components/SearchBar.tsx` (create new)
- `src/webview/helm-package-manager/components/ChartResults.tsx` (create new)
- `src/webview/helm-package-manager/components/ChartResultCard.tsx` (create new)
- Update `HelmPackageManager.tsx` to include component

## Dependencies

- Depends on story 004 (React app structure)
- Can be done in parallel with other 005 stories
- Chart detail modal will be separate story

## Estimated Time

25 minutes

