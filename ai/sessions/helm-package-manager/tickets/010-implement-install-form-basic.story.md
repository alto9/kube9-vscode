---
story_id: 010-implement-install-form-basic
session_id: helm-package-manager
feature_id:
  - helm-chart-installation
spec_id:
  - helm-chart-operations
status: pending
---

# Story: Implement Basic Chart Installation Form

## Objective

Create the installation form modal with basic fields (release name, namespace selection) and form validation.

## Context

The installation form allows users to configure chart installation with custom release names and target namespaces. See [helm-chart-installation](../../features/helm/helm-chart-installation.feature.md) for installation scenarios.

## Acceptance Criteria

- [ ] Create `InstallChartModal.tsx` component
- [ ] Include release name input (auto-generated default)
- [ ] Include namespace dropdown (shows existing namespaces)
- [ ] Include "Create namespace" checkbox
- [ ] Validate release name format (lowercase, alphanumeric, hyphens)
- [ ] Show validation errors inline
- [ ] Include Cancel and Install buttons
- [ ] Handle loading state during installation
- [ ] Display error messages from failed installations

## Implementation Notes

```typescript
interface InstallChartModalProps {
  chart: ChartSearchResult | null;
  open: boolean;
  namespaces: string[];
  onClose: () => void;
  onInstall: (params: InstallParams) => Promise<void>;
}

interface InstallParams {
  chart: string;
  releaseName: string;
  namespace: string;
  createNamespace: boolean;
  values?: string;
}

export const InstallChartModal: React.FC<InstallChartModalProps> = ({
  chart,
  open,
  namespaces,
  onClose,
  onInstall
}) => {
  const [releaseName, setReleaseName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [createNamespace, setCreateNamespace] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && chart) {
      // Auto-generate release name
      setReleaseName(chart.chart.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  }, [open, chart]);
  
  const validateReleaseName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Release name is required';
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      return 'Release name must contain only lowercase letters, numbers, and hyphens';
    }
    return null;
  };
  
  const handleInstall = async () => {
    const nameError = validateReleaseName(releaseName);
    if (nameError) {
      setError(nameError);
      return;
    }
    
    setInstalling(true);
    setError(null);
    
    try {
      await onInstall({
        chart: `${chart.repository}/${chart.chart}`,
        releaseName,
        namespace,
        createNamespace
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setInstalling(false);
    }
  };
  
  if (!open || !chart) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Install {chart.chart}</h3>
        
        <div className="form-group">
          <label>Release Name</label>
          <input
            type="text"
            value={releaseName}
            onChange={(e) => setReleaseName(e.target.value)}
            placeholder="my-release"
          />
        </div>
        
        <div className="form-group">
          <label>Namespace</label>
          <select value={namespace} onChange={(e) => setNamespace(e.target.value)}>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={createNamespace}
              onChange={(e) => setCreateNamespace(e.target.checked)}
            />
            Create namespace if it doesn't exist
          </label>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button onClick={onClose} disabled={installing}>Cancel</button>
          <button onClick={handleInstall} disabled={installing}>
            {installing ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/components/InstallChartModal.tsx` (create new)
- Update `ChartDetailModal.tsx` to open install modal

## Dependencies

- Depends on story 009 (chart detail modal)
- Values editor will be added in next stories

## Estimated Time

25 minutes

