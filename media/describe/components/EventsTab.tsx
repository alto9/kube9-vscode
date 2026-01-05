import React, { useState, useMemo } from 'react';
import { NamespaceEvent } from '../../../src/providers/NamespaceDescribeProvider';

interface EventsTabProps {
    /** Namespace events */
    events: NamespaceEvent[];
}

interface EventItemProps {
    /** Event data */
    event: NamespaceEvent;
}

/**
 * Individual event item component displaying event details.
 */
const EventItem: React.FC<EventItemProps> = ({ event }) => {
    const eventTypeClass = event.type === 'Warning' ? 'warning' : 'normal';
    const eventIcon = event.type === 'Warning' ? '⚠️' : 'ℹ️';

    return (
        <div className={`event-item ${eventTypeClass}`}>
            <div className="event-icon" aria-label={`Event type: ${event.type}`}>
                {eventIcon}
            </div>
            <div className="event-content">
                <div className="event-header">
                    <span className="event-reason">{event.reason}</span>
                    {event.count > 1 && (
                        <span className="event-count" aria-label={`Event occurred ${event.count} times`}>
                            {event.count}x
                        </span>
                    )}
                    <span className="event-age">{event.age}</span>
                </div>
                <div className="event-message">{event.message}</div>
                {event.source && (
                    <div className="event-meta">
                        Source: {event.source}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Events tab component displaying namespace events in timeline format.
 */
export const EventsTab: React.FC<EventsTabProps> = ({ events }) => {
    const [showOnlyWarnings, setShowOnlyWarnings] = useState(false);

    // Empty state
    if (events.length === 0) {
        return (
            <div className="events-tab">
                <div className="empty-state">
                    <p>No events found for this namespace</p>
                </div>
            </div>
        );
    }

    // Filter and sort events
    const filteredAndSortedEvents = useMemo(() => {
        let filtered = events;
        
        // Filter by warning type if checkbox is checked
        if (showOnlyWarnings) {
            filtered = events.filter(e => e.type === 'Warning');
        }
        
        // Sort by lastTimestamp descending (most recent first)
        return [...filtered].sort((a, b) => {
            const timeA = new Date(a.lastTimestamp).getTime();
            const timeB = new Date(b.lastTimestamp).getTime();
            return timeB - timeA;
        });
    }, [events, showOnlyWarnings]);

    return (
        <div className="events-tab">
            <div className="events-controls">
                <label className="events-filter-label">
                    <input
                        type="checkbox"
                        checked={showOnlyWarnings}
                        onChange={(e) => setShowOnlyWarnings(e.target.checked)}
                        className="events-filter-checkbox"
                    />
                    <span>Show only warnings</span>
                </label>
            </div>

            <div className="events-timeline">
                {filteredAndSortedEvents.map((event, idx) => (
                    <EventItem key={`${event.reason}-${event.lastTimestamp}-${idx}`} event={event} />
                ))}
            </div>
        </div>
    );
};

