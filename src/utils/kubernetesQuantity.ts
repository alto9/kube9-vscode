/**
 * Utility functions for parsing and formatting Kubernetes quantity strings.
 * Handles CPU (cores/millicores), memory (bytes with binary prefixes), and counts.
 */

/**
 * Parses Kubernetes quantity strings (e.g., "4", "16Gi", "100m").
 * @param quantity - The quantity string to parse
 * @param unit - The unit type ('cores', 'bytes', or 'count')
 * @returns Numeric value in base units
 */
export function parseKubernetesQuantity(
    quantity: string,
    unit: 'cores' | 'bytes' | 'count'
): number {
    if (unit === 'count') {
        return parseInt(quantity, 10);
    }

    if (unit === 'cores') {
        // Handle millicores (e.g., "100m" = 0.1 cores)
        if (quantity.endsWith('m')) {
            return parseFloat(quantity.slice(0, -1)) / 1000;
        }
        return parseFloat(quantity);
    }

    if (unit === 'bytes') {
        // Handle Kubernetes memory quantities (Ki, Mi, Gi, Ti, Pi, Ei)
        const match = quantity.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|Pi|Ei)?$/);
        if (!match) {
            return 0;
        }

        const value = parseFloat(match[1]);
        const suffix = match[2] || '';

        const multipliers: Record<string, number> = {
            '': 1,
            'Ki': 1024,
            'Mi': 1024 ** 2,
            'Gi': 1024 ** 3,
            'Ti': 1024 ** 4,
            'Pi': 1024 ** 5,
            'Ei': 1024 ** 6
        };

        return value * (multipliers[suffix] || 1);
    }

    return 0;
}

/**
 * Formats numeric quantity for display.
 * @param value - The numeric value to format
 * @param unit - The unit type ('cores', 'bytes', or 'count')
 * @returns Formatted string (e.g., "2.50 cores", "4.00 GiB", "45")
 */
export function formatQuantity(
    value: number,
    unit: 'cores' | 'bytes' | 'count'
): string {
    if (unit === 'count') {
        return String(value);
    }

    if (unit === 'cores') {
        return `${value.toFixed(2)} cores`;
    }

    if (unit === 'bytes') {
        const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        let unitIndex = 0;
        let size = value;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    return String(value);
}

