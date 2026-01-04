---
story_id: 007-create-react-app-base
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Create React NamespaceDescribeApp Base Component

## Objective

Create the main React component for namespace describe webview with tab navigation.

## Acceptance Criteria

- New file created: `media/describe/NamespaceDescribeApp.tsx`
- Main NamespaceDescribeApp component with state for namespaceData, error, activeTab
- Message listener for 'updateNamespaceData' and 'showError' commands
- Header with namespace name, status badge, and action buttons (Refresh, View YAML, Set as Default)
- Tab navigation for 5 tabs: Overview, Resources, Quotas, Limit Ranges, Events
- Tab badges showing counts for Resources, Quotas, Limit Ranges, Events
- Loading spinner while data is being fetched
- Error display component

## Files to Create

- `media/describe/NamespaceDescribeApp.tsx`

## Implementation Notes

Component structure:
```tsx
const NamespaceDescribeApp: React.FC<{vscode: VSCodeAPI}> = ({vscode}) => {
  const [namespaceData, setNamespaceData] = useState<NamespaceDescribeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Message listener
  useEffect(() => {
    const handler = (event) => {
      switch (event.data.command) {
        case 'updateNamespaceData':
          setNamespaceData(event.data.data);
          break;
        case 'showError':
          setError(event.data.data.message);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  
  // Render structure
  return (
    <div className="namespace-describe-container">
      <header>{/* name, status, buttons */}</header>
      <nav>{/* tab navigation */}</nav>
      <main>{/* tab content */}</main>
    </div>
  );
};
```

Action buttons send messages:
- Refresh: `vscode.postMessage({command: 'refresh'})`
- View YAML: `vscode.postMessage({command: 'viewYaml'})`
- Set as Default: `vscode.postMessage({command: 'setDefaultNamespace', data: {namespace}})`

## Estimated Time

30 minutes

## Dependencies

- Story 006 (requires webview integration to send messages)

