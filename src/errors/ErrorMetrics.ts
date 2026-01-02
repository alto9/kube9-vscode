import { ErrorType } from './types';

/**
 * Singleton class that tracks error occurrences by type, providing analytics
 * and diagnostic information about error patterns throughout the extension.
 */
export class ErrorMetrics {
    private static instance: ErrorMetrics | null = null;
    private errorCounts: Map<ErrorType, number>;

    /**
     * Private constructor to enforce singleton pattern.
     * Use getInstance() to retrieve the instance.
     */
    private constructor() {
        this.errorCounts = new Map();
    }

    /**
     * Get the ErrorMetrics singleton instance.
     * Creates a new instance on first call, returns the same instance on subsequent calls.
     * 
     * @returns The ErrorMetrics instance
     */
    public static getInstance(): ErrorMetrics {
        if (!ErrorMetrics.instance) {
            ErrorMetrics.instance = new ErrorMetrics();
        }
        return ErrorMetrics.instance;
    }

    /**
     * Record an error occurrence by incrementing the count for the specified error type.
     * 
     * @param type - The ErrorType to record
     */
    public recordError(type: ErrorType): void {
        const count = this.errorCounts.get(type) || 0;
        this.errorCounts.set(type, count + 1);
    }

    /**
     * Get the count of errors for a specific error type.
     * Returns 0 if the error type has not been recorded.
     * 
     * @param type - The ErrorType to get the count for
     * @returns The count of errors for the specified type, or 0 if not recorded
     */
    public getErrorCount(type: ErrorType): number {
        return this.errorCounts.get(type) || 0;
    }

    /**
     * Get the total count of all errors across all error types.
     * 
     * @returns The sum of all error counts
     */
    public getTotalErrors(): number {
        let total = 0;
        for (const count of this.errorCounts.values()) {
            total += count;
        }
        return total;
    }

    /**
     * Reset all error counts by clearing the internal map.
     */
    public reset(): void {
        this.errorCounts.clear();
    }

    /**
     * Get a summary of all error counts as a Record object.
     * 
     * @returns A Record mapping error type strings to their counts
     */
    public getSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        for (const [type, count] of this.errorCounts.entries()) {
            summary[type] = count;
        }
        return summary;
    }

    /**
     * Reset the singleton instance. Used primarily for testing.
     * @internal
     */
    public static reset(): void {
        ErrorMetrics.instance = null;
    }
}

