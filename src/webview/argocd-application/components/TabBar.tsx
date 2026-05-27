import React from 'react';

export type { TabType } from '../utils/tabMigration';
import type { TabType } from '../utils/tabMigration';

interface TabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

/**
 * Tab bar component for switching between Graph and Details tabs.
 */
export function TabBar({ activeTab, onTabChange }: TabBarProps): React.JSX.Element {
    const tabStyle: React.CSSProperties = {
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        color: 'var(--vscode-foreground)',
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)'
    };

    const activeTabStyle: React.CSSProperties = {
        ...tabStyle,
        borderBottomColor: 'var(--vscode-focusBorder)',
        fontWeight: '600'
    };

    return (
        <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--vscode-panel-border)',
            marginBottom: '20px'
        }}>
            <button
                style={activeTab === 'graph' ? activeTabStyle : tabStyle}
                onClick={() => onTabChange('graph')}
            >
                Graph
            </button>
            <button
                style={activeTab === 'details' ? activeTabStyle : tabStyle}
                onClick={() => onTabChange('details')}
            >
                Details
            </button>
        </div>
    );
}

