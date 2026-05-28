import React from 'react';

export interface GraphInteractionContextValue {
    menusDisabled: boolean;
    busyNodeKeys: ReadonlySet<string>;
    actionNotice: string | null;
    onDismissActionNotice: () => void;
    postViewInTree: () => void;
    postResourceAction: (actionId: string, kind: string, name: string, namespace: string) => void;
}

const GraphInteractionContext = React.createContext<GraphInteractionContextValue | null>(null);

export function GraphInteractionProvider({
    value,
    children
}: {
    value: GraphInteractionContextValue;
    children: React.ReactNode;
}): React.JSX.Element {
    return <GraphInteractionContext.Provider value={value}>{children}</GraphInteractionContext.Provider>;
}

export function useGraphInteraction(): GraphInteractionContextValue {
    const value = React.useContext(GraphInteractionContext);
    if (!value) {
        throw new Error('useGraphInteraction must be used within GraphInteractionProvider');
    }
    return value;
}
