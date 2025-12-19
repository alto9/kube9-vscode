/**
 * Date formatting utilities for Events Viewer webview.
 * Formats ISO timestamps into human-readable strings.
 */

/**
 * Formats an ISO 8601 timestamp into a human-readable date string.
 * For recent times (< 1 hour), shows relative time (e.g., "2 minutes ago").
 * For older times, shows formatted date string.
 * 
 * @param timestamp ISO 8601 timestamp string
 * @returns Human-readable timestamp string
 */
export function formatRelativeTime(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Show relative time for recent updates (< 1 hour)
        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }

        // For older times, show formatted date
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        // Fall back to original timestamp if parsing fails
        return timestamp;
    }
}

/**
 * Formats an ISO 8601 timestamp into a readable date string.
 * 
 * @param timestamp ISO 8601 timestamp string
 * @returns Formatted date string (e.g., "Dec 8, 2025 10:30 AM")
 */
export function formatDate(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        // Fall back to original timestamp if parsing fails
        return timestamp;
    }
}

