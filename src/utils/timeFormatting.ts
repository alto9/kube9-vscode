/**
 * Utility functions for formatting timestamps as relative time strings.
 */

/**
 * Formats ISO timestamp as relative time (e.g., "2h ago", "5m ago").
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Relative time string (e.g., "2h ago", "5m ago", "30s ago", "3d ago")
 */
export function formatRelativeTime(isoTimestamp: string): string {
    try {
        const now = Date.now();
        const then = new Date(isoTimestamp).getTime();

        // Handle invalid dates
        if (isNaN(then)) {
            return isoTimestamp;
        }

        const diff = now - then;

        // Handle future dates (shouldn't happen, but handle gracefully)
        if (diff < 0) {
            return '0s ago';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ago`;
        }
        if (hours > 0) {
            return `${hours}h ago`;
        }
        if (minutes > 0) {
            return `${minutes}m ago`;
        }
        return `${seconds}s ago`;
    } catch (error) {
        // Fall back to original timestamp if parsing fails
        return isoTimestamp;
    }
}

