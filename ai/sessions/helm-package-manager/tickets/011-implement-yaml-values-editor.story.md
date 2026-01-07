---
story_id: 011-implement-yaml-values-editor
session_id: helm-package-manager
feature_id:
  - helm-chart-installation
spec_id:
  - helm-chart-operations
status: completed
---

# Story: Implement YAML Values Editor for Installation

## Objective

Add a YAML editor to the installation form that allows users to customize chart values with syntax highlighting and validation.

## Context

Users need to modify chart values during installation. The YAML editor provides syntax highlighting and validates YAML syntax. See [helm-chart-installation](../../features/helm/helm-chart-installation.feature.md) for YAML editing scenarios.

## Acceptance Criteria

- [x] Create `YAMLEditor.tsx` component with syntax highlighting
- [x] Load default chart values into editor
- [x] Implement YAML syntax validation
- [x] Show inline syntax errors with line numbers
- [x] Disable Install button when YAML is invalid
- [x] Add "Reset to Defaults" button
- [x] Handle large values files efficiently
- [x] Support copy/paste functionality

## Implementation Notes

```typescript
interface YAMLEditorProps {
  defaultValues: string;
  onChange: (values: string, valid: boolean) => void;
}

export const YAMLEditor: React.FC<YAMLEditorProps> = ({
  defaultValues,
  onChange
}) => {
  const [value, setValue] = useState(defaultValues);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setValue(defaultValues);
  }, [defaultValues]);
  
  const handleChange = (newValue: string) => {
    setValue(newValue);
    
    // Validate YAML
    try {
      // Use js-yaml or similar library
      YAML.parse(newValue);
      setError(null);
      onChange(newValue, true);
    } catch (err) {
      setError(`Line ${err.mark?.line}: ${err.message}`);
      onChange(newValue, false);
    }
  };
  
  return (
    <div className="yaml-editor">
      <textarea
        className="yaml-input"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        style={{ fontFamily: 'monospace' }}
      />
      {error && (
        <div className="yaml-error">{error}</div>
      )}
    </div>
  );
};
```

- Use `js-yaml` library (already in dependencies) for validation
- Consider using Monaco editor or CodeMirror for better UX (optional enhancement)
- For MVP, a textarea with monospace font is sufficient

## Files Involved

- `src/webview/helm-package-manager/components/YAMLEditor.tsx` (create new)
- Update `InstallChartModal.tsx` to include YAMLEditor

## Dependencies

- Depends on story 010 (basic install form)
- Can be enhanced later with better editor component

## Estimated Time

20 minutes

