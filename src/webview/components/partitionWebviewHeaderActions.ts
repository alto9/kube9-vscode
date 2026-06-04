import type { WebviewHeaderAction } from './webviewHeaderTypes';

/** Maximum labeled primary header buttons (Help and overflow trigger are excluded). */
export const WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS = 3;

export interface WebviewHeaderActionSlots {
    primary: WebviewHeaderAction[];
    overflow: WebviewHeaderAction[];
}

export interface WebviewHeaderActionSlotInput {
    actions?: WebviewHeaderAction[];
    primaryActions?: WebviewHeaderAction[];
    overflowActions?: WebviewHeaderAction[];
}

function capPrimaryActions(
    primary: WebviewHeaderAction[],
    overflow: WebviewHeaderAction[]
): WebviewHeaderActionSlots {
    if (primary.length <= WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS) {
        return { primary, overflow };
    }
    return {
        primary: primary.slice(0, WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS),
        overflow: [...primary.slice(WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS), ...overflow]
    };
}

/**
 * Resolves primary vs overflow action slots for WebviewHeader.
 * Explicit `primaryActions` / `overflowActions` win over `actions` auto-partition.
 */
export function partitionWebviewHeaderActions(
    input: WebviewHeaderActionSlotInput
): WebviewHeaderActionSlots {
    const hasExplicit =
        input.primaryActions !== undefined || input.overflowActions !== undefined;

    if (hasExplicit) {
        return capPrimaryActions(input.primaryActions ?? [], input.overflowActions ?? []);
    }

    const all = input.actions ?? [];
    return {
        primary: all.slice(0, WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS),
        overflow: all.slice(WEBVIEW_HEADER_MAX_PRIMARY_ACTIONS)
    };
}
