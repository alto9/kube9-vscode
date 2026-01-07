---
story_id: 017-implement-operator-install-modal
session_id: helm-package-manager
feature_id:
  - helm-operator-quick-install
spec_id:
  - helm-operator-installation
status: pending
---

# Story: Implement Kube9 Operator Installation Modal

## Objective

Create a specialized installation modal for the Kube9 Operator with pre-filled defaults and optional API key entry for Pro tier.

## Context

The operator install modal streamlines installation with optimal defaults and promotes Pro features. See [helm-operator-quick-install](../../features/helm/helm-operator-quick-install.feature.md) for installation scenarios.

## Acceptance Criteria

- [ ] Create `OperatorInstallModal.tsx` component
- [ ] Pre-fill release name as "kube9-operator" (read-only)
- [ ] Pre-fill namespace as "kube9-system" (editable)
- [ ] Check "Create namespace" by default
- [ ] Include collapsible "Pro Tier" section with API key input
- [ ] Show benefits of Pro tier
- [ ] Include link to get API key (portal.kube9.dev)
- [ ] Show installation progress with detailed steps
- [ ] Handle installation success with tier-specific messaging
- [ ] Suggest adding API key for free tier installations

## Implementation Notes

```typescript
interface OperatorInstallModalProps {
  open: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

export const OperatorInstallModal: React.FC<OperatorInstallModalProps> = ({
  open,
  onClose,
  onInstalled
}) => {
  const [namespace, setNamespace] = useState('kube9-system');
  const [createNamespace, setCreateNamespace] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showProSection, setShowProSection] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    setProgress(0);
    
    try {
      // Progress updates
      setProgress(10);
      vscode.postMessage({ command: 'ensureKube9Repository' });
      
      setProgress(20);
      // Repository updates
      
      setProgress(30);
      const installParams = {
        chart: 'kube9/kube9-operator',
        releaseName: 'kube9-operator',
        namespace,
        createNamespace,
        wait: true,
        timeout: '5m',
        values: apiKey ? `apiKey: ${apiKey}` : undefined
      };
      
      vscode.postMessage({ command: 'installOperator', params: installParams });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setInstalling(false);
    }
  };
  
  if (!open) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content operator-install-modal">
        <div className="operator-header">
          <div className="operator-logo">🎯</div>
          <div>
            <h3>Install Kube9 Operator</h3>
            <p>Advanced Kubernetes management for VS Code</p>
          </div>
        </div>
        
        <div className="form-group">
          <label>Release Name</label>
          <input type="text" value="kube9-operator" disabled />
        </div>
        
        <div className="form-group">
          <label>Namespace</label>
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={createNamespace}
              onChange={(e) => setCreateNamespace(e.target.checked)}
            />
            Create namespace if it doesn't exist
          </label>
        </div>
        
        <div className="pro-tier-section">
          <button
            className="expand-button"
            onClick={() => setShowProSection(!showProSection)}
          >
            ⭐ Pro Tier {showProSection ? '▼' : '▶'}
          </button>
          
          {showProSection && (
            <div className="pro-content">
              <p>Enable advanced features with a Pro API key:</p>
              <ul>
                <li>AI-powered cluster insights</li>
                <li>Predictive resource recommendations</li>
                <li>Advanced security scanning</li>
                <li>Priority support</li>
              </ul>
              
              <div className="form-group">
                <label>API Key (Optional)</label>
                <input
                  type="password"
                  placeholder="kdy_prod_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <a
                  href="#"
                  onClick={() => vscode.postMessage({ command: 'openExternalLink', url: 'https://portal.kube9.dev' })}
                >
                  Get your API key →
                </a>
              </div>
            </div>
          )}
        </div>
        
        {installing && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span>{progress}% - Installing...</span>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button onClick={onClose} disabled={installing}>Cancel</button>
          <button onClick={handleInstall} disabled={installing}>
            {installing ? 'Installing...' : 'Install Operator'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/components/OperatorInstallModal.tsx` (create new)
- Update `FeaturedChartsSection.tsx` to use modal

## Dependencies

- Depends on story 005 (Featured Charts Section)
- Depends on story 016 (operator status detection)
- Uses install command from story 012

## Estimated Time

30 minutes

