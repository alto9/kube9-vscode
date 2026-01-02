import * as vscode from 'vscode';
import { OutputPanelLogger } from './OutputPanelLogger';
import { ErrorMetrics } from './ErrorMetrics';
import { ErrorType, ErrorSeverity, ErrorDetails } from './types';

/**
 * Central error handler singleton that orchestrates error processing, logging,
 * throttling, user notification, and action handling throughout the extension.
 */
export class ErrorHandler {
    private static instance: ErrorHandler | null = null;
    private logger: OutputPanelLogger;
    private metrics: ErrorMetrics;
    private errorThrottleMap: Map<string, number>;
    private readonly THROTTLE_WINDOW = 5000; // 5 seconds

    /**
     * Private constructor to enforce singleton pattern.
     * Use getInstance() to retrieve the instance.
     */
    private constructor() {
        this.logger = OutputPanelLogger.getInstance();
        this.metrics = ErrorMetrics.getInstance();
        this.errorThrottleMap = new Map();
    }

    /**
     * Get the ErrorHandler singleton instance.
     * Creates a new instance on first call, returns the same instance on subsequent calls.
     * 
     * @returns The ErrorHandler instance
     */
    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Reset the singleton instance. Used primarily for testing.
     * @internal
     */
    public static reset(): void {
        ErrorHandler.instance = null;
    }

    /**
     * Main error handling method that orchestrates the full error processing flow:
     * logging, metrics tracking, throttling, and user notification.
     * 
     * @param details - The ErrorDetails object containing error information
     */
    public async handleError(details: ErrorDetails): Promise<void> {
        // Log error to Output Panel
        this.logger.logError(details);

        // Track error metrics
        this.metrics.recordError(details.type);

        // Check if error should be throttled
        if (this.shouldThrottle(details)) {
            this.logger.log('Error throttled - not showing notification', 'debug');
            return;
        }

        // Display error to user
        await this.displayError(details);
    }

    /**
     * Display error notification to user based on severity level.
     * Uses appropriate VS Code notification method (error/warning/info).
     * 
     * @param details - The ErrorDetails object containing error information
     */
    private async displayError(details: ErrorDetails): Promise<void> {
        const message = this.formatErrorMessage(details);
        const actions = this.formatActions(details);

        switch (details.severity) {
            case ErrorSeverity.ERROR: {
                const errorChoice = await vscode.window.showErrorMessage(message, ...actions);
                await this.handleActionChoice(errorChoice, details);
                break;
            }
            case ErrorSeverity.WARNING: {
                const warningChoice = await vscode.window.showWarningMessage(message, ...actions);
                await this.handleActionChoice(warningChoice, details);
                break;
            }
            case ErrorSeverity.INFO: {
                const infoChoice = await vscode.window.showInformationMessage(message, ...actions);
                await this.handleActionChoice(infoChoice, details);
                break;
            }
        }
    }

    /**
     * Format error message for display by adding context information.
     * Includes cluster, namespace, and resource information if available.
     * 
     * @param details - The ErrorDetails object containing error information
     * @returns Formatted error message with context
     */
    private formatErrorMessage(details: ErrorDetails): string {
        let message = details.message;

        // Add context if available
        if (details.context) {
            const contextParts: string[] = [];
            if (details.context.cluster) {
                contextParts.push(`Cluster: ${details.context.cluster}`);
            }
            if (details.context.namespace) {
                contextParts.push(`Namespace: ${details.context.namespace}`);
            }
            if (details.context.resourceType && details.context.resourceName) {
                contextParts.push(`Resource: ${details.context.resourceType}/${details.context.resourceName}`);
            }
            
            if (contextParts.length > 0) {
                message += ` (${contextParts.join(', ')})`;
            }
        }

        return message;
    }

    /**
     * Format action buttons from error details.
     * Includes custom actions (if provided) and standard actions.
     * Standard actions always include: View Logs, Copy Error Details.
     * Report Issue is added for UNEXPECTED errors only.
     * 
     * @param details - The ErrorDetails object containing error information
     * @returns Array of action button labels
     */
    private formatActions(details: ErrorDetails): string[] {
        const actions: string[] = [];

        // Add custom actions
        if (details.actions) {
            actions.push(...details.actions.map(a => a.label));
        }

        // Add standard actions
        actions.push('View Logs');
        
        if (details.type === ErrorType.UNEXPECTED) {
            actions.push('Report Issue');
        }
        
        actions.push('Copy Error Details');

        return actions;
    }

    /**
     * Handle user's action choice from the error notification.
     * Routes to custom actions first, then standard actions.
     * 
     * @param choice - The action label selected by the user
     * @param details - The ErrorDetails object containing error information
     */
    private async handleActionChoice(
        choice: string | undefined,
        details: ErrorDetails
    ): Promise<void> {
        if (!choice) {return;}

        // Handle custom actions
        if (details.actions) {
            const customAction = details.actions.find(a => a.label === choice);
            if (customAction) {
                await customAction.action();
                return;
            }
        }

        // Handle standard actions
        switch (choice) {
            case 'View Logs':
                this.logger.show();
                break;
            case 'Report Issue':
                await this.reportIssue(details);
                break;
            case 'Copy Error Details':
                await this.copyErrorDetails(details);
                break;
        }
    }

    /**
     * Check if error should be throttled to prevent duplicate notifications.
     * Errors with the same type and message within the throttle window are suppressed.
     * 
     * @param details - The ErrorDetails object containing error information
     * @returns True if error should be throttled, false otherwise
     */
    private shouldThrottle(details: ErrorDetails): boolean {
        const key = `${details.type}:${details.message}`;
        const now = Date.now();
        const lastOccurrence = this.errorThrottleMap.get(key);

        if (lastOccurrence && now - lastOccurrence < this.THROTTLE_WINDOW) {
            return true;
        }

        this.errorThrottleMap.set(key, now);
        return false;
    }

    /**
     * Open GitHub to report issue with pre-filled template.
     * 
     * @param details - The ErrorDetails object containing error information
     */
    private async reportIssue(details: ErrorDetails): Promise<void> {
        const issueBody = this.generateIssueTemplate(details);
        const title = encodeURIComponent(`[Bug] ${details.type}: ${details.message.substring(0, 50)}...`);
        const body = encodeURIComponent(issueBody);
        const url = `https://github.com/alto9/kube9-vscode/issues/new?title=${title}&body=${body}`;
        
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    /**
     * Generate issue template content for GitHub bug report.
     * Includes error type, severity, description, technical details, context,
     * environment information, and stack trace.
     * 
     * @param details - The ErrorDetails object containing error information
     * @returns Formatted issue template string
     */
    private generateIssueTemplate(details: ErrorDetails): string {
        const extensionVersion = vscode.extensions.getExtension('alto9.kube9')?.packageJSON.version || 'unknown';
        
        return `
## Bug Report

**Error Type:** ${details.type}
**Severity:** ${details.severity}

### Description
${details.message}

### Technical Details
\`\`\`
${details.technicalDetails || 'N/A'}
\`\`\`

### Context
- Cluster: ${details.context?.cluster || 'N/A'}
- Namespace: ${details.context?.namespace || 'N/A'}
- Resource: ${details.context?.resourceType || 'N/A'}/${details.context?.resourceName || 'N/A'}
- Operation: ${details.context?.operation || 'N/A'}

### Environment
- Extension Version: ${extensionVersion}
- VS Code Version: ${vscode.version}
- Platform: ${process.platform}

### Stack Trace
\`\`\`
${details.error?.stack || 'N/A'}
\`\`\`
        `.trim();
    }

    /**
     * Copy error details to clipboard in formatted text.
     * 
     * @param details - The ErrorDetails object containing error information
     */
    private async copyErrorDetails(details: ErrorDetails): Promise<void> {
        const errorText = this.formatErrorDetailsForCopy(details);
        await vscode.env.clipboard.writeText(errorText);
        vscode.window.showInformationMessage('Error details copied to clipboard');
    }

    /**
     * Format error details for clipboard copy.
     * Includes error type, severity, message, timestamp, status code,
     * context, technical details, and stack trace.
     * 
     * @param details - The ErrorDetails object containing error information
     * @returns Formatted error details string
     */
    private formatErrorDetailsForCopy(details: ErrorDetails): string {
        return `
Error Type: ${details.type}
Severity: ${details.severity}
Message: ${details.message}
Timestamp: ${new Date().toISOString()}
${details.statusCode ? `Status Code: ${details.statusCode}` : ''}
${details.context ? `\nContext:\n${JSON.stringify(details.context, null, 2)}` : ''}
${details.technicalDetails ? `\nTechnical Details:\n${details.technicalDetails}` : ''}
${details.error?.stack ? `\nStack Trace:\n${details.error.stack}` : ''}
        `.trim();
    }
}

