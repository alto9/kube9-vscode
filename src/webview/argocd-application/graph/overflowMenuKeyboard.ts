export type OverflowMenuDirection = 'up' | 'down';

/**
 * Roving index for overflow menu arrow-key navigation.
 */
export function nextOverflowMenuIndex(
    currentIndex: number,
    direction: OverflowMenuDirection,
    itemCount: number
): number {
    if (itemCount <= 0) {
        return 0;
    }
    if (direction === 'down') {
        return (currentIndex + 1) % itemCount;
    }
    return (currentIndex - 1 + itemCount) % itemCount;
}
