---
spec_id: error-handler-utility
name: Error Handler Utility
description: Central error handling utility for consistent error processing throughout the extension
feature_id:
  - connection-errors
  - rbac-permission-errors
  - resource-not-found-errors
  - api-errors
  - timeout-errors
  - error-ux-improvements
diagram_id:
  - error-handling-flow
---

# Error Handler Utility

## Overview

A centralized error handling utility that provides consistent error processing, user-friendly messaging, and comprehensive logging throughout the kube9 VS Code extension.

## Architecture

See [error-handling-flow](../../diagrams/error-handling/error-handling-flow.diagram.md) for visual representation of the error handling flow.

## Implementation Details

### Core Error Handler Class

**Location**: Create new file `src/errors/ErrorHandler.ts`

```typescript
import * as vscode from 'vscode';
import { OutputPanelLogger } from './OutputPanelLogger';
import { ErrorMetrics } from './ErrorMetrics';

export enum ErrorType {
  CONNECTION = 'CONNECTION',
  RBAC = 'RBAC',
  NOT_FOUND = 'NOT_FOUND',
  API = 'API',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  UNEXPECTED = 'UNEXPECTED'
}

export enum ErrorSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ErrorContext {
  cluster?: string;
  namespace?: string;
  resourceType?: string;
  resourceName?: string;
  operation?: string;
  [key: string]: any;
}

export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  technicalDetails?: string;
  context?: ErrorContext;
  error?: Error;
  statusCode?: number;
  suggestions?: string[];
  actions?: ErrorAction[];
  documentationUrl?: string;
}

export interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: OutputPanelLogger;
  private metrics: ErrorMetrics;
  private errorThrottleMap: Map<string, number>;
  private readonly THROTTLE_WINDOW = 5000; // 5 seconds

  private constructor() {
    this.logger = OutputPanelLogger.getInstance();
    this.metrics = ErrorMetrics.getInstance();
    this.errorThrottleMap = new Map();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Main error handling method
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
   * Display error notification to user
   */
  private async displayError(details: ErrorDetails): Promise<void> {
    const message = this.formatErrorMessage(details);
    const actions = this.formatActions(details);

    switch (details.severity) {
      case ErrorSeverity.ERROR:
        const errorChoice = await vscode.window.showErrorMessage(message, ...actions);
        await this.handleActionChoice(errorChoice, details);
        break;
      case ErrorSeverity.WARNING:
        const warningChoice = await vscode.window.showWarningMessage(message, ...actions);
        await this.handleActionChoice(warningChoice, details);
        break;
      case ErrorSeverity.INFO:
        const infoChoice = await vscode.window.showInformationMessage(message, ...actions);
        await this.handleActionChoice(infoChoice, details);
        break;
    }
  }

  /**
   * Format error message for display
   */
  private formatErrorMessage(details: ErrorDetails): string {
    let message = details.message;

    // Add context if available
    if (details.context) {
      const contextParts: string[] = [];
      if (details.context.cluster) contextParts.push(`Cluster: ${details.context.cluster}`);
      if (details.context.namespace) contextParts.push(`Namespace: ${details.context.namespace}`);
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
   * Format action buttons from error details
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
   * Handle user's action choice
   */
  private async handleActionChoice(
    choice: string | undefined,
    details: ErrorDetails
  ): Promise<void> {
    if (!choice) return;

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
   * Check if error should be throttled
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
   * Open GitHub to report issue
   */
  private async reportIssue(details: ErrorDetails): Promise<void> {
    const issueBody = this.generateIssueTemplate(details);
    const title = encodeURIComponent(`[Bug] ${details.type}: ${details.message.substring(0, 50)}...`);
    const body = encodeURIComponent(issueBody);
    const url = `https://github.com/alto9/kube9-vscode/issues/new?title=${title}&body=${body}`;
    
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * Generate issue template content
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
   * Copy error details to clipboard
   */
  private async copyErrorDetails(details: ErrorDetails): Promise<void> {
    const errorText = this.formatErrorDetailsForCopy(details);
    await vscode.env.clipboard.writeText(errorText);
    vscode.window.showInformationMessage('Error details copied to clipboard');
  }

  /**
   * Format error details for clipboard
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
```

### Specific Error Handlers

**Location**: Create new file `src/errors/SpecificErrorHandlers.ts`

```typescript
import * as vscode from 'vscode';
import { ErrorHandler, ErrorDetails, ErrorType, ErrorSeverity } from './ErrorHandler';

export class ConnectionErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public async handleConnectionError(
    error: any,
    cluster: string,
    kubeconfigPath: string
  ): Promise<void> {
    const details: ErrorDetails = {
      type: ErrorType.CONNECTION,
      severity: ErrorSeverity.ERROR,
      message: `Cannot connect to cluster '${cluster}'`,
      technicalDetails: error.message || error.toString(),
      context: {
        cluster,
        operation: 'connect'
      },
      error,
      suggestions: [
        'Check your network connection',
        `Verify cluster endpoint in kubeconfig (${kubeconfigPath})`,
        'Ensure kubectl is installed and accessible'
      ],
      actions: [
        {
          label: 'Retry',
          action: async () => {
            // Implement retry logic
          }
        },
        {
          label: 'Open Kubeconfig',
          action: async () => {
            const doc = await vscode.workspace.openTextDocument(kubeconfigPath);
            await vscode.window.showTextDocument(doc);
          }
        },
        {
          label: 'Troubleshooting Guide',
          action: async () => {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://kube9.io/docs/troubleshooting#connection-errors')
            );
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }

  public async handleKubectlNotFound(): Promise<void> {
    const details: ErrorDetails = {
      type: ErrorType.CONNECTION,
      severity: ErrorSeverity.ERROR,
      message: 'kubectl executable not found',
      suggestions: [
        'Install kubectl and add it to your system PATH',
        'Restart VS Code after installing kubectl'
      ],
      actions: [
        {
          label: 'Installation Guide',
          action: async () => {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://kubernetes.io/docs/tasks/tools/')
            );
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }
}

export class RBACErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public async handlePermissionDenied(
    error: any,
    resource: string,
    verb: string,
    namespace?: string
  ): Promise<void> {
    const namespaceText = namespace ? ` in namespace '${namespace}'` : ' (cluster-scoped)';
    
    const details: ErrorDetails = {
      type: ErrorType.RBAC,
      severity: ErrorSeverity.ERROR,
      message: `Permission denied: Cannot ${verb} ${resource}${namespaceText}`,
      technicalDetails: error.response?.body?.message || error.message,
      statusCode: 403,
      context: {
        resourceType: resource,
        operation: verb,
        namespace
      },
      error,
      suggestions: [
        `Required permission: ${resource}.${verb}${namespace ? ` in namespace '${namespace}'` : ''}`,
        'Check your ServiceAccount permissions',
        'Contact your cluster administrator for access',
        `Run: kubectl auth can-i ${verb} ${resource}${namespace ? ` -n ${namespace}` : ''}`
      ],
      actions: [
        {
          label: 'RBAC Documentation',
          action: async () => {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://kubernetes.io/docs/reference/access-authn-authz/rbac/')
            );
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }
}

export class ResourceNotFoundErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public async handleResourceNotFound(
    resourceType: string,
    resourceName: string,
    namespace?: string,
    onRefresh?: () => Promise<void>
  ): Promise<void> {
    const namespaceText = namespace ? ` in namespace '${namespace}'` : '';
    
    const details: ErrorDetails = {
      type: ErrorType.NOT_FOUND,
      severity: ErrorSeverity.WARNING,
      message: `Resource ${resourceType}/${resourceName} not found${namespaceText}`,
      statusCode: 404,
      context: {
        resourceType,
        resourceName,
        namespace
      },
      suggestions: [
        'The resource may have been deleted by another user or process',
        'Try refreshing the tree view'
      ],
      actions: [
        {
          label: 'Refresh Tree View',
          action: async () => {
            if (onRefresh) {
              await onRefresh();
            }
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }
}

export class TimeoutErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public async handleTimeout(
    operation: string,
    duration: number,
    onRetry?: () => Promise<void>
  ): Promise<void> {
    const durationText = this.formatDuration(duration);
    
    const details: ErrorDetails = {
      type: ErrorType.TIMEOUT,
      severity: ErrorSeverity.WARNING,
      message: `Operation timed out after ${durationText}`,
      context: {
        operation,
        timeout: duration
      },
      suggestions: [
        'The cluster may be slow to respond',
        'Check your network connection',
        'Consider increasing the timeout in settings'
      ],
      actions: [
        {
          label: 'Retry',
          action: async () => {
            if (onRetry) {
              await onRetry();
            }
          }
        },
        {
          label: 'Increase Timeout',
          action: async () => {
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              'kube9.timeout'
            );
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
    return `${Math.round(ms / 60000)} minutes`;
  }
}

export class APIErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public async handleAPIError(
    error: any,
    operation: string,
    context?: any
  ): Promise<void> {
    const statusCode = error.response?.statusCode || error.statusCode;
    const apiMessage = error.response?.body?.message || error.message;

    // Delegate to specific handlers
    if (statusCode === 401) {
      await this.handleUnauthorized(error);
    } else if (statusCode === 403) {
      // Handle via RBACErrorHandler
    } else if (statusCode === 404) {
      // Handle via ResourceNotFoundErrorHandler
    } else if (statusCode === 409) {
      await this.handleConflict(error, context);
    } else if (statusCode === 429) {
      await this.handleRateLimit(error);
    } else if (statusCode >= 500) {
      await this.handleServerError(error, operation);
    } else {
      await this.handleGenericAPIError(error, operation);
    }
  }

  private async handleUnauthorized(error: any): Promise<void> {
    const details: ErrorDetails = {
      type: ErrorType.API,
      severity: ErrorSeverity.ERROR,
      message: 'Authentication failed: Invalid or expired credentials',
      technicalDetails: error.response?.body?.message,
      statusCode: 401,
      error,
      suggestions: [
        'Check your kubeconfig authentication settings',
        'You may need to refresh your cluster credentials',
        'Verify your authentication token is valid'
      ],
      actions: [
        {
          label: 'Open Kubeconfig',
          action: async () => {
            const kubeconfigPath = process.env.KUBECONFIG || '~/.kube/config';
            const doc = await vscode.workspace.openTextDocument(kubeconfigPath);
            await vscode.window.showTextDocument(doc);
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }

  private async handleConflict(error: any, context?: any): Promise<void> {
    const details: ErrorDetails = {
      type: ErrorType.API,
      severity: ErrorSeverity.WARNING,
      message: 'Resource conflict: Resource already exists or has been modified',
      technicalDetails: error.response?.body?.message,
      statusCode: 409,
      context,
      error,
      suggestions: [
        'The resource may have been updated by another user',
        'Try refreshing and retrying the operation'
      ],
      actions: [
        {
          label: 'Refresh',
          action: async () => {
            // Implement refresh
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }

  private async handleRateLimit(error: any): Promise<void> {
    const retryAfter = error.response?.headers?.['retry-after'] || '60';
    
    const details: ErrorDetails = {
      type: ErrorType.API,
      severity: ErrorSeverity.WARNING,
      message: 'API rate limit exceeded',
      technicalDetails: `Retry after ${retryAfter} seconds`,
      statusCode: 429,
      error,
      suggestions: [
        'Too many requests sent to the cluster',
        `Wait ${retryAfter} seconds before retrying`
      ]
    };

    await this.errorHandler.handleError(details);
  }

  private async handleServerError(error: any, operation: string): Promise<void> {
    const details: ErrorDetails = {
      type: ErrorType.API,
      severity: ErrorSeverity.ERROR,
      message: 'Cluster internal error: The Kubernetes API encountered an error',
      technicalDetails: error.response?.body?.message,
      statusCode: error.response?.statusCode,
      context: { operation },
      error,
      suggestions: [
        'This may be a temporary cluster issue',
        'Check cluster health or contact administrator'
      ],
      actions: [
        {
          label: 'Retry',
          action: async () => {
            // Implement retry
          }
        }
      ]
    };

    await this.errorHandler.handleError(details);
  }

  private async handleGenericAPIError(error: any, operation: string): Promise<void> {
    const statusCode = error.response?.statusCode || 'unknown';
    
    const details: ErrorDetails = {
      type: ErrorType.API,
      severity: ErrorSeverity.ERROR,
      message: `API Error (${statusCode}): ${error.message}`,
      technicalDetails: error.response?.body ? JSON.stringify(error.response.body, null, 2) : error.toString(),
      statusCode: error.response?.statusCode,
      context: { operation },
      error
    };

    await this.errorHandler.handleError(details);
  }
}
```

### Output Panel Logger

**Location**: Create new file `src/errors/OutputPanelLogger.ts`

```typescript
import * as vscode from 'vscode';
import { ErrorDetails } from './ErrorHandler';

export class OutputPanelLogger {
  private static instance: OutputPanelLogger;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('kube9');
  }

  public static getInstance(): OutputPanelLogger {
    if (!OutputPanelLogger.instance) {
      OutputPanelLogger.instance = new OutputPanelLogger();
    }
    return OutputPanelLogger.instance;
  }

  public log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    this.outputChannel.appendLine(`${prefix} ${message}`);
  }

  public logError(details: ErrorDetails): void {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine(`ERROR: ${details.message}`);
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    this.outputChannel.appendLine(`Type: ${details.type}`);
    this.outputChannel.appendLine(`Severity: ${details.severity}`);
    
    if (details.statusCode) {
      this.outputChannel.appendLine(`Status Code: ${details.statusCode}`);
    }
    
    if (details.context) {
      this.outputChannel.appendLine('Context:');
      this.outputChannel.appendLine(JSON.stringify(details.context, null, 2));
    }
    
    if (details.technicalDetails) {
      this.outputChannel.appendLine('Technical Details:');
      this.outputChannel.appendLine(details.technicalDetails);
    }
    
    if (details.error?.stack) {
      this.outputChannel.appendLine('Stack Trace:');
      this.outputChannel.appendLine(details.error.stack);
    }
    
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('');
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
```

### Error Metrics

**Location**: Create new file `src/errors/ErrorMetrics.ts`

```typescript
import { ErrorType } from './ErrorHandler';

export class ErrorMetrics {
  private static instance: ErrorMetrics;
  private errorCounts: Map<ErrorType, number>;

  private constructor() {
    this.errorCounts = new Map();
  }

  public static getInstance(): ErrorMetrics {
    if (!ErrorMetrics.instance) {
      ErrorMetrics.instance = new ErrorMetrics();
    }
    return ErrorMetrics.instance;
  }

  public recordError(type: ErrorType): void {
    const count = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, count + 1);
  }

  public getErrorCount(type: ErrorType): number {
    return this.errorCounts.get(type) || 0;
  }

  public getTotalErrors(): number {
    let total = 0;
    for (const count of this.errorCounts.values()) {
      total += count;
    }
    return total;
  }

  public reset(): void {
    this.errorCounts.clear();
  }

  public getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const [type, count] of this.errorCounts.entries()) {
      summary[type] = count;
    }
    return summary;
  }
}
```

## Usage Examples

### In ClusterTreeProvider

```typescript
import { ConnectionErrorHandler, APIErrorHandler } from '../errors/SpecificErrorHandlers';

class ClusterTreeProvider {
  private connectionErrorHandler = new ConnectionErrorHandler();
  private apiErrorHandler = new APIErrorHandler();

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    try {
      // Fetch resources
      const resources = await this.fetchResources();
      return resources;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        await this.connectionErrorHandler.handleConnectionError(
          error,
          this.currentCluster,
          this.kubeconfigPath
        );
      } else {
        await this.apiErrorHandler.handleAPIError(error, 'list resources');
      }
      return [];
    }
  }
}
```

## Configuration

Add timeout and error handling settings to `package.json`:

```json
{
  "configuration": {
    "properties": {
      "kube9.timeout.connection": {
        "type": "number",
        "default": 10000,
        "description": "Connection timeout in milliseconds"
      },
      "kube9.timeout.apiRequest": {
        "type": "number",
        "default": 30000,
        "description": "API request timeout in milliseconds"
      },
      "kube9.errors.showDetails": {
        "type": "boolean",
        "default": false,
        "description": "Show technical error details in notifications"
      },
      "kube9.errors.throttleWindow": {
        "type": "number",
        "default": 5000,
        "description": "Error throttle window in milliseconds"
      }
    }
  }
}
```

## Testing Requirements

### Unit Tests
- ErrorHandler message formatting
- Error throttling logic
- Action button handling
- Output Panel logging
- Error metrics tracking

### Integration Tests
- Connection error handling flow
- RBAC error detection and display
- Resource not found scenarios
- API error parsing
- Timeout handling with retry

## Best Practices

1. **Always provide context** - Include cluster, namespace, resource information
2. **Use specific error handlers** - Don't use generic error handling for known error types
3. **Throttle repeated errors** - Avoid spamming users with the same error
4. **Log everything to Output Panel** - Users can debug issues with full logs
5. **Provide actionable buttons** - Every error should have at least one action
6. **Use appropriate severity** - Not all errors are critical
7. **Include documentation links** - Help users learn and solve issues independently

