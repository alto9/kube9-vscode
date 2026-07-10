import React from 'react';
import type { GraphInteractionContextValue } from './GraphInteractionContext';
import type { ResourceNodeRef } from '../../../types/argocdWebviewProtocol';
import { buildResourceActionPayload } from './graphNodeCapabilities';
import { shouldShowGraphActionNotice } from './graphActionNotice';
import {
    reduceBusyNodeKeysForProgress,
    reduceBusyNodeKeysForResult
} from './graphInteractionBusyState';

export interface GraphInteractionHandlers {
    handleResourceActionProgress: (message: { phase: string; nodeRef?: ResourceNodeRef }) => void;
    handleResourceActionResult: (message: {
        success: boolean;
        message: string;
        nodeRef?: ResourceNodeRef;
    }) => void;
}

export function useGraphInteractionState(
    vscode: { postMessage: (message: unknown) => void } | undefined,
    options: { menusDisabled: boolean }
): GraphInteractionContextValue & GraphInteractionHandlers {
    const [busyNodeKeys, setBusyNodeKeys] = React.useState<ReadonlySet<string>>(() => new Set());
    const [actionNotice, setActionNotice] = React.useState<string | null>(null);

    const handleResourceActionProgress = React.useCallback((message: {
        phase: string;
        nodeRef?: ResourceNodeRef;
    }) => {
        setBusyNodeKeys((previous) => reduceBusyNodeKeysForProgress(previous, message));
    }, []);

    const handleResourceActionResult = React.useCallback((message: {
        success: boolean;
        message: string;
        nodeRef?: ResourceNodeRef;
    }) => {
        setBusyNodeKeys((previous) => reduceBusyNodeKeysForResult(previous, message));
        if (shouldShowGraphActionNotice(message.success, message.message)) {
            setActionNotice(message.message);
        }
    }, []);

    const graphInteraction = React.useMemo<GraphInteractionContextValue>(
        () => ({
            menusDisabled: options.menusDisabled,
            busyNodeKeys,
            actionNotice,
            onDismissActionNotice: () => setActionNotice(null),
            postViewInTree: () => {
                vscode?.postMessage({ type: 'viewInTree' });
            },
            postResourceAction: (actionId, resourceKey) => {
                if (!vscode) {
                    return;
                }
                vscode.postMessage(buildResourceActionPayload(actionId, resourceKey));
            }
        }),
        [actionNotice, busyNodeKeys, options.menusDisabled, vscode]
    );

    return {
        ...graphInteraction,
        handleResourceActionProgress,
        handleResourceActionResult
    };
}
