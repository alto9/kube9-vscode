import type { ResourceNodeRef } from '../../../types/argocdWebviewProtocol';

function nodeRefKey(ref: ResourceNodeRef): string {
    return `${ref.namespace}/${ref.kind}/${ref.name}`;
}

export function reduceBusyNodeKeysForProgress(
    previous: ReadonlySet<string>,
    message: { phase: string; nodeRef?: ResourceNodeRef }
): ReadonlySet<string> {
    if (!message.nodeRef) {
        return previous;
    }
    const key = nodeRefKey(message.nodeRef);
    if (message.phase === 'Running') {
        return new Set(previous).add(key);
    }
    if (message.phase === 'Succeeded' || message.phase === 'Failed' || message.phase === 'Error') {
        const next = new Set(previous);
        next.delete(key);
        return next;
    }
    return previous;
}

export function reduceBusyNodeKeysForResult(
    previous: ReadonlySet<string>,
    message: { nodeRef?: ResourceNodeRef }
): ReadonlySet<string> {
    if (!message.nodeRef) {
        return previous;
    }
    const key = nodeRefKey(message.nodeRef);
    const next = new Set(previous);
    next.delete(key);
    return next;
}
