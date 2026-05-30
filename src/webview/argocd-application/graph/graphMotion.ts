export function graphZoomAnimationDuration(prefersReducedMotion: boolean): number {
    return prefersReducedMotion ? 0 : 150;
}
