/**
 * Utility functions for deployment describe webview data transformation.
 * Handles parsing Kubernetes resource values, time formatting, and image tag extraction.
 */

import { parseKubernetesQuantity, formatQuantity } from './kubernetesQuantity';
import { formatRelativeTime } from './timeFormatting';

/**
 * Parses Kubernetes resource value and returns both formatted string and raw number.
 * @param value - Resource value (string or number)
 * @param type - Resource type ('cpu' or 'memory')
 * @returns Object with formatted value string and raw number
 */
export function parseResourceValue(
    value: string | number,
    type: 'cpu' | 'memory'
): { value: string; raw: number } {
    // Handle undefined/null
    if (value === undefined || value === null) {
        return { value: '0', raw: 0 };
    }

    // Convert number to string if needed
    const valueStr = typeof value === 'number' ? String(value) : value;

    // Handle empty string
    if (valueStr === '') {
        return { value: '0', raw: 0 };
    }

    // Parse based on type
    const unit = type === 'cpu' ? 'cores' : 'bytes';
    const raw = parseKubernetesQuantity(valueStr, unit);
    
    // Format for display
    const formatted = formatQuantity(raw, unit);

    return {
        value: formatted,
        raw: raw
    };
}

/**
 * Calculates relative age from ISO timestamp (e.g., "2h", "5d").
 * Returns format without "ago" suffix for use in deployment describe webview.
 * @param timestamp - ISO 8601 timestamp string
 * @returns Relative age string without "ago" suffix (e.g., "2h", "5d", "30s")
 */
export function calculateAge(timestamp: string): string {
    // Handle undefined/null/empty
    if (!timestamp || timestamp === '') {
        return '';
    }

    try {
        const now = Date.now();
        const then = new Date(timestamp).getTime();

        // Handle invalid dates
        if (isNaN(then)) {
            return timestamp;
        }

        const diff = now - then;

        // Handle future dates (shouldn't happen, but handle gracefully)
        if (diff < 0) {
            return '0s';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d`;
        }
        if (hours > 0) {
            return `${hours}h`;
        }
        if (minutes > 0) {
            return `${minutes}m`;
        }
        return `${seconds}s`;
    } catch (error) {
        // Fall back to original timestamp if parsing fails
        return timestamp;
    }
}

/**
 * Calculates relative time from ISO timestamp (e.g., "2h ago", "5d ago").
 * Wrapper around formatRelativeTime for consistency.
 * @param timestamp - ISO 8601 timestamp string
 * @returns Relative time string with "ago" suffix (e.g., "2h ago", "5d ago")
 */
export function calculateRelativeTime(timestamp: string): string {
    // Handle undefined/null/empty
    if (!timestamp || timestamp === '') {
        return '';
    }

    return formatRelativeTime(timestamp);
}

/**
 * Parses integer or percentage value for maxSurge/maxUnavailable.
 * Handles number, percentage string ("25%"), or integer string ("1").
 * @param value - Value to parse (number, string like "25%", or "1")
 * @param base - Base number for percentage calculation (e.g., replica count)
 * @returns Parsed integer value
 */
export function parseIntOrPercent(value: unknown, base: number): number {
    // Handle undefined/null
    if (value === undefined || value === null) {
        return 0;
    }

    // If it's already a number, return it
    if (typeof value === 'number') {
        return Math.ceil(value);
    }

    // If it's a string
    if (typeof value === 'string') {
        // Handle empty string
        if (value === '') {
            return 0;
        }

        // Handle percentage (e.g., "25%")
        if (value.endsWith('%')) {
            const percent = parseFloat(value.slice(0, -1));
            if (isNaN(percent)) {
                return 0;
            }
            return Math.ceil((percent / 100) * base);
        }

        // Handle integer string (e.g., "1")
        const intValue = parseInt(value, 10);
        if (!isNaN(intValue)) {
            return intValue;
        }
    }

    // Invalid format
    return 0;
}

/**
 * Extracts image name and tag from container image string.
 * @param image - Container image string (e.g., "nginx:1.21" or "nginx")
 * @returns Object with image name and tag (defaults to "latest" if no tag)
 */
export function extractImageTag(image: string): { image: string; tag: string } {
    // Handle undefined/null/empty
    if (!image || image === '') {
        return { image: '', tag: 'latest' };
    }

    // Split on colon
    const parts = image.split(':');
    
    // If no colon, return image with default tag
    if (parts.length === 1) {
        return { image: parts[0], tag: 'latest' };
    }

    // If colon exists, last part is tag, rest is image
    // Handle case where image might have multiple colons (e.g., "registry:5000/image:tag")
    const tag = parts[parts.length - 1];
    const imageName = parts.slice(0, -1).join(':');

    return {
        image: imageName,
        tag: tag || 'latest'
    };
}

