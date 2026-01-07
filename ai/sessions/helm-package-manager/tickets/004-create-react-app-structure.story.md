---
story_id: 004-create-react-app-structure
session_id: helm-package-manager
feature_id:
  - helm-package-manager-access
spec_id:
  - helm-webview-architecture
status: pending
---

# Story: Create React App Structure for Helm Webview

## Objective

Set up the React application structure for the Helm Package Manager webview, including the main component, state management, and build configuration.

## Context

The webview hosts a React application with multiple sections. This story creates the foundational structure and build setup. See [helm-webview-architecture](../../specs/helm/helm-webview-architecture.spec.md) for component hierarchy.

## Acceptance Criteria

- [ ] Create `src/webview/helm-package-manager/` directory structure
- [ ] Create `HelmPackageManager.tsx` main component
- [ ] Set up React state management for `HelmState` interface
- [ ] Create `index.tsx` entry point with VSCode API setup
- [ ] Configure esbuild/webpack to bundle React app
- [ ] Update `package.json` build scripts to include helm webview
- [ ] Implement message passing setup (`window.addEventListener('message')`)
- [ ] Create placeholder sections for Featured, Repositories, Releases, Discovery

## Implementation Notes

```typescript
// HelmPackageManager.tsx
interface HelmState {
  repositories: HelmRepository[];
  releases: HelmRelease[];
  featuredCharts: FeaturedChart[];
  searchResults: ChartSearchResult[];
  loading: boolean;
  error: string | null;
  currentCluster: string;
}

export const HelmPackageManager: React.FC = () => {
  const [state, setState] = React.useState<HelmState>({
    repositories: [],
    releases: [],
    featuredCharts: [],
    searchResults: [],
    loading: true,
    error: null,
    currentCluster: ''
  });
  
  // Message passing
  React.useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'repositoriesLoaded':
          setState(prev => ({ ...prev, repositories: message.data }));
          break;
        // Handle other message types
      }
    };
    
    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);
  
  return (
    <div className="helm-package-manager">
      <h1>Helm Package Manager</h1>
      {/* Section placeholders */}
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/HelmPackageManager.tsx` (create new)
- `src/webview/helm-package-manager/index.tsx` (create new)
- `src/webview/helm-package-manager/types.ts` (create new for interfaces)
- `package.json` (update build scripts)
- Update `HelmPackageManagerPanel.ts` to load bundled script

## Dependencies

- Depends on story 003 (webview panel infrastructure)
- React and ReactDOM already in dependencies

## Estimated Time

30 minutes

