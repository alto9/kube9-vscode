---
story_id: 005-implement-releases-section
session_id: helm-package-manager
feature_id:
  - helm-release-management
spec_id:
  - helm-release-operations
status: pending
---

# Story: Implement Installed Releases Section Component

## Objective

Create the Installed Releases Section component that displays all Helm releases with status indicators, filters, and action buttons.

## Context

The Installed Releases section shows all Helm releases from the cluster with visual status indicators and management buttons. See [helm-release-management](../../features/helm/helm-release-management.feature.md) for scenarios.

## Acceptance Criteria

- [ ] Create `InstalledReleasesSection.tsx` component
- [ ] Create `ReleaseList.tsx` component
- [ ] Create `ReleaseCard.tsx` component for individual releases
- [ ] Display release name, namespace, chart, version, status
- [ ] Show status indicator (🟢 deployed, 🟡 upgrade available, 🔴 failed)
- [ ] Include "Upgrade", "View Details", "Uninstall" buttons per release
- [ ] Create `ReleaseFilters.tsx` component (namespace, status, search)
- [ ] Handle empty state (no releases installed)
- [ ] Style release cards with appropriate status colors

## Implementation Notes

```typescript
interface InstalledReleasesSectionProps {
  releases: HelmRelease[];
  filters: ReleaseFilters;
  onFilterChange: (filters: ReleaseFilters) => void;
  onUpgrade: (release: HelmRelease) => void;
  onViewDetails: (release: HelmRelease) => void;
  onUninstall: (release: HelmRelease) => void;
}

export const InstalledReleasesSection: React.FC<InstalledReleasesSectionProps> = ({
  releases,
  filters,
  onFilterChange,
  onUpgrade,
  onViewDetails,
  onUninstall
}) => {
  const filteredReleases = applyFilters(releases, filters);
  
  return (
    <section className="installed-releases-section">
      <div className="section-header">
        <h2>📦 Installed Releases</h2>
      </div>
      <ReleaseFilters filters={filters} onChange={onFilterChange} />
      <ReleaseList
        releases={filteredReleases}
        onUpgrade={onUpgrade}
        onViewDetails={onViewDetails}
        onUninstall={onUninstall}
      />
    </section>
  );
};
```

- Use color-coded status indicators
- Highlight upgrade button if update available
- Empty state: "No Helm releases installed. Search for charts to install."

## Files Involved

- `src/webview/helm-package-manager/components/InstalledReleasesSection.tsx` (create new)
- `src/webview/helm-package-manager/components/ReleaseList.tsx` (create new)
- `src/webview/helm-package-manager/components/ReleaseCard.tsx` (create new)
- `src/webview/helm-package-manager/components/ReleaseFilters.tsx` (create new)
- Update `HelmPackageManager.tsx` to include component

## Dependencies

- Depends on story 004 (React app structure)
- Can be done in parallel with stories 005 (Featured/Repositories)
- Detail modal will be separate story

## Estimated Time

30 minutes

