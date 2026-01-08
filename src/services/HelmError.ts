/**
 * Error types for Helm operations.
 */
export enum HelmErrorType {
    CLI_NOT_FOUND = 'CLI_NOT_FOUND',
    NETWORK_ERROR = 'NETWORK_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    RELEASE_EXISTS = 'RELEASE_EXISTS',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Structured error class for Helm operations.
 * Provides error type, user-friendly message, suggestion, and retry capability.
 */
export class HelmError extends Error {
    /**
     * Creates a new HelmError instance.
     * 
     * @param type The error type
     * @param message User-friendly error message
     * @param suggestion Optional suggestion for resolving the error
     * @param retryable Whether the error is retryable
     */
    constructor(
        public readonly type: HelmErrorType,
        message: string,
        public readonly suggestion?: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'HelmError';
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HelmError);
        }
    }
}

/**
 * Parses Helm command output to create a structured HelmError.
 * Analyzes stderr and stdout to determine error type and create user-friendly messages.
 * 
 * @param stderr The stderr output from Helm command
 * @param stdout Optional stdout output (may contain error info)
 * @param exitCode Optional exit code from the command
 * @returns Structured HelmError instance
 */
export function parseHelmError(stderr: string, stdout?: string): HelmError {
    const errorText = (stderr || stdout || '').toLowerCase();
    const fullError = stderr || stdout || 'An unknown error occurred';

    // Check for CLI not found errors
    if (errorText.includes('not found') && (errorText.includes('command') || errorText.includes('helm'))) {
        return new HelmError(
            HelmErrorType.CLI_NOT_FOUND,
            'Helm CLI is not installed or not in PATH',
            'Install Helm 3.x from https://helm.sh/docs/intro/install/',
            false
        );
    }

    // Check for network errors
    if (errorText.includes('connection refused') || 
        errorText.includes('timeout') ||
        errorText.includes('unable to connect') ||
        errorText.includes('network') ||
        errorText.includes('econnrefused') ||
        errorText.includes('etimedout')) {
        return new HelmError(
            HelmErrorType.NETWORK_ERROR,
            'Cannot connect to repository or cluster',
            'Check your internet connection and cluster accessibility, then try again',
            true
        );
    }

    // Check for release already exists
    if (errorText.includes('already exists') || 
        errorText.includes('release.*already exists') ||
        errorText.includes('cannot re-use a name') ||
        errorText.includes('re-use a name that is still in use') ||
        errorText.includes('name that is still in use')) {
        return new HelmError(
            HelmErrorType.RELEASE_EXISTS,
            'A release with this name already exists',
            'Uninstall the existing release first, or choose a different name',
            false
        );
    }

    // Check for resource not found
    if (errorText.includes('not found') && !errorText.includes('command')) {
        return new HelmError(
            HelmErrorType.RESOURCE_NOT_FOUND,
            'Resource not found',
            'Ensure the chart or release exists and try again',
            false
        );
    }

    // Check for timeout errors
    if (errorText.includes('timeout') || errorText.includes('timed out')) {
        return new HelmError(
            HelmErrorType.TIMEOUT,
            'Operation timed out',
            'The operation took too long to complete. Try again or increase the timeout',
            true
        );
    }

    // Check for invalid input
    if (errorText.includes('invalid') || 
        errorText.includes('validation') ||
        errorText.includes('parse error') ||
        errorText.includes('malformed')) {
        return new HelmError(
            HelmErrorType.INVALID_INPUT,
            'Invalid input provided',
            'Check your input values and try again',
            false
        );
    }

    // Default to unknown error
    return new HelmError(
        HelmErrorType.UNKNOWN,
        fullError.trim() || 'An unknown error occurred',
        'Check the error details and try again',
        true
    );
}

