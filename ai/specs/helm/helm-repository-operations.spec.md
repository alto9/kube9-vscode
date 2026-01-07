---
spec_id: helm-repository-operations
name: Helm Repository Operations
description: Technical specification for repository management operations
feature_id:
  - helm-repository-management
diagram_id:
  - helm-repository-management-flow
---

# Helm Repository Operations

## Overview

Repository operations manage Helm chart repositories, including adding, updating, and removing repositories from the local Helm configuration.

## Architecture

See [helm-repository-management-flow](../../diagrams/helm/helm-repository-management-flow.diagram.md) for workflow details.

## Add Repository Operation

### Input Validation

```typescript
interface AddRepositoryInput {
  name: string;      // Repository name (alphanumeric, hyphens, underscores)
  url: string;       // Repository URL (valid HTTP/HTTPS URL)
}

function validateRepositoryInput(input: AddRepositoryInput): ValidationResult {
  const errors: string[] = [];
  
  // Validate name
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Repository name is required');
  } else if (!/^[a-zA-Z0-9-_]+$/.test(input.name)) {
    errors.push('Repository name must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Validate URL
  if (!input.url || input.url.trim().length === 0) {
    errors.push('Repository URL is required');
  } else {
    try {
      const url = new URL(input.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Repository URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Repository URL is invalid');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Add Repository Modal

```typescript
interface AddRepositoryModalProps {
  onSubmit: (input: AddRepositoryInput) => Promise<void>;
  onCancel: () => void;
  existingRepositories: string[];
}

// Modal displays:
// - Name input field
// - URL input field
// - Validation errors (inline)
// - Cancel and Add buttons
// - Loading state during submission
```

### Add Repository Command

Extension command: `kube9.helm.addRepository`

```typescript
async function addRepository(name: string, url: string): Promise<void> {
  // Validate input
  const validation = validateRepositoryInput({ name, url });
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Check if repository already exists
  const existing = await helmService.listRepositories();
  if (existing.some(r => r.name === name)) {
    throw new Error(`Repository '${name}' already exists`);
  }
  
  // Execute helm repo add
  try {
    await helmService.addRepository(name, url);
    
    // Update repository list in webview
    const updated = await helmService.listRepositories();
    webview.postMessage({ type: 'repositoriesLoaded', data: updated });
    
    // Show success notification
    vscode.window.showInformationMessage(`Repository '${name}' added successfully`);
  } catch (error) {
    throw new Error(`Failed to add repository: ${error.message}`);
  }
}
```

## Update Repository Operation

### Update Single Repository

Extension command: `kube9.helm.updateRepository`

```typescript
async function updateRepository(name: string): Promise<void> {
  try {
    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Updating repository '${name}'...`,
      cancellable: false
    }, async () => {
      await helmService.updateRepository(name);
    });
    
    // Refresh chart count
    const repos = await helmService.listRepositories();
    webview.postMessage({ type: 'repositoriesLoaded', data: repos });
    
    // Show success notification
    vscode.window.showInformationMessage(`Repository '${name}' updated successfully`);
  } catch (error) {
    throw new Error(`Failed to update repository: ${error.message}`);
  }
}
```

### Update All Repositories

Extension command: `kube9.helm.updateAllRepositories`

```typescript
async function updateAllRepositories(): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Updating all repositories...',
      cancellable: false
    }, async () => {
      // Execute: helm repo update (updates all)
      await helmService.executeCommand(['repo', 'update']);
    });
    
    // Refresh repository list
    const repos = await helmService.listRepositories();
    webview.postMessage({ type: 'repositoriesLoaded', data: repos });
    
    // Show success notification
    vscode.window.showInformationMessage('All repositories updated successfully');
  } catch (error) {
    throw new Error(`Failed to update repositories: ${error.message}`);
  }
}
```

## Remove Repository Operation

### Remove Confirmation

```typescript
interface RemoveRepositoryConfirmation {
  repositoryName: string;
  chartCount: number;
}

async function confirmRemoveRepository(repo: RemoveRepositoryConfirmation): Promise<boolean> {
  const message = `Are you sure you want to remove repository '${repo.repositoryName}'?`;
  const detail = repo.chartCount > 0 
    ? `This repository contains ${repo.chartCount} charts.`
    : undefined;
  
  const result = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    'Remove',
    'Cancel'
  );
  
  return result === 'Remove';
}
```

### Remove Repository Command

Extension command: `kube9.helm.removeRepository`

```typescript
async function removeRepository(name: string): Promise<void> {
  try {
    // Execute helm repo remove
    await helmService.removeRepository(name);
    
    // Update repository list in webview
    const updated = await helmService.listRepositories();
    webview.postMessage({ type: 'repositoriesLoaded', data: updated });
    
    // Show success notification
    vscode.window.showInformationMessage(`Repository '${name}' removed successfully`);
  } catch (error) {
    throw new Error(`Failed to remove repository: ${error.message}`);
  }
}
```

## Repository List Display

### Repository Card

```typescript
interface RepositoryCardProps {
  repository: HelmRepository;
  onUpdate: (name: string) => void;
  onRemove: (name: string) => void;
  onBrowse: (name: string) => void;
}

// Card displays:
// - Repository name (bold)
// - Repository URL (subdued)
// - Chart count
// - Last updated timestamp
// - Update button (refresh icon)
// - Remove button (trash icon)
// - Browse link (shows charts from this repo)
```

### Default Repositories

```typescript
const DEFAULT_REPOSITORIES = [
  {
    name: 'kube9',
    url: 'https://charts.kube9.io',
    description: 'Official Kube9 charts including the operator'
  }
];

// Suggest adding kube9 repository if not present
async function suggestKube9Repository(): Promise<void> {
  const repos = await helmService.listRepositories();
  const hasKube9 = repos.some(r => r.name === 'kube9');
  
  if (!hasKube9) {
    const result = await vscode.window.showInformationMessage(
      'Add the Kube9 chart repository to install the Kube9 Operator?',
      'Add Repository',
      'Later'
    );
    
    if (result === 'Add Repository') {
      await addRepository('kube9', 'https://charts.kube9.io');
    }
  }
}
```

## Repository State Management

### Caching

```typescript
interface RepositoryCacheEntry {
  repositories: HelmRepository[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class RepositoryCache {
  private cache: Map<string, RepositoryCacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, repos: HelmRepository[], ttl?: number): void {
    this.cache.set(key, {
      repositories: repos,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }
  
  get(key: string): HelmRepository[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.repositories;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
}
```

### State Persistence

```typescript
interface RepositoryWorkspaceState {
  repositories: HelmRepository[];
  lastUpdated: Date;
}

// Save to workspace state
async function saveRepositoryState(repos: HelmRepository[]): Promise<void> {
  await context.workspaceState.update('helm.repositories', {
    repositories: repos,
    lastUpdated: new Date()
  });
}

// Load from workspace state
function loadRepositoryState(): RepositoryWorkspaceState | null {
  return context.workspaceState.get<RepositoryWorkspaceState>('helm.repositories');
}
```

## Error Scenarios

### Repository Not Found

When updating or removing a non-existent repository:
```
Error: repository "name" not found
```

Action: Refresh repository list and show error notification

### Repository Already Exists

When adding a repository with duplicate name:
```
Error: repository name (name) already exists
```

Action: Show error in modal, suggest different name

### Network Errors

When adding or updating repository with network issues:
```
Error: Get "https://charts.example.com/index.yaml": dial tcp: lookup charts.example.com: no such host
```

Action: Show user-friendly error, suggest checking URL and network connection

### Invalid Index

When repository index is malformed:
```
Error: looks like "https://example.com" is not a valid chart repository or cannot be reached
```

Action: Show error suggesting URL verification

