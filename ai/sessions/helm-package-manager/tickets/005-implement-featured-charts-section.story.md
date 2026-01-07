---
story_id: 005-implement-featured-charts-section
session_id: helm-package-manager
feature_id:
  - helm-operator-quick-install
spec_id:
  - helm-operator-installation
status: pending
---

# Story: Implement Featured Charts Section Component

## Objective

Create the Featured Charts Section component that prominently displays the Kube9 Operator with installation status and action buttons.

## Context

The Featured Charts section promotes the Kube9 Operator with 1-click installation. It shows installation status and appropriate actions (Install, Upgrade, Configure). See [helm-operator-quick-install](../../features/helm/helm-operator-quick-install.feature.md) for scenarios.

## Acceptance Criteria

- [ ] Create `FeaturedChartsSection.tsx` component
- [ ] Create `OperatorCard.tsx` component
- [ ] Display Kube9 Operator card with logo, title, description
- [ ] Show installation status badge (Not Installed, Installed vX.X.X, Update Available)
- [ ] Render appropriate action button based on status
- [ ] Include links to Documentation and View Values
- [ ] Style prominently at top of package manager
- [ ] Component receives operator status from parent state

## Implementation Notes

```typescript
interface FeaturedChartsSectionProps {
  operatorStatus: OperatorInstallationStatus;
  onInstall: () => void;
  onUpgrade: () => void;
  onConfigure: () => void;
}

export const FeaturedChartsSection: React.FC<FeaturedChartsSectionProps> = ({
  operatorStatus,
  onInstall,
  onUpgrade,
  onConfigure
}) => {
  return (
    <section className="featured-charts">
      <h2>🌟 Featured Charts</h2>
      <OperatorCard
        status={operatorStatus}
        onInstall={onInstall}
        onUpgrade={onUpgrade}
        onConfigure={onConfigure}
      />
    </section>
  );
};
```

- Use status badge colors: gray (not installed), green (installed), yellow (update available)
- Make "Install Now" button prominent with primary styling
- Show version info in status badge

## Files Involved

- `src/webview/helm-package-manager/components/FeaturedChartsSection.tsx` (create new)
- `src/webview/helm-package-manager/components/OperatorCard.tsx` (create new)
- `src/webview/helm-package-manager/components/StatusBadge.tsx` (create new)
- Update `HelmPackageManager.tsx` to include component

## Dependencies

- Depends on story 004 (React app structure)
- Modal components for install/upgrade will be separate stories

## Estimated Time

25 minutes

