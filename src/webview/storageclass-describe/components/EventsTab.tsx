import React from 'react';
import type { StorageClassEvent } from '../../../providers/StorageClassDescribeProvider';

/**
 * Props for EventsTab component.
 */
interface EventsTabProps {
    /** Array of StorageClass events to display */
    events: StorageClassEvent[];
}

/**
 * Formats an ISO 8601 timestamp into a human-readable relative time string.
 * For recent times, shows relative time (e.g., "5m ago", "2h ago").
 * For older times, shows formatted date string.
 * 
 * @param timestamp ISO 8601 timestamp string
 * @returns Human-readable timestamp string
 */
function formatRelativeTime(timestamp: string): string {
    if (!timestamp || timestamp === 'Unknown') {
        return 'Unknown';
    }

    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Show relative time for recent updates
        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
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
 * Events tab component that displays StorageClass events in a timeline format.
 * Shows events sorted by most recent first, with visual distinction
 * between Normal and Warning events.
 */
export const EventsTab: React.FC<EventsTabProps> = ({ events }) => {
    // Handle empty state
    if (events.length === 0) {
        return (
            <div className="empty-state">
                <p>No events found for this StorageClass</p>
                <p className="hint">Events are retained for ~1 hour by Kubernetes</p>
            </div>
        );
    }

    return (
        <div className="events-tab">
            <div className="events-timeline">
                {events.map((event, index) => (
                    <div
                        key={index}
                        className={`event-item event-${event.type.toLowerCase()}`}
                    >
                        <div className="event-icon">
                            {event.type === 'Warning' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="event-content">
                            <div className="event-header">
                                <span className="event-reason">{event.reason}</span>
                                {event.count > 1 && (
                                    <span className="event-count">×{event.count}</span>
                                )}
                                <span className="event-age">{event.age}</span>
                            </div>
                            <div className="event-message">{event.message}</div>
                            <div className="event-meta">
                                Source: {event.source} | First: {formatRelativeTime(event.firstTimestamp)} | Last: {formatRelativeTime(event.lastTimestamp)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
