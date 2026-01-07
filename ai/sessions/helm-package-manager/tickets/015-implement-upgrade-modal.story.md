---
story_id: 015-implement-upgrade-modal
session_id: helm-package-manager
feature_id:
  - helm-release-upgrade
spec_id:
  - helm-release-operations
status: completed
---

# Story: Implement Upgrade Release Modal

## Objective

Create a modal dialog for upgrading releases with version selection and values editing.

## Context

The upgrade modal allows users to upgrade releases to new versions with optional values changes. See [helm-release-upgrade](../../features/helm/helm-release-upgrade.feature.md) for upgrade scenarios.

## Acceptance Criteria

- [x] Create `UpgradeReleaseModal.tsx` component
- [x] Show current version and available versions
- [x] Include version dropdown
- [x] Include "Reuse existing values" checkbox (checked by default)
- [x] Show values editor when not reusing values
- [ ] Include "Show Diff" button to compare values (deferred to future story)
- [x] Validate values YAML syntax
- [x] Handle upgrade confirmation
- [x] Show progress during upgrade

## Implementation Notes

```typescript
interface UpgradeReleaseModalProps {
  release: HelmRelease | null;
  open: boolean;
  onClose: () => void;
  onUpgrade: (params: UpgradeParams) => Promise<void>;
}

interface UpgradeParams {
  releaseName: string;
  namespace: string;
  chart: string;
  version?: string;
  reuseValues: boolean;
  values?: string;
}

export const UpgradeReleaseModal: React.FC<UpgradeReleaseModalProps> = ({
  release,
  open,
  onClose,
  onUpgrade
}) => {
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [reuseValues, setReuseValues] = useState(true);
  const [customValues, setCustomValues] = useState('');
  const [currentValues, setCurrentValues] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && release) {
      fetchUpgradeInfo(release);
    }
  }, [open, release]);
  
  const fetchUpgradeInfo = async (release: HelmRelease) => {
    // Fetch available versions and current values
    vscode.postMessage({
      command: 'getUpgradeInfo',
      release: release.name,
      namespace: release.namespace,
      chart: release.chart
    });
  };
  
  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    
    try {
      await onUpgrade({
        releaseName: release!.name,
        namespace: release!.namespace,
        chart: release!.chart,
        version: selectedVersion,
        reuseValues,
        values: reuseValues ? undefined : customValues
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpgrading(false);
    }
  };
  
  if (!open || !release) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Upgrade {release.name}</h3>
        
        <div className="version-info">
          <div>
            <label>Current Version</label>
            <span>{release.version}</span>
          </div>
          <div>
            <label>Upgrade To</label>
            <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)}>
              {availableVersions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={reuseValues}
              onChange={(e) => setReuseValues(e.target.checked)}
            />
            Reuse existing values
          </label>
        </div>
        
        {!reuseValues && (
          <div className="values-editor">
            <label>Custom Values</label>
            <YAMLEditor
              defaultValues={currentValues}
              onChange={(values, valid) => setCustomValues(values)}
            />
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button onClick={onClose} disabled={upgrading}>Cancel</button>
          <button onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? 'Upgrading...' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/components/UpgradeReleaseModal.tsx` (create new)
- Update `InstalledReleasesSection.tsx` to use modal
- Update `ReleaseDetailModal.tsx` to trigger upgrade modal

## Dependencies

- Depends on story 013 (release commands)
- Depends on story 011 (YAML editor component)
- Can work with story 014 (release detail modal)

## Estimated Time

25 minutes

