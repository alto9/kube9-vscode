---
spec_id: webview-header-component
name: Webview Header Component Specification
description: Technical specification for the standardized WebviewHeader component
feature_id:
  - webview-header-standardization
---

# Webview Header Component Specification

## Overview

The WebviewHeader component provides a standardized header for all webviews in the kube9-vscode extension. It ensures consistent styling, layout, and behavior across all webview panels.

## Component Structure

### File Locations

- **Component**: `src/webview/components/WebviewHeader.tsx`
- **Styles**: `src/webview/styles/webview-header.css`

### TypeScript Interface

```typescript
export interface WebviewHeaderAction {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
}

export interface WebviewHeaderProps {
    title: string;
    actions?: WebviewHeaderAction[];
    helpContext?: string; // If provided, shows help button
}
```

## Component API

### Props

#### `title: string` (required)
- The title to display on the left side of the header
- Can be static or dynamic (e.g., "Pod Logs: my-pod")

#### `actions?: WebviewHeaderAction[]` (optional)
- Array of action buttons to display on the right side
- Each action has:
  - `label`: Button text
  - `icon`: Codicon class name (e.g., "codicon-refresh")
  - `onClick`: Click handler function
  - `disabled`: Optional disabled state

#### `helpContext?: string` (optional)
- If provided, a help button is automatically added to the actions menu
- The help button posts a message with type `'openHelp'` and the provided context
- If not provided, no help button is shown

## Styling

### CSS Classes

- `.webview-header`: Main header container
- `.webview-header-title`: Title section (left side)
- `.webview-header-title h1`: Title heading
- `.webview-header-actions`: Actions menu container (right side)
- `.webview-header-action-btn`: Individual action button
- `.webview-header-help-btn`: Help button (uses same styling as action buttons)
- `.webview-header-action-icon`: Icon within action button
- `.webview-header-action-label`: Label text within action button

### Theme Integration

The component uses VSCode CSS variables for theming:
- `--vscode-editor-background`: Header background
- `--vscode-foreground`: Text color
- `--vscode-panel-border`: Border color
- `--vscode-button-secondaryBackground`: Button background
- `--vscode-button-secondaryForeground`: Button text color
- `--vscode-button-secondaryHoverBackground`: Button hover background
- `--vscode-focusBorder`: Focus outline color

### Layout

- **Flexbox layout**: Header uses `display: flex` with `justify-content: space-between`
- **Title**: Left-aligned, flex: 1, allows text truncation
- **Actions**: Right-aligned, flex-shrink: 0, wraps on small screens
- **Responsive**: On screens < 600px, header stacks vertically

## Message Protocol

### Help Button Messages

When the help button is clicked, it posts:

```typescript
vscode.postMessage({
  type: 'openHelp',
  context: helpContext // From props
});
```

The extension host's `WebviewHelpHandler` handles these messages and routes them to the `HelpController`.

## Integration Pattern

### Basic Usage

```typescript
import { WebviewHeader } from '../components/WebviewHeader';

<WebviewHeader
  title="My Webview"
  helpContext="my-webview"
/>
```

### With Actions

```typescript
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';

const actions: WebviewHeaderAction[] = [
  {
    label: 'Refresh',
    icon: 'codicon-refresh',
    onClick: handleRefresh
  },
  {
    label: 'Export',
    icon: 'codicon-export',
    onClick: handleExport
  }
];

<WebviewHeader
  title="My Webview"
  actions={actions}
  helpContext="my-webview"
/>
```

### CSS Import

The header CSS must be imported in the webview HTML template:

```typescript
const headerStyleUri = webview.asWebviewUri(
  vscode.Uri.joinPath(extensionContext.extensionUri, 'src', 'webview', 'styles', 'webview-header.css')
);

// In HTML template:
<link href="${headerStyleUri}" rel="stylesheet">
```

Or in React entry point:

```typescript
import '../../styles/webview-header.css';
```

## Icon Usage

Icons use Codicon classes. Common icons:
- `codicon-refresh`: Refresh action
- `codicon-save`: Export/Save action
- `codicon-copy`: Copy action
- `codicon-search`: Search action
- `codicon-clear-all`: Clear action
- `codicon-question`: Help button
- `codicon-sync`: Sync action
- `codicon-list-tree`: Navigate to tree
- `codicon-file-code`: View YAML/Code

## Accessibility

- All buttons have `aria-label` attributes
- Focus indicators use VSCode focus border color
- Keyboard navigation supported (Tab, Enter, Space)
- Disabled buttons have reduced opacity and cursor: not-allowed

## Migration Notes

### Replacing Old Headers

**Before** (Event Viewer):
```typescript
<Toolbar
  onRefresh={handleRefresh}
  onExport={handleExport}
  // ...
/>
```

**After**:
```typescript
<WebviewHeader
  title="Events Viewer"
  actions={[
    { label: 'Refresh', icon: 'codicon-refresh', onClick: handleRefresh },
    { label: 'Export', icon: 'codicon-export', onClick: handleExport }
  ]}
  helpContext="events-viewer"
/>
```

### Removing Help Button Injection

**Before**:
- HTML template included `help-button.html`
- CSS included `help-button.css`
- JS included `help-button.js`
- Help button injected into body

**After**:
- Help button integrated into header component
- No separate injection needed
- Old files removed

## Examples

### Event Viewer
- Title: "Events Viewer"
- Actions: Refresh, Auto-refresh toggle, Clear Filters
- Help context: "events-viewer"

### Pod Logs
- Title: "Pod Logs: <pod-name> (<container>)"
- Actions: Refresh, Clear, Copy, Export, Search
- Help context: "pod-logs"

### Helm Package Manager
- Title: "Helm Package Manager"
- Actions: None (content-specific actions in body)
- Help context: "helm-package-manager"

### Pod Describe
- Title: "Pod / <pod-name>"
- Actions: Refresh, View YAML
- Help context: "describe-webview"

### ArgoCD Application
- Title: "ArgoCD: <app-name>"
- Actions: Sync, Refresh, Hard Refresh, View in Tree
- Help context: "argocd-application"
