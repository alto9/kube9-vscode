---
story_id: 014-implement-release-detail-modal
session_id: helm-package-manager
feature_id:
  - helm-release-management
spec_id:
  - helm-release-operations
status: completed
---

# Story: Implement Release Detail Modal

## Objective

Create a modal dialog that displays comprehensive release information with tabbed views (Info, Manifest, Values, History).

## Context

The release detail modal shows all information about an installed release, including deployed resources and revision history. See [helm-release-management](../../features/helm/helm-release-management.feature.md) for detail viewing scenarios.

## Acceptance Criteria

- [x] Create `ReleaseDetailModal.tsx` component
- [x] Implement tabbed interface (Info, Manifest, Values, History)
- [x] Create `ReleaseInfoTab.tsx` showing release metadata
- [x] Create `ManifestViewer.tsx` showing YAML manifests
- [x] Create `ValuesViewer.tsx` showing deployed values
- [x] Create `HistoryTab.tsx` showing revision history with rollback buttons
- [x] Handle loading state while fetching details
- [x] Include action buttons in header (Upgrade, Uninstall)
- [x] Support copying manifest and values

## Implementation Notes

```typescript
interface ReleaseDetailModalProps {
  release: HelmRelease | null;
  open: boolean;
  onClose: () => void;
  onUpgrade: (release: HelmRelease) => void;
  onRollback: (release: HelmRelease, revision: number) => void;
  onUninstall: (release: HelmRelease) => void;
}

export const ReleaseDetailModal: React.FC<ReleaseDetailModalProps> = ({
  release,
  open,
  onClose,
  onUpgrade,
  onRollback,
  onUninstall
}) => {
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'manifest' | 'values' | 'history'>('info');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && release) {
      fetchReleaseDetails(release);
    }
  }, [open, release]);
  
  const fetchReleaseDetails = async (release: HelmRelease) => {
    setLoading(true);
    try {
      vscode.postMessage({
        command: 'getReleaseDetails',
        name: release.name,
        namespace: release.namespace
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!open || !release) return null;
  
  return (
    <div className="modal-overlay modal-large">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2>{release.name}</h2>
            <span className="namespace-badge">{release.namespace}</span>
          </div>
          <div className="header-actions">
            <button onClick={() => onUpgrade(release)}>Upgrade</button>
            <button onClick={() => onUninstall(release)}>Uninstall</button>
            <button onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="tabs">
          <button
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={activeTab === 'manifest' ? 'active' : ''}
            onClick={() => setActiveTab('manifest')}
          >
            Manifest
          </button>
          <button
            className={activeTab === 'values' ? 'active' : ''}
            onClick={() => setActiveTab('values')}
          >
            Values
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        
        <div className="tab-content">
          {loading && <LoadingSpinner />}
          {!loading && details && (
            <>
              {activeTab === 'info' && <ReleaseInfoTab details={details} />}
              {activeTab === 'manifest' && <ManifestViewer manifest={details.manifest} />}
              {activeTab === 'values' && <ValuesViewer values={details.values} />}
              {activeTab === 'history' && (
                <HistoryTab
                  history={details.history}
                  onRollback={(revision) => onRollback(release, revision)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/components/ReleaseDetailModal.tsx` (create new)
- `src/webview/helm-package-manager/components/ReleaseInfoTab.tsx` (create new)
- `src/webview/helm-package-manager/components/ManifestViewer.tsx` (create new)
- `src/webview/helm-package-manager/components/HistoryTab.tsx` (create new)
- Update `InstalledReleasesSection.tsx` to use modal

## Dependencies

- Depends on story 005 (Releases Section)
- Depends on story 013 (release commands)
- Reuse ValuesViewer from chart detail modal

## Estimated Time

30 minutes

