/**
 * Formats an ISO 8601 timestamp to a readable format.
 * 
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted timestamp string (e.g., "Jan 15, 2024, 10:30 AM")
 */
export function formatTimestamp(timestamp: string): string {
    if (!timestamp || timestamp === 'Unknown') {
        return 'Unknown';
    }

    try {
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // Format as: "Jan 15, 2024, 10:30 AM"
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid Date';
    }
}

