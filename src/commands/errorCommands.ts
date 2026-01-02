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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Retry failed: ${errorMessage}`);
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

