/**
 * Error handling types and interfaces for the kube9 extension.
 * Provides foundational type definitions for structured error handling throughout the extension.
 */

/**
 * Types of errors that can occur in the kube9 extension.
 */
export enum ErrorType {
    /**
     * Connection errors - cannot reach the cluster or network issues.
     */
    CONNECTION = 'CONNECTION',
    
    /**
     * RBAC permission errors - access denied due to insufficient permissions.
     */
    RBAC = 'RBAC',
    
    /**
     * Resource not found errors - requested resource does not exist.
     */
    NOT_FOUND = 'NOT_FOUND',
    
    /**
     * API errors - errors from Kubernetes API or other external APIs.
     */
    API = 'API',
    
    /**
     * Timeout errors - operations that exceeded their time limit.
     */
    TIMEOUT = 'TIMEOUT',
    
    /**
     * Validation errors - invalid input or configuration.
     */
    VALIDATION = 'VALIDATION',
    
    /**
     * Unexpected errors - unhandled or unknown error types.
     */
    UNEXPECTED = 'UNEXPECTED'
}

/**
 * Severity levels for errors.
 */
export enum ErrorSeverity {
    /**
     * Error level - critical issues that prevent operation.
     */
    ERROR = 'error',
    
    /**
     * Warning level - issues that may cause problems but don't prevent operation.
     */
    WARNING = 'warning',
    
    /**
     * Info level - informational messages about non-critical issues.
     */
    INFO = 'info'
}

/**
 * Context information about where an error occurred.
 * Provides Kubernetes-specific context for better error messages.
 */
export interface ErrorContext {
    /** The cluster context name where the error occurred */
    cluster?: string;
    
    /** The namespace where the error occurred */
    namespace?: string;
    
    /** The type of Kubernetes resource involved */
    resourceType?: string;
    
    /** The name of the resource involved */
    resourceName?: string;
    
    /** The operation being performed when the error occurred */
    operation?: string;
    
    /** Additional context properties */
    [key: string]: unknown;
}

/**
 * Action that can be taken in response to an error.
 * Used to provide actionable error recovery options to users.
 */
export interface ErrorAction {
    /** User-friendly label for the action */
    label: string;
    
    /** Function to execute when the action is triggered */
    action: () => void | Promise<void>;
}

/**
 * Complete error details with all contextual information.
 * This is the primary interface for structured error handling throughout the extension.
 */
export interface ErrorDetails {
    /** The type/category of the error */
    type: ErrorType;
    
    /** The severity level of the error */
    severity: ErrorSeverity;
    
    /** User-friendly error message */
    message: string;
    
    /** Optional technical details for debugging */
    technicalDetails?: string;
    
    /** Optional context about where the error occurred */
    context?: ErrorContext;
    
    /** Optional underlying Error object */
    error?: Error;
    
    /** Optional HTTP status code if applicable */
    statusCode?: number;
    
    /** Optional suggestions for resolving the error */
    suggestions?: string[];
    
    /** Optional actions the user can take */
    actions?: ErrorAction[];
    
    /** Optional URL to relevant documentation */
    documentationUrl?: string;
}

