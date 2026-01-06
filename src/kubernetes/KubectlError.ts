/**
 * Types of errors that can occur when executing kubectl commands.
 */
export enum KubectlErrorType {
    /**
     * kubectl binary is not installed or not in PATH.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    BinaryNotFound = 'binary_not_found',
    
    /**
     * Cannot connect to the cluster (network error, cluster unreachable, etc.).
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ConnectionFailed = 'connection_failed',
    
    /**
     * Access denied - authentication or authorization failure.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    PermissionDenied = 'permission_denied',
    
    /**
     * Operation timed out waiting for cluster response.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Timeout = 'timeout',
    
    /**
     * Unknown or unrecognized error.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Unknown = 'unknown'
}

/**
 * Structured error information for kubectl command failures.
 * Provides categorized error types and user-friendly messages.
 */
export class KubectlError {
    /**
     * The type/category of the error.
     */
    public readonly type: KubectlErrorType;
    
    /**
     * User-friendly error message suitable for display.
     */
    public readonly message: string;
    
    /**
     * Technical details from stderr or error message.
     */
    public readonly details: string;
    
    /**
     * The cluster context where the error occurred.
     */
    public readonly contextName: string;

    /**
     * Create a new KubectlError instance.
     * 
     * @param type The error type
     * @param message User-friendly error message
     * @param details Technical details
     * @param contextName Cluster context name
     */
    constructor(
        type: KubectlErrorType,
        message: string,
        details: string,
        contextName: string
    ) {
        this.type = type;
        this.message = message;
        this.details = details;
        this.contextName = contextName;
    }

    /**
     * Create a KubectlError from an execution error.
     * Analyzes the error to determine the appropriate error type and message.
     * 
     * @param error The error from execFile/child_process
     * @param contextName The cluster context where the error occurred
     * @returns A structured KubectlError with categorized error information
     */
    public static fromExecError(error: unknown, contextName: string): KubectlError {
        const err = error as { 
            killed?: boolean; 
            signal?: string; 
            code?: string | number; 
            stderr?: Buffer | string;
            stdout?: Buffer | string;
            message?: string;
        };

        // Extract stderr and stdout for analysis
        const stderr = err.stderr 
            ? (Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr).trim()
            : '';
        const stdout = err.stdout
            ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
            : '';
        const errorMessage = err.message || 'Unknown error';
        const details = stderr || stdout || errorMessage;
        const lowerDetails = details.toLowerCase();

        // Detect binary not found (ENOENT error code)
        if (err.code === 'ENOENT') {
            return new KubectlError(
                KubectlErrorType.BinaryNotFound,
                'kubectl is not installed or not in PATH. Please install kubectl to manage Kubernetes clusters.',
                'kubectl command not found',
                contextName
            );
        }

        // Detect timeout (killed by timeout, SIGTERM, ETIMEDOUT, or timeout in error message)
        if (err.killed || err.signal === 'SIGTERM' || err.code === 'ETIMEDOUT' || lowerDetails.includes('timeout')) {
            return new KubectlError(
                KubectlErrorType.Timeout,
                `Connection to cluster '${contextName}' timed out. The cluster may be slow to respond.`,
                'Operation timed out',
                contextName
            );
        }

        // Detect permission/authentication errors by checking stderr content
        if (
            lowerDetails.includes('forbidden') ||
            lowerDetails.includes('unauthorized') ||
            lowerDetails.includes('permission denied') ||
            lowerDetails.includes('access denied') ||
            lowerDetails.includes('authentication') ||
            lowerDetails.includes('not authorized')
        ) {
            return new KubectlError(
                KubectlErrorType.PermissionDenied,
                `Access denied to cluster '${contextName}'. Check your credentials and RBAC permissions.`,
                details,
                contextName
            );
        }

        // Detect connection failures by checking stderr content
        if (
            lowerDetails.includes('connection refused') ||
            lowerDetails.includes('could not resolve') ||
            lowerDetails.includes('no such host') ||
            lowerDetails.includes('connection timed out') ||
            lowerDetails.includes('unreachable') ||
            lowerDetails.includes('dial tcp') ||
            lowerDetails.includes('unable to connect') ||
            lowerDetails.includes('network') ||
            lowerDetails.includes('connect: connection refused')
        ) {
            return new KubectlError(
                KubectlErrorType.ConnectionFailed,
                `Cannot connect to cluster '${contextName}'. The cluster may be unreachable or down.`,
                details,
                contextName
            );
        }

        // Unknown error - provide generic message
        return new KubectlError(
            KubectlErrorType.Unknown,
            `Failed to execute kubectl command for cluster '${contextName}'.`,
            details,
            contextName
        );
    }

    /**
     * Get a user-friendly display message.
     * Suitable for showing in error messages or notifications.
     * 
     * @returns The user-friendly error message
     */
    public getUserMessage(): string {
        return this.message;
    }

    /**
     * Get technical details for logging or debugging.
     * 
     * @returns The technical error details
     */
    public getDetails(): string {
        return this.details;
    }

    /**
     * Convert the error to a string representation.
     * 
     * @returns String representation of the error
     */
    public toString(): string {
        return `${this.type} [${this.contextName}]: ${this.message}`;
    }
}

