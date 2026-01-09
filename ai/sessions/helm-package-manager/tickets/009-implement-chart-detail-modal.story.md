---
story_id: 009-implement-chart-detail-modal
session_id: helm-package-manager
feature_id:
  - helm-chart-discovery
spec_id:
  - helm-chart-operations
status: completed
---

# Story: Implement Chart Detail Modal

## Objective

Create a modal dialog that displays detailed information about a Helm chart, including README, values, and versions with tabbed navigation.

## Context

The chart detail modal allows users to review chart documentation and configuration before installation. See [helm-chart-discovery](../../features/helm/helm-chart-discovery.feature.md) for detail viewing scenarios.

## Acceptance Criteria

- [ ] Create `ChartDetailModal.tsx` component
- [ ] Implement tabbed interface (README, Values, Versions)
- [ ] Create `ReadmeViewer.tsx` with markdown rendering
- [ ] Create `ValuesViewer.tsx` with YAML syntax highlighting
- [ ] Create `VersionsDropdown.tsx` for version selection
- [ ] Display chart metadata (name, description, maintainers)
- [ ] Include "Install" button in modal header
- [ ] Handle loading state while fetching details
- [ ] Handle fetch errors with retry option
- [ ] Update content when version is changed

## Implementation Notes

```typescript
interface ChartDetailModalProps {
  chart: ChartSearchResult | null;
  open: boolean;
  onClose: () => void;
  onInstall: (chart: ChartSearchResult) => void;
}

export const ChartDetailModal: React.FC<ChartDetailModalProps> = ({
  chart,
  open,
  onClose,
  onInstall
}) => {
  const [details, setDetails] = useState<ChartDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'readme' | 'values' | 'versions'>('readme');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (open && chart) {
      fetchChartDetails(chart);
    }
  }, [open, chart]);
  
  const fetchChartDetails = async (chart: ChartSearchResult) => {
    setLoading(true);
    setError(null);
    try {
      // Send message to extension to fetch details
      vscode.postMessage({ command: 'getChartDetails', chart: chart.name });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (!open || !chart) return null;
  
  return (
    <div className="modal-overlay modal-large">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{chart.chart}</h2>
          <button onClick={() => onInstall(chart)}>Install</button>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="tabs">
          <button
            className={activeTab === 'readme' ? 'active' : ''}
            onClick={() => setActiveTab('readme')}
          >
            README
          </button>
          <button
            className={activeTab === 'values' ? 'active' : ''}
            onClick={() => setActiveTab('values')}
          >
            Values
          </button>
          <button
            className={activeTab === 'versions' ? 'active' : ''}
            onClick={() => setActiveTab('versions')}
          >
            Versions
          </button>
        </div>
        
        <div className="tab-content">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} onRetry={() => fetchChartDetails(chart)} />}
          {!loading && !error && details && (
            <>
              {activeTab === 'readme' && <ReadmeViewer markdown={details.readme} />}
              {activeTab === 'values' && <ValuesViewer yaml={details.values} />}
              {activeTab === 'versions' && <VersionsList versions={details.versions} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

- Use a markdown library (e.g., `marked` or `react-markdown`) for README
- Use syntax highlighter for YAML (e.g., `prism` or `highlight.js`)
- Make modal wide enough for readable documentation

## Files Involved

- `src/webview/helm-package-manager/components/ChartDetailModal.tsx` (create new)
- `src/webview/helm-package-manager/components/ReadmeViewer.tsx` (create new)
- `src/webview/helm-package-manager/components/ValuesViewer.tsx` (create new)
- Update `DiscoverChartsSection.tsx` to use modal

## Dependencies

- Depends on story 005 (Discovery Section)
- Depends on story 008 (chart commands)
- May need markdown rendering library in dependencies

## Estimated Time

30 minutes

