import type { ApplicationKey } from '../../../types/applicationResourceGraph';

export interface GraphViewport {
    x: number;
    y: number;
    zoom: number;
}

export function serializeApplicationKey(key: ApplicationKey): string {
    return `${key.context}:${key.namespace}:${key.name}`;
}

export function applicationKeyChanged(previous: string | null, next: ApplicationKey): boolean {
    const serialized = serializeApplicationKey(next);
    return previous !== null && previous !== serialized;
}

export interface PreserveViewportInput {
    applicationKeyChanged: boolean;
    shouldAutoFit: boolean;
    explicitFitView: boolean;
    cachedViewport: GraphViewport | null;
}

export function shouldPreserveViewport(input: PreserveViewportInput): boolean {
    if (input.applicationKeyChanged) {
        return false;
    }
    if (input.shouldAutoFit || input.explicitFitView) {
        return false;
    }
    return input.cachedViewport !== null;
}
