import * as vscode from 'vscode';

/**
 * Categories of errors that can occur in the tree view.
 */
export enum ErrorCategory {
  CONNECTION = 'connection',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Tree item class for displaying errors in the kube9 tree view.
 * Shows error states with appropriate icons, tooltips, and supports retry callbacks.
 */
export class ErrorTreeItem extends vscode.TreeItem {
  /**
   * The error message to display.
   */
  public readonly errorMessage: string;

  /**
   * The category of the error.
   */
  public readonly errorCategory: ErrorCategory;

  /**
   * Optional detailed error information.
   */
  public readonly errorDetails?: string;

  /**
   * Optional callback function to retry the failed operation.
   */
  public readonly retryCallback?: () => Promise<void>;

  /**
   * Creates a new ErrorTreeItem.
   * 
   * @param errorMessage The error message to display
   * @param errorCategory The category of the error
   * @param errorDetails Optional detailed error information
   * @param retryCallback Optional callback function to retry the failed operation
   */
  constructor(
    errorMessage: string,
    errorCategory: ErrorCategory,
    errorDetails?: string,
    retryCallback?: () => Promise<void>
  ) {
    super(errorMessage, vscode.TreeItemCollapsibleState.None);

    this.errorMessage = errorMessage;
    this.errorCategory = errorCategory;
    this.errorDetails = errorDetails;
    this.retryCallback = retryCallback;

    this.iconPath = this.getErrorIcon();
    this.tooltip = this.buildTooltip();
    this.contextValue = 'error';
    this.description = this.getErrorDescription();
  }

  /**
   * Gets the error icon with appropriate color.
   * 
   * @returns ThemeIcon with error symbol and errorForeground color
   */
  private getErrorIcon(): vscode.ThemeIcon {
    return new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground')
    );
  }

  /**
   * Builds a formatted tooltip with error details.
   * 
   * @returns MarkdownString with formatted error information
   */
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

  /**
   * Gets a user-friendly description based on the error category.
   * 
   * @returns Description string for the error category
   */
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

