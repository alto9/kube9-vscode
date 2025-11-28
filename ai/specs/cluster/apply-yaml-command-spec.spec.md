---
spec_id: apply-yaml-command-spec
feature_id: [apply-yaml-manifest]
context_id: [vscode-extension-development, kubernetes-cluster-management]
---

# Apply YAML Command Specification

## Overview

This specification defines the technical implementation for the "kube9: Apply YAML" command that enables users to apply Kubernetes YAML manifests to the connected cluster directly from VS Code.

## Command Definition

### package.json Registration

```typescript
// contributes.commands
{
  "command": "kube9.applyYAML",
  "title": "Apply YAML",
  "category": "kube9"
}
```

### Context Menu Registration

```typescript
// contributes.menus.editor/context
{
  "command": "kube9.applyYAML",
  "when": "resourceExtname == .yaml || resourceExtname == .yml",
  "group": "kube9@1"
}
```

## Command Handler

### Location

`src/commands/applyYAML.ts`

### Function Signature

```typescript
interface ApplyYAMLResult {
  success: boolean;
  output: string;
  resourcesAffected: string[];
}

type ApplyMode = 'apply' | 'dry-run-server' | 'dry-run-client';

export async function applyYAMLCommand(uri?: vscode.Uri): Promise<void>;
```

### Input Resolution

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | URI parameter provided | Use provided URI |
| 2 | Active editor has .yaml/.yml file | Use active editor document URI |
| 3 | No valid YAML file available | Show file picker dialog |

### Apply Mode Selection

Present quick pick with options:

| Label | Description | kubectl Flag |
|-------|-------------|--------------|
| Apply | Apply manifest to cluster | (none) |
| Dry Run (Server) | Validate against cluster API | `--dry-run=server` |
| Dry Run (Client) | Local validation only | `--dry-run=client` |

## kubectl Command Execution

### Command Construction

```typescript
// Base command
const baseCommand = `kubectl apply -f "${filePath}"`;

// With dry-run
const dryRunCommand = `kubectl apply -f "${filePath}" --dry-run=${mode}`;
```

### Execution Requirements

| Requirement | Implementation |
|-------------|----------------|
| Use current context | No `--context` flag needed (uses kubeconfig default) |
| Use current namespace | No `--namespace` flag needed (uses context default) |
| Handle multi-document | Native kubectl support via `---` separator |
| Capture stdout | Parse for success messages |
| Capture stderr | Parse for error messages |

### Output Parsing

#### Success Pattern

```
deployment.apps/my-app created
service/my-service configured
configmap/my-config unchanged
```

Extract: resource type, name, and action (created/configured/unchanged)

#### Error Pattern

```
error: error validating "file.yaml": error validating data: ...
```

Extract: error type and descriptive message

## Output Channel Integration

### Channel Name

`kube9`

### Output Format

```
[2025-11-28 15:45:32] Executing: kubectl apply -f "/path/to/manifest.yaml"
[2025-11-28 15:45:33] deployment.apps/my-app created
[2025-11-28 15:45:33] service/my-service configured
[2025-11-28 15:45:33] ✓ Apply completed successfully
```

### Error Output Format

```
[2025-11-28 15:45:32] Executing: kubectl apply -f "/path/to/manifest.yaml"
[2025-11-28 15:45:33] ✗ Apply failed
[2025-11-28 15:45:33] Error: error validating "manifest.yaml": ...
```

## Notification Strategy

### Success Notifications

| Condition | Notification Type | Message Template |
|-----------|-------------------|------------------|
| Single resource | Information | `{resource} {action}` |
| Multiple resources | Information | `{count} resources applied successfully` |
| Dry run success | Information | `Dry run passed: {count} resource(s) validated` |

### Error Notifications

| Condition | Notification Type | Message Template |
|-----------|-------------------|------------------|
| YAML syntax error | Error | `Invalid YAML syntax: {brief description}` |
| Validation error | Error | `Validation failed: {brief description}` |
| Connection error | Error | `Cluster unreachable: {context name}` |
| Permission error | Error | `Permission denied: {resource type}` |
| Namespace not found | Error | `Namespace not found: {namespace}` |

All error notifications should include "Show Output" action to open output channel.

## File Picker Configuration

### Options

```typescript
const options: vscode.OpenDialogOptions = {
  canSelectMany: false,
  openLabel: 'Apply YAML',
  filters: {
    'YAML files': ['yaml', 'yml']
  }
};
```

## Error Handling

### Error Categories

| Category | Detection | User Action |
|----------|-----------|-------------|
| No kubectl | Command not found in PATH | Show installation guidance |
| Invalid YAML | kubectl parse error | Show line number if available |
| Schema invalid | kubectl validation error | Show field/value error |
| Network error | Connection refused/timeout | Suggest checking cluster status |
| Auth error | 401/403 response | Suggest checking credentials |
| Not found | 404 namespace/resource | Show what was not found |

### Graceful Degradation

- Command should not throw unhandled exceptions
- All errors logged to output channel
- User always receives feedback via notification

## Extension Registration

### In extension.ts registerCommands()

```typescript
const applyYAMLCmd = vscode.commands.registerCommand(
  'kube9.applyYAML',
  applyYAMLCommand
);
context.subscriptions.push(applyYAMLCmd);
disposables.push(applyYAMLCmd);
```

## Dependencies

| Dependency | Usage |
|------------|-------|
| vscode.window.showQuickPick | Mode selection |
| vscode.window.showOpenDialog | File picker fallback |
| vscode.window.showInformationMessage | Success notifications |
| vscode.window.showErrorMessage | Error notifications |
| vscode.window.createOutputChannel | Output logging |
| child_process.exec or shell utility | kubectl execution |

## Testing Considerations

### Unit Tests

- Command handler with mocked vscode APIs
- Input resolution logic (URI vs active editor vs file picker)
- Output parsing for success/error patterns
- Notification message construction

### Integration Tests

- Full command flow with mock kubectl
- Context menu activation
- Command palette activation

