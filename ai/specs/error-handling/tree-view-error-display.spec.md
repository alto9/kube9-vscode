---
spec_id: tree-view-error-display
name: Tree View Error Display
description: Technical specification for displaying errors within the tree view UI
feature_id:
  - connection-errors
  - rbac-permission-errors
  - resource-not-found-errors
  - error-ux-improvements
---

# Tree View Error Display

## Overview

Specification for displaying error states within the kube9 tree view, including error items, icons, context menus, and graceful degradation when resources fail to load.

## Implementation Details

### Error Tree Item

**Location**: Create new file `src/tree/ErrorTreeItem.ts`

```typescript
import * as vscode from 'vscode';
import { BaseTreeItem } from './BaseTreeItem';

export enum ErrorCategory {
  CONNECTION = 'connection',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export class ErrorTreeItem extends BaseTreeItem {
  constructor(
    public readonly errorMessage: string,
    public readonly errorCategory: ErrorCategory,
    public readonly errorDetails?: string,
    public readonly retryCallback?: () => Promise<void>
  ) {
    super(
      errorMessage,
      vscode.TreeItemCollapsibleState.None
    );

    this.iconPath = this.getErrorIcon();
    this.tooltip = this.buildTooltip();
    this.contextValue = 'error';
    this.description = this.getErrorDescription();
  }

  private getErrorIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground')
    );
  }

  private buildTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    
    tooltip.appendMarkdown(`## Error\n\n`);
    tooltip.appendMarkdown(`**Message:** ${this.errorMessage}\n\n`);
    
    if (this.errorDetails) {
      tooltip.appendMarkdown(`**Details:**\n\`\`\`\n${this.errorDetails}\n\`\`\`\n\n`);
    }
    
    tooltip.appendMarkdown(`**Category:** ${this.errorCategory}\n\n`);
    tooltip.appendMarkdown(`Right-click for options`);
    
    return tooltip;
  }

  private getErrorDescription(): string {
    switch (this.errorCategory) {
      case ErrorCategory.CONNECTION:
        return 'Connection failed';
      case ErrorCategory.PERMISSION:
        return 'Access denied';
      case ErrorCategory.NOT_FOUND:
        return 'Not found';
      case ErrorCategory.TIMEOUT:
        return 'Timed out';
      default:
        return 'Error';
    }
  }
}
```

### Tree Provider Error Handling

**Location**: Update `src/tree/ClusterTreeProvider.ts`

Add methods for error handling in the tree:

```typescript
export class ClusterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  // ... existing code ...

  /**
   * Create an error item for the tree
   */
  private createErrorItem(
    error: any,
    context: string,
    retryCallback?: () => Promise<void>
  ): ErrorTreeItem {
    const errorCategory = this.categorizeError(error);
    const errorMessage = this.extractErrorMessage(error);
    const errorDetails = error.message || error.toString();

    return new ErrorTreeItem(
      `Failed to load ${context}`,
      errorCategory,
      errorDetails,
      retryCallback
    );
  }

  /**
   * Categorize error for appropriate icon and handling
   */
  private categorizeError(error: any): ErrorCategory {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return ErrorCategory.CONNECTION;
    }
    
    if (error.response?.statusCode === 403 || error.statusCode === 403) {
      return ErrorCategory.PERMISSION;
    }
    
    if (error.response?.statusCode === 404 || error.statusCode === 404) {
      return ErrorCategory.NOT_FOUND;
    }
    
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return ErrorCategory.TIMEOUT;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * Extract user-friendly error message
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.body?.message) {
      return error.response.body.message;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return error.toString();
  }

  /**
   * Handle errors during getChildren
   */
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    try {
      // Attempt to load children
      return await this.loadChildren(element);
    } catch (error: any) {
      console.error('Error loading tree children:', error);
      
      // Create error item with retry callback
      const errorItem = this.createErrorItem(
        error,
        element ? element.label as string : 'resources',
        async () => {
          // Refresh this specific element
          this._onDidChangeTreeData.fire(element);
        }
      );
      
      return [errorItem];
    }
  }

  /**
   * Graceful degradation - load what we can
   */
  private async loadChildrenWithGracefulDegradation(
    loaders: Array<() => Promise<TreeItem[]>>
  ): Promise<TreeItem[]> {
    const results: TreeItem[] = [];
    
    for (const loader of loaders) {
      try {
        const items = await loader();
        results.push(...items);
      } catch (error: any) {
        // Create error item for this specific loader
        const errorItem = this.createErrorItem(
          error,
          'resource category',
          loader // Retry callback is the loader itself
        );
        results.push(errorItem);
      }
    }
    
    return results;
  }
}
```

### Error Item Context Menu Commands

**Location**: Create new file `src/commands/errorCommands.ts`

```typescript
import * as vscode from 'vscode';
import { ErrorTreeItem } from '../tree/ErrorTreeItem';
import { OutputPanelLogger } from '../errors/OutputPanelLogger';

export class ErrorCommands {
  private logger: OutputPanelLogger;

  constructor() {
    this.logger = OutputPanelLogger.getInstance();
  }

  /**
   * Register all error-related commands
   */
  public register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'kube9.retryFailedOperation',
        this.retryFailedOperation,
        this
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'kube9.viewErrorDetails',
        this.viewErrorDetails,
        this
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'kube9.copyErrorDetails',
        this.copyErrorDetails,
        this
      )
    );
  }

  /**
   * Retry a failed operation from error tree item
   */
  private async retryFailedOperation(errorItem: ErrorTreeItem): Promise<void> {
    if (!errorItem.retryCallback) {
      vscode.window.showWarningMessage('This error cannot be retried automatically');
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Retrying operation...',
          cancellable: false
        },
        async () => {
          await errorItem.retryCallback!();
        }
      );
      
      vscode.window.showInformationMessage('Operation retry succeeded');
    } catch (error: any) {
      vscode.window.showErrorMessage(`Retry failed: ${error.message}`);
    }
  }

  /**
   * View full error details in Output Panel
   */
  private async viewErrorDetails(errorItem: ErrorTreeItem): Promise<void> {
    this.logger.log('='.repeat(80));
    this.logger.log('ERROR DETAILS');
    this.logger.log('='.repeat(80));
    this.logger.log(`Message: ${errorItem.errorMessage}`);
    this.logger.log(`Category: ${errorItem.errorCategory}`);
    
    if (errorItem.errorDetails) {
      this.logger.log(`Details: ${errorItem.errorDetails}`);
    }
    
    this.logger.log('='.repeat(80));
    this.logger.show();
  }

  /**
   * Copy error details to clipboard
   */
  private async copyErrorDetails(errorItem: ErrorTreeItem): Promise<void> {
    const errorText = `
Error: ${errorItem.errorMessage}
Category: ${errorItem.errorCategory}
${errorItem.errorDetails ? `Details: ${errorItem.errorDetails}` : ''}
Timestamp: ${new Date().toISOString()}
    `.trim();

    await vscode.env.clipboard.writeText(errorText);
    vscode.window.showInformationMessage('Error details copied to clipboard');
  }
}
```

### Package.json Contributions

Add context menu items for error tree items:

```json
{
  "contributes": {
    "menus": {
      "view/item/context": [
        {
          "command": "kube9.retryFailedOperation",
          "when": "view == kube9Tree && viewItem == error",
          "group": "inline@1"
        },
        {
          "command": "kube9.viewErrorDetails",
          "when": "view == kube9Tree && viewItem == error",
          "group": "error@1"
        },
        {
          "command": "kube9.copyErrorDetails",
          "when": "view == kube9Tree && viewItem == error",
          "group": "error@2"
        }
      ]
    },
    "commands": [
      {
        "command": "kube9.retryFailedOperation",
        "title": "Retry",
        "icon": "$(refresh)"
      },
      {
        "command": "kube9.viewErrorDetails",
        "title": "View Error Details"
      },
      {
        "command": "kube9.copyErrorDetails",
        "title": "Copy Error Details"
      }
    ]
  }
}
```

## UI Behavior

### Error Item Display

1. **Icon**: Red error icon (`$(error)`) with error foreground color
2. **Label**: Brief error message (e.g., "Failed to load pods")
3. **Description**: Error category (e.g., "Connection failed", "Access denied")
4. **Tooltip**: Detailed error information with formatted details

### Context Menu Actions

1. **Retry** (inline icon): Attempt to reload the failed operation
2. **View Error Details**: Open Output Panel with full error details
3. **Copy Error Details**: Copy error information to clipboard

### Graceful Degradation

When multiple resource types are loading:
- Successfully loaded resources appear normally
- Failed resources show error items
- Tree view remains functional for successful items
- Users can retry individual failed items

## Error States

### Connection Error Display

```
├─ 🔴 Failed to load cluster resources (Connection failed)
│  └─ Right-click to retry or view details
```

### Permission Error Display

```
├─ Namespaces
│  ├─ default
│  └─ 🔴 Failed to load pods (Access denied)
│     └─ Right-click to view RBAC documentation
```

### Timeout Error Display

```
├─ Workloads
│  └─ 🔴 Failed to load deployments (Timed out)
│     └─ Right-click to retry or increase timeout
```

## Testing Requirements

### Unit Tests
- ErrorTreeItem creation with different categories
- Error categorization logic
- Error message extraction
- Tooltip formatting

### Integration Tests
- Error items display in tree view
- Context menu commands execute correctly
- Retry callback functionality
- Graceful degradation with mixed success/failure

## Best Practices

1. **Never block entire tree** - Show errors inline, not as modal dialogs
2. **Always provide retry** - Include retry callback when possible
3. **Show brief message in label** - Full details in tooltip
4. **Use appropriate icons** - Visual cues for error types
5. **Enable partial loading** - Don't fail entire tree if one category fails

