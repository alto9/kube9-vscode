import React from 'react';
import { graphZoomAnimationDuration } from './graphMotion';

export { graphZoomAnimationDuration } from './graphMotion';

type MatchMediaCapable = {
    matchMedia?: (query: string) => MediaQueryList;
};

export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        const runtime = globalThis as MatchMediaCapable;
        if (typeof runtime.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = runtime.matchMedia('(prefers-reduced-motion: reduce)');
        const update = (): void => {
            setPrefersReducedMotion(mediaQuery.matches);
        };

        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    return prefersReducedMotion;
}

export function useGraphZoomDuration(): number {
    return graphZoomAnimationDuration(usePrefersReducedMotion());
}
