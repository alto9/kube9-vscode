---
story_id: 005-implement-repositories-section
session_id: helm-package-manager
feature_id:
  - helm-repository-management
spec_id:
  - helm-repository-operations
status: completed
---

# Story: Implement Repositories Section Component

## Objective

Create the Repositories Section component that displays configured Helm repositories with update and remove actions.

## Context

The Repositories section shows all configured Helm repositories with their URLs, chart counts, and management buttons. See [helm-repository-management](../../features/helm/helm-repository-management.feature.md) for scenarios.

## Acceptance Criteria

- [x] Create `RepositoriesSection.tsx` component
- [x] Create `RepositoryList.tsx` component
- [x] Create `RepositoryCard.tsx` component for individual repositories
- [x] Display repository name, URL, and chart count
- [x] Show "Update" and "Remove" buttons for each repository
- [x] Include "+ Add Repository" button at section header
- [x] Handle empty state (no repositories configured)
- [x] Style consistently with VS Code theme

## Implementation Notes

```typescript
interface RepositoriesSectionProps {
  repositories: HelmRepository[];
  onAddRepository: () => void;
  onUpdateRepository: (name: string) => void;
  onRemoveRepository: (name: string) => void;
}

export const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({
  repositories,
  onAddRepository,
  onUpdateRepository,
  onRemoveRepository
}) => {
  return (
    <section className="repositories-section">
      <div className="section-header">
        <h2>📚 Repositories</h2>
        <button onClick={onAddRepository}>+ Add Repository</button>
      </div>
      <RepositoryList
        repositories={repositories}
        onUpdate={onUpdateRepository}
        onRemove={onRemoveRepository}
      />
    </section>
  );
};
```

- Use icon buttons for Update (🔄) and Remove (🗑️)
- Show chart count as subdued text
- Empty state: "No repositories configured. Add one to get started."

## Files Involved

- `src/webview/helm-package-manager/components/RepositoriesSection.tsx` (create new)
- `src/webview/helm-package-manager/components/RepositoryList.tsx` (create new)
- `src/webview/helm-package-manager/components/RepositoryCard.tsx` (create new)
- Update `HelmPackageManager.tsx` to include component

## Dependencies

- Depends on story 004 (React app structure)
- Can be done in parallel with story 005 (Featured Charts)
- Modal components will be separate stories

## Estimated Time

25 minutes

