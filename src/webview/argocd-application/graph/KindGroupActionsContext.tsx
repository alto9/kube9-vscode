import React from 'react';

export interface KindGroupActionsContextValue {
    onToggleKindGroup: (kind: string) => void;
}

const KindGroupActionsContext = React.createContext<KindGroupActionsContextValue | null>(null);

export function KindGroupActionsProvider({
    value,
    children
}: {
    value: KindGroupActionsContextValue;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <KindGroupActionsContext.Provider value={value}>
            {children}
        </KindGroupActionsContext.Provider>
    );
}

export function useKindGroupActions(): KindGroupActionsContextValue {
    const value = React.useContext(KindGroupActionsContext);
    if (!value) {
        throw new Error('useKindGroupActions must be used within KindGroupActionsProvider');
    }
    return value;
}
