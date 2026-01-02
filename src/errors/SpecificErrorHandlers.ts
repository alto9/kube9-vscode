import * as vscode from 'vscode';
import { ErrorHandler } from './ErrorHandler';
import { ErrorDetails, ErrorType, ErrorSeverity } from './types';

/**
 * Handler for connection-related errors.
 * Provides specific error handling for cluster connection failures and kubectl not found scenarios.
 */
export class ConnectionErrorHandler {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Handle connection error when unable to connect to a cluster.
     * 
     * @param error - The error that occurred
     * @param cluster - The cluster name that failed to connect
     * @param kubeconfigPath - Path to the kubeconfig file
     */
    public async handleConnectionError(
        error: Error | unknown,
        cluster: string,
        kubeconfigPath: string
    ): Promise<void> {
        const details: ErrorDetails = {
            type: ErrorType.CONNECTION,
            severity: ErrorSeverity.ERROR,
            message: `Cannot connect to cluster '${cluster}'`,
            technicalDetails: error instanceof Error ? error.message : String(error),
            context: {
                cluster,
                operation: 'connect'
            },
            error: error instanceof Error ? error : undefined,
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

    /**
     * Handle error when kubectl executable is not found.
     */
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

/**
 * Handler for RBAC (Role-Based Access Control) permission errors.
 * Provides specific error handling for permission denied scenarios.
 */
export class RBACErrorHandler {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Handle permission denied error.
     * 
     * @param error - The error that occurred
     * @param resource - The Kubernetes resource type (e.g., 'pods', 'deployments')
     * @param verb - The action verb (e.g., 'get', 'list', 'create')
     * @param namespace - Optional namespace where the operation was attempted
     */
    public async handlePermissionDenied(
        error: Error | { response?: { body?: { message?: string } }; message?: string } | unknown,
        resource: string,
        verb: string,
        namespace?: string
    ): Promise<void> {
        const namespaceText = namespace ? ` in namespace '${namespace}'` : ' (cluster-scoped)';
        
        const details: ErrorDetails = {
            type: ErrorType.RBAC,
            severity: ErrorSeverity.ERROR,
            message: `Permission denied: Cannot ${verb} ${resource}${namespaceText}`,
            technicalDetails: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'body' in error.response && error.response.body && typeof error.response.body === 'object' && 'message' in error.response.body) 
                ? String(error.response.body.message)
                : (error instanceof Error ? error.message : String(error)),
            statusCode: 403,
            context: {
                resourceType: resource,
                operation: verb,
                namespace
            },
            error: error instanceof Error ? error : undefined,
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

/**
 * Handler for resource not found errors.
 * Provides specific error handling for 404 scenarios.
 */
export class ResourceNotFoundErrorHandler {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Handle resource not found error.
     * 
     * @param resourceType - The Kubernetes resource type (e.g., 'Pod', 'Deployment')
     * @param resourceName - The name of the resource
     * @param namespace - Optional namespace where the resource was expected
     * @param onRefresh - Optional callback to refresh the tree view
     */
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

/**
 * Handler for timeout errors.
 * Provides specific error handling for operations that exceed their time limit.
 */
export class TimeoutErrorHandler {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Handle timeout error.
     * 
     * @param operation - Description of the operation that timed out
     * @param duration - Duration in milliseconds that elapsed before timeout
     * @param onRetry - Optional callback to retry the operation
     */
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

    /**
     * Format duration in milliseconds to human-readable string.
     * 
     * @param ms - Duration in milliseconds
     * @returns Formatted duration string (e.g., "500ms", "5 seconds", "2 minutes")
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${Math.round(ms / 1000)} seconds`;
        }
        return `${Math.round(ms / 60000)} minutes`;
    }
}

/**
 * Handler for API errors from Kubernetes API or other external APIs.
 * Routes to specific handlers based on HTTP status codes.
 */
export class APIErrorHandler {
    private errorHandler: ErrorHandler;

    constructor() {
        this.errorHandler = ErrorHandler.getInstance();
    }

    /**
     * Handle API error by routing to specific handler based on status code.
     * 
     * @param error - The error that occurred
     * @param operation - Description of the operation being performed
     * @param context - Optional additional context
     */
    public async handleAPIError(
        error: Error | { response?: { statusCode?: number; body?: { message?: string }; headers?: Record<string, string> }; statusCode?: number; message?: string } | unknown,
        operation: string,
        context?: unknown
    ): Promise<void> {
        const errorObj = error && typeof error === 'object' ? error as { response?: { statusCode?: number }; statusCode?: number } : null;
        const statusCode = errorObj?.response?.statusCode || errorObj?.statusCode;

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
        } else if (statusCode && statusCode >= 500) {
            await this.handleServerError(error, operation);
        } else {
            await this.handleGenericAPIError(error, operation);
        }
    }

    /**
     * Handle 401 Unauthorized errors.
     * 
     * @param error - The error that occurred
     */
    private async handleUnauthorized(error: Error | { response?: { body?: { message?: string } }; message?: string } | unknown): Promise<void> {
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: 'Authentication failed: Invalid or expired credentials',
            technicalDetails: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'body' in error.response && error.response.body && typeof error.response.body === 'object' && 'message' in error.response.body)
                ? String(error.response.body.message)
                : undefined,
            statusCode: 401,
            error: error instanceof Error ? error : undefined,
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

    /**
     * Handle 409 Conflict errors.
     * 
     * @param error - The error that occurred
     * @param context - Optional additional context
     */
    private async handleConflict(error: Error | { response?: { body?: { message?: string } }; message?: string } | unknown, context?: unknown): Promise<void> {
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.WARNING,
            message: 'Resource conflict: Resource already exists or has been modified',
            technicalDetails: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'body' in error.response && error.response.body && typeof error.response.body === 'object' && 'message' in error.response.body)
                ? String(error.response.body.message)
                : undefined,
            statusCode: 409,
            context: context && typeof context === 'object' ? context as Record<string, unknown> : undefined,
            error: error instanceof Error ? error : undefined,
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

    /**
     * Handle 429 Rate Limit errors.
     * 
     * @param error - The error that occurred
     */
    private async handleRateLimit(error: Error | { response?: { headers?: Record<string, string> }; message?: string } | unknown): Promise<void> {
        const errorObj = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'headers' in error.response && error.response.headers
            ? error.response.headers as Record<string, string>
            : null;
        const retryAfter = errorObj?.['retry-after'] || '60';
        
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.WARNING,
            message: 'API rate limit exceeded',
            technicalDetails: `Retry after ${retryAfter} seconds`,
            statusCode: 429,
            error: error instanceof Error ? error : undefined,
            suggestions: [
                'Too many requests sent to the cluster',
                `Wait ${retryAfter} seconds before retrying`
            ]
        };

        await this.errorHandler.handleError(details);
    }

    /**
     * Handle 500+ Server Error errors.
     * 
     * @param error - The error that occurred
     * @param operation - Description of the operation being performed
     */
    private async handleServerError(error: Error | { response?: { statusCode?: number; body?: { message?: string } }; message?: string } | unknown, operation: string): Promise<void> {
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: 'Cluster internal error: The Kubernetes API encountered an error',
            technicalDetails: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'body' in error.response && error.response.body && typeof error.response.body === 'object' && 'message' in error.response.body)
                ? String(error.response.body.message)
                : undefined,
            statusCode: (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'statusCode' in error.response && typeof error.response.statusCode === 'number')
                ? error.response.statusCode
                : undefined,
            context: { operation },
            error: error instanceof Error ? error : undefined,
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

    /**
     * Handle generic API errors (other status codes).
     * 
     * @param error - The error that occurred
     * @param operation - Description of the operation being performed
     */
    private async handleGenericAPIError(error: Error | { response?: { statusCode?: number; body?: unknown }; message?: string } | unknown, operation: string): Promise<void> {
        const errorObj = error && typeof error === 'object' ? error as { response?: { statusCode?: number; body?: unknown }; message?: string } : null;
        const statusCode = errorObj?.response?.statusCode || 'unknown';
        const errorMessage = error instanceof Error ? error.message : (errorObj?.message || String(error));
        
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: `API Error (${statusCode}): ${errorMessage}`,
            technicalDetails: errorObj?.response?.body ? JSON.stringify(errorObj.response.body, null, 2) : String(error),
            statusCode: errorObj?.response?.statusCode,
            context: { operation },
            error: error instanceof Error ? error : undefined
        };

        await this.errorHandler.handleError(details);
    }
}

