---
story_id: 007-implement-repository-modals
session_id: helm-package-manager
feature_id:
  - helm-repository-management
spec_id:
  - helm-repository-operations
status: completed
---

# Story: Implement Repository Add and Confirm Modals

## Objective

Create modal dialogs for adding repositories and confirming repository removal with validation and user feedback.

## Context

Modals provide forms for adding repositories and confirming destructive actions. See [helm-repository-management](../../features/helm/helm-repository-management.feature.md) for modal scenarios.

## Acceptance Criteria

- [x] Create `AddRepositoryModal.tsx` component
- [x] Include name and URL input fields
- [x] Implement inline validation (required fields, URL format, duplicate names)
- [x] Show validation errors in real-time
- [x] Disable submit button while invalid
- [x] Create `ConfirmDialog.tsx` reusable component
- [x] Use ConfirmDialog for repository removal confirmation
- [x] Handle modal open/close state
- [x] Show loading state during submission

## Implementation Notes

```typescript
interface AddRepositoryModalProps {
  open: boolean;
  existingRepositories: string[];
  onClose: () => void;
  onSubmit: (name: string, url: string) => Promise<void>;
}

export const AddRepositoryModal: React.FC<AddRepositoryModalProps> = ({
  open,
  existingRepositories,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const validate = () => {
    const newErrors: string[] = [];
    
    if (!name.trim()) {
      newErrors.push('Repository name is required');
    } else if (existingRepositories.includes(name)) {
      newErrors.push(`Repository '${name}' already exists`);
    } else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
      newErrors.push('Name must contain only letters, numbers, hyphens, and underscores');
    }
    
    if (!url.trim()) {
      newErrors.push('Repository URL is required');
    } else {
      try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          newErrors.push('URL must use HTTP or HTTPS protocol');
        }
      } catch {
        newErrors.push('Invalid URL format');
      }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await onSubmit(name, url);
      onClose();
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!open) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Helm Repository</h3>
        <input
          type="text"
          placeholder="Repository name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Repository URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {errors.map((error, i) => (
          <div key={i} className="error-message">{error}</div>
        ))}
        <div className="modal-actions">
          <button onClick={onClose} disabled={submitting}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !name || !url}>
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Files Involved

- `src/webview/helm-package-manager/components/AddRepositoryModal.tsx` (create new)
- `src/webview/helm-package-manager/components/ConfirmDialog.tsx` (create new)
- Update `RepositoriesSection.tsx` to use modals

## Dependencies

- Depends on story 005 (Repositories Section)
- Works with story 006 (repository commands)

## Estimated Time

25 minutes

