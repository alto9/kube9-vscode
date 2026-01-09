---
story_id: 006-implement-repository-commands
session_id: helm-package-manager
feature_id:
  - helm-repository-management
spec_id:
  - helm-repository-operations
  - helm-cli-integration
status: completed
---

# Story: Implement Repository Management Commands

## Objective

Implement extension commands for repository operations (list, add, update, remove) and connect them to the Helm Service.

## Context

Repository commands execute Helm CLI operations and update the webview with results. See [helm-repository-operations](../../specs/helm/helm-repository-operations.spec.md) for command specifications.

## Acceptance Criteria

- [ ] Implement `listRepositories()` method in HelmService
- [ ] Implement `addRepository(name, url)` method in HelmService
- [ ] Implement `updateRepository(name)` method in HelmService
- [ ] Implement `removeRepository(name)` method in HelmService
- [ ] Create command handlers in `helmCommands.ts`
- [ ] Handle messages from webview for repository operations
- [ ] Send results back to webview via postMessage
- [ ] Implement input validation for add repository
- [ ] Show progress notifications for operations
- [ ] Handle errors with user-friendly messages

## Implementation Notes

```typescript
// HelmService methods
async listRepositories(): Promise<HelmRepository[]> {
  const output = await this.executeCommand(['repo', 'list', '--output', 'json']);
  return JSON.parse(output);
}

async addRepository(name: string, url: string): Promise<void> {
  await this.executeCommand(['repo', 'add', name, url]);
}

// Message handler in HelmPackageManagerPanel
case 'addRepository':
  await helmService.addRepository(message.name, message.url);
  const repos = await helmService.listRepositories();
  this.panel.webview.postMessage({ type: 'repositoriesLoaded', data: repos });
  vscode.window.showInformationMessage(`Repository '${message.name}' added`);
  break;
```

- Use `vscode.window.withProgress` for long operations
- Validate repository name (alphanumeric, hyphens, underscores only)
- Validate URL format before executing command

## Files Involved

- `src/services/HelmService.ts` (add methods)
- `src/webview/HelmPackageManagerPanel.ts` (add message handlers)
- `src/commands/helmCommands.ts` (update)

## Dependencies

- Depends on story 001 (HelmService)
- Depends on story 003 (webview panel)
- Should work with story 005 (Repositories Section UI)

## Estimated Time

30 minutes

